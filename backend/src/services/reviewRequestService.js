import { C, getDb } from '../config/db.js'
import { env } from '../config/env.js'
import { hmacHex, safeEqual, uuid } from '../lib/crypto.js'
import { badRequest, conflict, forbidden } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { renderReviewRequestEmail } from '../lib/emailTemplates.js'
import { isEmailConfigured, sendEmail } from '../providers/email.js'

/**
 * Post-delivery review requests (P0-6).
 * DELAY_DAYS after delivery, the buyer gets one email with a signed, no-login link
 * (/review/<order_ref>?t=<hmac>) to rate every piece in the order. Reviews still go
 * through moderation and are marked "verified purchase".
 */
export const REVIEW_REQUEST_DELAY_DAYS = 5
const MAX_AGE_DAYS = 60 // never email about very old orders (e.g. right after this feature ships)
const DAY = 86_400_000

const secret = () => env.ORDER_TOKEN_SECRET || env.SESSION_SECRET

export const reviewToken = (order) => hmacHex(secret(), `review-request:${order._id}:${order.order_ref}`).slice(0, 40)

export function reviewLink(order) {
  const base = String(env.FRONTEND_ORIGIN || 'https://www.velisqa.com').split(',')[0].replace(/\/$/, '')
  return `${base}/review/${encodeURIComponent(order.order_ref)}?t=${reviewToken(order)}`
}

const deliveredFilter = { $or: [{ order_status: 'delivered' }, { shipping_status: 'delivered' }] }

/** Loads the order behind a review link, or throws. */
async function orderForToken(orderRef, token) {
  const order = await getDb()
    .collection(C.orders)
    .findOne({ order_ref: String(orderRef).slice(0, 40), deleted_at: null, ...deliveredFilter })
  if (!order || !token || !safeEqual(reviewToken(order), String(token))) throw forbidden('This review link is invalid or has expired.')
  return order
}

const reviewerKey = (order) => order.user_id || `order:${order._id}`

/** Items in the order the buyer can still review (excludes the free gift). */
export async function getReviewRequest(orderRef, token) {
  const order = await orderForToken(orderRef, token)
  const db = getDb()
  const lines = await db.collection(C.orderItems).find({ order_id: order._id, is_free_gift: { $ne: true } }).toArray()
  const productIds = [...new Set(lines.map((l) => String(l.product_id)))]
  const [products, existing] = await Promise.all([
    db.collection(C.products).find({ _id: { $in: productIds } }, { projection: { name: 1, image_url: 1 } }).toArray(),
    db.collection(C.productReviews).find({ product_id: { $in: productIds }, user_id: reviewerKey(order) }, { projection: { product_id: 1, status: 1 } }).toArray(),
  ])
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const reviewed = new Map(existing.map((r) => [r.product_id, r.status]))
  return {
    orderRef: order.order_ref,
    customerName: String(order.customer_name || '').split(/\s+/)[0] || '',
    items: productIds.map((id) => {
      const line = lines.find((l) => String(l.product_id) === id)
      const product = byId.get(id)
      return {
        productId: id,
        name: product?.name || line?.product_name || 'Velisqa piece',
        imageUrl: product?.image_url || line?.image_url || null,
        reviewed: reviewed.has(id),
        status: reviewed.get(id) || null,
      }
    }),
  }
}

/** Saves one review per product from a review link. Pending moderation, verified purchase. */
export async function submitReviewsFromRequest(orderRef, token, { reviewerName, reviews }) {
  const order = await orderForToken(orderRef, token)
  const db = getDb()
  const allowed = new Set(
    (await db.collection(C.orderItems).find({ order_id: order._id, is_free_gift: { $ne: true } }, { projection: { product_id: 1 } }).toArray()).map((l) => String(l.product_id)),
  )
  const name = (reviewerName || String(order.customer_name || '').split(/\s+/)[0] || 'Verified customer').trim().slice(0, 80)
  const saved = []
  for (const review of reviews) {
    if (!allowed.has(String(review.productId))) throw badRequest('That piece is not part of this order.')
    const now = new Date()
    try {
      await db.collection(C.productReviews).insertOne({
        _id: uuid(),
        product_id: String(review.productId),
        user_id: reviewerKey(order),
        order_id: order._id,
        rating: review.rating,
        title: review.title.trim(),
        body: review.body.trim(),
        reviewer_name: name,
        image_urls: review.imageUrls || [],
        is_verified_purchase: true,
        status: 'pending',
        source: 'review_request',
        created_at: now,
        updated_at: now,
      })
      saved.push(review.productId)
    } catch (error) {
      if (error?.code === 11000) continue // already reviewed this piece
      throw error
    }
  }
  if (!saved.length) throw conflict('You have already reviewed these pieces. Thank you!')
  await db.collection(C.orders).updateOne({ _id: order._id }, { $set: { review_submitted_at: new Date() } })
  return { saved: saved.length }
}

/** Validates a review link before handing out an upload signature for review photos. */
export async function assertReviewLink(orderRef, token) {
  await orderForToken(orderRef, token)
}

/** Sends due review-request emails. Idempotent: each order is claimed before sending. */
export async function runReviewRequestSweep(now = new Date()) {
  const summary = { sent: 0, skipped: 0, failed: 0 }
  if (!isEmailConfigured()) return summary
  const db = getDb()
  const due = new Date(now.getTime() - REVIEW_REQUEST_DELAY_DAYS * DAY)
  const oldest = new Date(now.getTime() - MAX_AGE_DAYS * DAY)
  const candidates = await db
    .collection(C.orders)
    .find({
      deleted_at: null,
      review_request_sent_at: null,
      customer_email: { $type: 'string', $ne: '' },
      created_at: { $gte: oldest },
      $and: [deliveredFilter, { $or: [{ delivered_at: { $lte: due } }, { delivered_at: null, updated_at: { $lte: due } }] }],
    })
    .limit(50)
    .toArray()

  for (const order of candidates) {
    const claimed = await db.collection(C.orders).findOneAndUpdate({ _id: order._id, review_request_sent_at: null }, { $set: { review_request_sent_at: now } })
    if (!claimed) continue
    try {
      const request = await getReviewRequest(order.order_ref, reviewToken(order))
      const pending = request.items.filter((i) => !i.reviewed)
      if (!pending.length) {
        summary.skipped += 1
        continue
      }
      const { subject, html, text } = renderReviewRequestEmail({ firstName: request.customerName, items: pending, link: reviewLink(order) })
      const sent = await sendEmail({ to: order.customer_email, subject, html, text, idempotencyKey: `review-request-${order._id}` })
      if (sent) summary.sent += 1
      else {
        summary.skipped += 1
        await db.collection(C.orders).updateOne({ _id: order._id }, { $set: { review_request_sent_at: null } })
      }
    } catch (error) {
      summary.failed += 1
      await db.collection(C.orders).updateOne({ _id: order._id }, { $set: { review_request_sent_at: null } })
      logger.error('Review request email failed', { error, orderRef: order.order_ref })
    }
  }
  if (summary.sent || summary.failed) logger.info('Review request sweep', summary)
  return summary
}

let timer = null
export function startReviewRequestJob(intervalMs = 60 * 60_000) {
  if (timer) return
  timer = setInterval(() => {
    runReviewRequestSweep().catch((error) => logger.error('Review request job crashed', { error }))
  }, intervalMs)
  timer.unref()
}

