import { randomInt } from 'node:crypto'
import { C, getDb } from '../config/db.js'
import { conflict, notFound } from '../lib/errors.js'
import { normalizeRupees } from '../lib/money.js'

export function serializeCoupon(doc) {
  if (!doc) return null
  return {
    code: doc._id,
    discount_type: doc.discount_type,
    discount_value: Number(doc.discount_value),
    min_subtotal: Number(doc.min_subtotal || 0),
    active: Boolean(doc.active),
    expires_at: doc.expires_at instanceof Date ? doc.expires_at.toISOString() : null,
    single_use: Boolean(doc.single_use),
    used: Boolean(doc.used_at),
    created_at: doc.created_at instanceof Date ? doc.created_at.toISOString() : doc.created_at,
  }
}

const normalizeCode = (code) => String(code || '').trim().toUpperCase()
const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

/**
 * Single source of truth for "can this coupon be redeemed right now?".
 * Shared codes (the existing admin coupons) only need to be active. Personal codes issued by the
 * recovery email are also expiring, single-use and bound to one email address.
 */
export function isCouponRedeemable(coupon, { email, now = new Date() } = {}) {
  if (!coupon || !coupon.active) return false
  if (coupon.expires_at && coupon.expires_at <= now) return false
  if (coupon.single_use && coupon.used_at) return false
  if (coupon.email && normalizeEmail(email) !== coupon.email) return false
  return true
}

/** Public lookup used by the cart/checkout coupon field: active coupons only (old RLS policy). */
export async function getActiveCoupon(code) {
  const doc = await getDb().collection(C.coupons).findOne({ _id: normalizeCode(code), active: true })
  // Email binding is enforced at pricing time (the shopper's email is not known yet in the cart).
  if (!doc || !isCouponRedeemable({ ...doc, email: null })) throw notFound('This code isn’t valid or has expired.')
  return serializeCoupon(doc)
}

export async function listCoupons() {
  const docs = await getDb().collection(C.coupons).find({}).sort({ created_at: -1 }).toArray()
  return docs.map(serializeCoupon)
}

export async function createCoupon({ code, discount_type, discount_value, min_subtotal = 0, active = true }) {
  const doc = {
    _id: normalizeCode(code),
    discount_type,
    discount_value: normalizeRupees(discount_value),
    min_subtotal: normalizeRupees(min_subtotal),
    active: Boolean(active),
    created_at: new Date(),
  }
  try {
    await getDb().collection(C.coupons).insertOne(doc)
  } catch (error) {
    if (error?.code === 11000) throw conflict(`Coupon "${doc._id}" already exists.`)
    throw error
  }
  return serializeCoupon(doc)
}

export async function updateCoupon(code, patch) {
  const $set = {}
  if (patch.active !== undefined) $set.active = Boolean(patch.active)
  if (patch.discount_type !== undefined) $set.discount_type = patch.discount_type
  if (patch.discount_value !== undefined) $set.discount_value = normalizeRupees(patch.discount_value)
  if (patch.min_subtotal !== undefined) $set.min_subtotal = normalizeRupees(patch.min_subtotal)
  const doc = await getDb().collection(C.coupons).findOneAndUpdate({ _id: normalizeCode(code) }, { $set }, { returnDocument: 'after' })
  if (!doc) throw notFound('Coupon not found.')
  return serializeCoupon(doc)
}

/** Orders keep `coupon_code` as a plain string, so history is unaffected by deletion. */
export async function deleteCoupon(code) {
  const result = await getDb().collection(C.coupons).deleteOne({ _id: normalizeCode(code) })
  if (!result.deletedCount) throw notFound('Coupon not found.')
}

/** Marks a single-use coupon as spent inside the order transaction. Fails if someone else already used it. */
export async function consumeSingleUseCoupon(code, orderRef, session) {
  if (!code) return
  const result = await getDb()
    .collection(C.coupons)
    .updateOne({ _id: normalizeCode(code), single_use: true, used_at: null }, { $set: { used_at: new Date(), used_order_ref: orderRef } }, { session })
  if (result.matchedCount === 0) {
    // Not single-use (shared code) or already spent: only the latter is an error.
    const doc = await getDb().collection(C.coupons).findOne({ _id: normalizeCode(code) }, { session })
    if (doc?.single_use) throw conflict('This offer code has already been used.')
  }
}

const COUPON_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L lookalikes

/** Creates a personal, single-use, expiring percentage coupon for one email address. */
export async function issuePersonalCoupon({ email, percent, minSubtotal = 0, hours, prefix = 'COMEBACK' }) {
  const expiresAt = new Date(Date.now() + hours * 3600_000)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Array.from({ length: 5 }, () => COUPON_ALPHABET[randomInt(COUPON_ALPHABET.length)]).join('')
    const doc = {
      _id: `${prefix}-${suffix}`,
      discount_type: 'percentage',
      discount_value: percent,
      min_subtotal: normalizeRupees(minSubtotal),
      active: true,
      single_use: true,
      used_at: null,
      email: normalizeEmail(email),
      expires_at: expiresAt,
      delete_after: new Date(expiresAt.getTime() + 7 * 24 * 3600_000),
      source: 'abandoned_checkout',
      created_at: new Date(),
    }
    try {
      await getDb().collection(C.coupons).insertOne(doc)
      return doc
    } catch (error) {
      if (error?.code !== 11000) throw error
    }
  }
  throw new Error('Could not generate a unique coupon code.')
}
