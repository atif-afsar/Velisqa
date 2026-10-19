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
    created_at: doc.created_at instanceof Date ? doc.created_at.toISOString() : doc.created_at,
  }
}

const normalizeCode = (code) => String(code || '').trim().toUpperCase()

/** Public lookup used by the cart/checkout coupon field: active coupons only (old RLS policy). */
export async function getActiveCoupon(code) {
  const doc = await getDb().collection(C.coupons).findOne({ _id: normalizeCode(code), active: true })
  if (!doc) throw notFound('This code isn’t valid or has expired.')
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
