import { C, getDb } from '../config/db.js'
import { env } from '../config/env.js'
import { hmacHex, safeEqual, uuid } from '../lib/crypto.js'
import { renderAbandonedCartEmail } from '../lib/emailTemplates.js'
import { logger } from '../lib/logger.js'
import { isEmailConfigured, sendEmail } from '../providers/email.js'
import { issuePersonalCoupon } from './couponService.js'

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const MAX_AGE_HOURS = 48 // never email about a bag that is older than this
const RESEND_COOLDOWN_DAYS = 14 // at most one recovery email per address per this window
const MAX_SEND_FAILURES = 3
// Resend's free plan allows 100 emails/day; keep headroom for password resets and receipts.
const DAILY_RECOVERY_CAP = 80

// ── Unsubscribe ────────────────────────────────────────────────────────

const unsubscribeToken = (email) => hmacHex(env.ORDER_TOKEN_SECRET, `unsubscribe:${normalizeEmail(email)}`).slice(0, 32)

export function buildUnsubscribeUrl(email) {
  const params = new URLSearchParams({ e: normalizeEmail(email), t: unsubscribeToken(email) })
  return `${env.apiOrigin}/api/v1/email/unsubscribe?${params}`
}

export async function unsubscribeEmail(email, token) {
  const normalized = normalizeEmail(email)
  if (!normalized || !safeEqual(unsubscribeToken(normalized), String(token || ''))) return false
  const db = getDb()
  await db.collection(C.emailSuppressions).updateOne({ _id: normalized }, { $setOnInsert: { created_at: new Date() } }, { upsert: true })
  await db.collection(C.checkoutLeads).updateMany({ email: normalized }, { $set: { consent: false, unsubscribed_at: new Date() } })
  return true
}

const isSuppressed = async (email) => Boolean(await getDb().collection(C.emailSuppressions).findOne({ _id: email }))

// ── Capturing the bag ──────────────────────────────────────────────────

function cleanItems(items) {
  const merged = new Map()
  for (const item of items || []) {
    if (!item || item.isFreeGift) continue
    const productId = String(item.productId || '').trim().toLowerCase().slice(0, 64)
    if (!productId) continue
    const quantity = Math.min(50, Math.max(1, Math.trunc(Number(item.quantity) || 1)))
    merged.set(productId, Math.min(50, (merged.get(productId) || 0) + quantity))
  }
  return [...merged].slice(0, 20).map(([productId, quantity]) => ({ productId, quantity }))
}

/** Remembers a shopper's bag so we can email them if they leave. Only stored with explicit consent. */
export async function saveCheckoutLead({ email, items, consent }) {
  const normalized = normalizeEmail(email)
  const cleaned = cleanItems(items)
  if (consent !== true || !normalized || cleaned.length === 0) return { saved: false }
  if (await isSuppressed(normalized)) return { saved: false }

  const db = getDb()
  const now = new Date()
  const existing = await db.collection(C.checkoutLeads).findOne({ email: normalized })
  const cooledDown = existing?.email_sent_at && now - existing.email_sent_at > RESEND_COOLDOWN_DAYS * 24 * 3600_000
  await db.collection(C.checkoutLeads).updateOne(
    { email: normalized },
    {
      $set: {
        items: cleaned,
        consent: true,
        last_seen_at: now,
        recovered_at: null,
        // A shopper who was already emailed becomes eligible again only after the cooldown.
        ...(cooledDown ? { email_sent_at: null, send_failures: 0 } : {}),
      },
      $setOnInsert: { _id: uuid(), email: normalized, created_at: now, email_sent_at: null, send_failures: 0 },
    },
    { upsert: true },
  )
  return { saved: true }
}

// ── The sweep ──────────────────────────────────────────────────────────

