import { C, getDb } from '../config/db.js'
import { uuid } from '../lib/crypto.js'
import { conflict, forbidden, HttpError, notFound } from '../lib/errors.js'
import { audit } from './auditService.js'
import { refreshProductReviewAggregate } from './catalogService.js'

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'reported']

const iso = (value) => (value instanceof Date ? value.toISOString() : value ?? null)

function publicReview(row, { withProduct = false } = {}) {
  return {
    id: row._id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    reviewer_name: row.reviewer_name,
    image_urls: row.image_urls || [],
    is_verified_purchase: Boolean(row.is_verified_purchase),
    created_at: iso(row.created_at),
    ...(withProduct ? { product_id: row.product_id } : {}),
  }
}

export async function listApprovedReviews(productId, { page = 0, pageSize = 6 }) {
  const db = getDb()
  const filter = { product_id: String(productId), status: 'approved' }
  const [rows, total] = await Promise.all([
    db.collection(C.productReviews).find(filter).sort({ created_at: -1 }).skip(page * pageSize).limit(pageSize).toArray(),
    db.collection(C.productReviews).countDocuments(filter),
  ])
  return { reviews: rows.map((row) => publicReview(row)), total, hasMore: total > page * pageSize + rows.length }
}

export async function reviewSummary(productId) {
  const rows = await getDb()
    .collection(C.productReviews)
    .aggregate([{ $match: { product_id: String(productId), status: 'approved' } }, { $group: { _id: '$rating', count: { $sum: 1 } } }])
    .toArray()
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  let sum = 0
  for (const row of rows) {
    const rating = Math.round(Number(row._id))
    if (rating >= 1 && rating <= 5) {
      distribution[rating] += row.count
      total += row.count
      sum += rating * row.count
    }
  }
  return { total, average: total ? Math.round((sum / total) * 10) / 10 : 0, distribution }
}

export async function latestApprovedReviews(limit = 6) {
  const rows = await getDb()
    .collection(C.productReviews)
    .find({ status: 'approved', rating: { $gte: 4 } })
    .sort({ created_at: -1 })
    .limit(Math.min(limit, 24))
    .toArray()
  return rows.map((row) => publicReview(row, { withProduct: true }))
}

/** Delivered order containing the product, newest first (can_review_product / submit_product_review). */
async function deliveredOrderForProduct(userId, productId) {
  const db = getDb()
  const items = await db.collection(C.orderItems).find({ product_id: String(productId) }, { projection: { order_id: 1 } }).toArray()
  if (!items.length) return null
  return db.collection(C.orders).findOne(
    {
      _id: { $in: [...new Set(items.map((item) => item.order_id))] },
      user_id: userId,
      deleted_at: null,
      $or: [{ order_status: 'delivered' }, { shipping_status: 'delivered' }],
    },
    { sort: { created_at: -1 } },
  )
}

export async function viewerState(productId, userId) {
  if (!userId) return { eligible: false, ownReview: null }
  const [order, own] = await Promise.all([
    deliveredOrderForProduct(userId, productId),
    getDb().collection(C.productReviews).findOne({ product_id: String(productId), user_id: userId }),
  ])
  return {
    eligible: Boolean(order),
    ownReview: own
      ? { id: own._id, rating: own.rating, title: own.title, body: own.body, image_urls: own.image_urls || [], status: own.status, created_at: iso(own.created_at) }
      : null,
  }
}

export async function submitReview({ productId, userId, rating, title, body, reviewerName, imageUrls }) {
  const order = await deliveredOrderForProduct(userId, productId)
  if (!order) throw forbidden('Only customers with a delivered purchase can review this product.')
  const now = new Date()
  const id = uuid()
  try {
    await getDb().collection(C.productReviews).insertOne({
      _id: id,
      product_id: String(productId),
      user_id: userId,
      order_id: order._id,
      rating,
      title: title.trim(),
      body: body.trim(),
      reviewer_name: reviewerName.trim().slice(0, 80),
      image_urls: imageUrls || [],
      is_verified_purchase: true,
      status: 'pending',
      created_at: now,
      updated_at: now,
    })
  } catch (error) {
    if (error?.code === 11000) throw conflict('You have already reviewed this product.')
    throw error
  }
  return id
}

/** Port of report_product_review: hides an approved review (not your own) pending moderation. */
export async function reportReview(reviewId, userId) {
  const row = await getDb().collection(C.productReviews).findOneAndUpdate(
    { _id: String(reviewId), status: 'approved', user_id: { $ne: userId } },
    { $set: { status: 'reported', updated_at: new Date() } },
  )
  if (!row) throw new HttpError(409, 'This review cannot be reported.')
  await refreshProductReviewAggregate(row.product_id)
}

export async function listAdminReviews(status = 'pending') {
  const db = getDb()
  const filter = status === 'all' ? {} : { status }
  const rows = await db.collection(C.productReviews).find(filter).sort({ created_at: status === 'pending' ? 1 : -1 }).limit(500).toArray()
  const products = await db
    .collection(C.products)
    .find({ _id: { $in: [...new Set(rows.map((row) => row.product_id))] } }, { projection: { name: 1, image_url: 1 } })
    .toArray()
  const byId = new Map(products.map((product) => [product._id, product]))
  return rows.map((row) => {
    const product = byId.get(row.product_id)
    return {
      ...publicReview(row),
      product_id: row.product_id,
      user_id: row.user_id,
      order_id: row.order_id,
      status: row.status,
      updated_at: iso(row.updated_at),
      products: product ? { id: product._id, name: product.name, image_url: product.image_url ?? null } : null,
    }
  })
}

export async function moderateReview(reviewId, status, { actorId, req }) {
  if (!REVIEW_STATUSES.includes(status)) throw new HttpError(422, 'Invalid review status.')
  const row = await getDb().collection(C.productReviews).findOneAndUpdate(
    { _id: String(reviewId) },
    { $set: { status, updated_at: new Date() } },
  )
  if (!row) throw notFound('Review not found.')
  await refreshProductReviewAggregate(row.product_id)
  await audit({ actorId, action: 'review.moderate', targetType: 'product_review', targetId: row._id, summary: { from: row.status, to: status }, req })
}