const absoluteImage = (url) => {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${url.startsWith('/api/') ? env.apiOrigin : env.frontendOrigin}${url.startsWith('/') ? '' : '/'}${url}`
}

/** Current prices/stock from the catalogue (never the client's numbers); out-of-stock lines are dropped. */
async function buildEmailItems(items) {
  const ids = items.map((item) => item.productId)
  const products = await getDb().collection(C.products).find({ _id: { $in: ids } }).toArray()
  const byId = new Map(products.map((product) => [String(product._id).toLowerCase(), product]))
  const lines = []
  for (const { productId, quantity } of items) {
    const product = byId.get(productId)
    const stock = Math.max(0, Number(product?.stock) || 0)
    if (!product || product.out_of_stock || stock < 1) continue
    const qty = Math.min(quantity, stock)
    lines.push({ name: product.name, image: absoluteImage(product.image_url), quantity: qty, lineTotal: Number(product.price) * qty })
  }
  return lines
}

async function hasOrderedSince(email, since) {
  const order = await getDb()
    .collection(C.orders)
    .findOne({ created_at: { $gte: since }, order_status: { $ne: 'cancelled' }, customer_email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } })
  return Boolean(order)
}

async function sendRecoveryEmail(lead) {
  const lines = await buildEmailItems(lead.items || [])
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  if (lines.length === 0 || subtotal < env.ABANDONED_CART_MIN_SUBTOTAL) return 'skipped'

  const coupon = await issuePersonalCoupon({
    email: lead.email,
    percent: env.ABANDONED_CART_DISCOUNT_PERCENT,
    minSubtotal: 0,
    hours: env.ABANDONED_CART_COUPON_HOURS,
  })
  const message = renderAbandonedCartEmail({
    items: lines,
    couponCode: coupon._id,
    percent: env.ABANDONED_CART_DISCOUNT_PERCENT,
    minSubtotal: 0,
    expiresAt: coupon.expires_at,
    resumeUrl: `${env.frontendOrigin}/checkout?coupon=${encodeURIComponent(coupon._id)}`,
    unsubscribeUrl: buildUnsubscribeUrl(lead.email),
  })
  try {
    await sendEmail({
      to: lead.email,
      ...message,
      idempotencyKey: `abandoned-${lead._id}-${coupon._id}`,
      headers: { 'List-Unsubscribe': `<${buildUnsubscribeUrl(lead.email)}>` },
    })
  } catch (error) {
    // Never leave a live coupon behind for an email that did not go out.
    await getDb().collection(C.coupons).deleteOne({ _id: coupon._id })
    throw error
  }
  return 'sent'
}

/**
 * Finds bags left behind for ~an hour, and emails each shopper once with a personal coupon.
 * Safe to run repeatedly and from a single PM2 process: every lead is claimed atomically before sending.
 */
export async function runAbandonedCartSweep(now = new Date()) {
  const summary = { checked: 0, sent: 0, recovered: 0, skipped: 0, failed: 0 }
  if (!env.ABANDONED_CART_ENABLED || !isEmailConfigured()) return summary

  const db = getDb()
  const sentLast24h = await db.collection(C.checkoutLeads).countDocuments({ email_sent_at: { $gte: new Date(now - 24 * 3600_000) } })
  const budget = Math.max(0, DAILY_RECOVERY_CAP - sentLast24h)
  if (budget === 0) return summary

  const due = await db
    .collection(C.checkoutLeads)
    .find({
      consent: true,
      email_sent_at: null,
      recovered_at: null,
      send_failures: { $lt: MAX_SEND_FAILURES },
      last_seen_at: { $lte: new Date(now - env.ABANDONED_CART_DELAY_MINUTES * 60_000), $gte: new Date(now - MAX_AGE_HOURS * 3600_000) },
    })
    .sort({ last_seen_at: 1 })
    .limit(Math.min(budget, 25))
    .toArray()

  for (const lead of due) {
    summary.checked += 1
    try {
      if (await isSuppressed(lead.email)) {
        await db.collection(C.checkoutLeads).updateOne({ _id: lead._id }, { $set: { consent: false } })
        summary.skipped += 1
        continue
      }
      if (await hasOrderedSince(lead.email, lead.created_at)) {
        await db.collection(C.checkoutLeads).updateOne({ _id: lead._id }, { $set: { recovered_at: now } })
        summary.recovered += 1
        continue
      }
      const claimed = await db
        .collection(C.checkoutLeads)
        .findOneAndUpdate({ _id: lead._id, email_sent_at: null }, { $set: { email_sent_at: now } })
      if (!claimed) continue // another run took it

      try {
        const outcome = await sendRecoveryEmail(lead)
        if (outcome === 'sent') summary.sent += 1
        else {
          summary.skipped += 1
          await db.collection(C.checkoutLeads).updateOne({ _id: lead._id }, { $set: { recovered_at: now } })
        }
      } catch (error) {
        summary.failed += 1
        await db.collection(C.checkoutLeads).updateOne({ _id: lead._id }, { $set: { email_sent_at: null }, $inc: { send_failures: 1 } })
        logger.error('Abandoned-checkout email failed', { error, leadId: lead._id })
      }
    } catch (error) {
      summary.failed += 1
      logger.error('Abandoned-checkout sweep error', { error, leadId: lead._id })
    }
  }
  if (summary.sent || summary.failed) logger.info('Abandoned-checkout sweep', summary)
  return summary
}

let timer = null
export function startAbandonedCartJob(intervalMs = 5 * 60_000) {
  if (timer) return
  timer = setInterval(() => {
    runAbandonedCartSweep().catch((error) => logger.error('Abandoned-checkout job crashed', { error }))
  }, intervalMs)
  timer.unref()
}
