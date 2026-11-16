import { C, getDb } from '../config/db.js'
import { uuid } from '../lib/crypto.js'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { normalizeRupees } from '../lib/money.js'

const PUBLIC_HIDDEN = new Set(['created_by', 'mock_rating', 'mock_review_count'])

const asArray = (value) => (Array.isArray(value) ? value : [])

/** Product as the storefront saw it from PostgREST (snake_case, `id`, ISO dates). */
export function serializeProduct(doc, { admin = false } = {}) {
  if (!doc) return null
  const { _id, ...rest } = doc
  const out = { id: _id }
  for (const [key, value] of Object.entries(rest)) {
    if (!admin && PUBLIC_HIDDEN.has(key)) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  out.gallery_urls = asArray(out.gallery_urls)
  out.styles = asArray(out.styles)
  out.search_keywords = asArray(out.search_keywords)
  out.combo_product_ids = asArray(out.combo_product_ids)
  out.gallery_cloudinary_ids = asArray(out.gallery_cloudinary_ids)
  out.out_of_stock = Boolean(out.out_of_stock)
  out.is_combo = Boolean(out.is_combo)
  out.review_count = Number(out.review_count) || 0
  out.rating = out.rating == null ? null : Number(out.rating)
  return out
}

const SORTS = {
  newest: { created_at: -1, _id: 1 },
  price_asc: { price: 1, created_at: -1, _id: 1 },
  price_desc: { price: -1, created_at: -1, _id: 1 },
  name: { name: 1, _id: 1 },
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Hidden (unpublished) products never reach the storefront, search, feeds or checkout. */
const PUBLISHED = { hidden: { $ne: true } }

export async function listProducts({ search, category, sort = 'newest', limit, offset = 0, fields } = {}) {
  const filter = { ...PUBLISHED }
  if (category) filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' }
  if (search) {
    const pattern = { $regex: escapeRegex(search.slice(0, 80)), $options: 'i' }
    filter.$or = [{ name: pattern }, { description: pattern }, { search_keywords: pattern }, { category: pattern }]
  }
  const projection = fields === 'id,name' ? { _id: 1, name: 1 } : undefined
  const cursor = getDb()
    .collection(C.products)
    .find(filter, projection ? { projection } : undefined)
    .sort(SORTS[sort] || SORTS.newest)
    .skip(offset)
  if (limit) cursor.limit(limit)
  const [docs, total] = await Promise.all([cursor.toArray(), getDb().collection(C.products).countDocuments(filter)])
  return { products: docs.map((doc) => (projection ? { id: doc._id, name: doc.name } : serializeProduct(doc))), total }
}

export async function getProduct(id, { admin = false } = {}) {
  const doc = await getDb().collection(C.products).findOne({ _id: String(id), ...(admin ? {} : PUBLISHED) })
  if (!doc) throw notFound('Product not found.')
  return serializeProduct(doc, { admin })
}

export async function lookupProducts(ids) {
  const unique = [...new Set(ids.map(String))].slice(0, 200)
  const docs = await getDb().collection(C.products).find({ _id: { $in: unique }, ...PUBLISHED }).toArray()
  return docs.map((doc) => serializeProduct(doc))
}

export async function listAdminProducts() {
  const docs = await getDb().collection(C.products).find({}).sort({ created_at: -1 }).toArray()
  return docs.map((doc) => serializeProduct(doc, { admin: true }))
}

function productFields(input) {
  const out = {}
  const assign = (key, value) => {
    if (value !== undefined) out[key] = value
  }
  assign('name', input.name)
  assign('price', input.price != null ? normalizeRupees(input.price) : undefined)
  assign('mrp', input.mrp === undefined ? undefined : input.mrp == null ? null : normalizeRupees(input.mrp))
  assign('description', input.description)
  assign('category', input.category)
  assign('metal', input.metal)
  assign('colour', input.colour)
  assign('styles', input.styles)
  assign('search_keywords', input.search_keywords)
  assign('stock', input.stock)
  assign('out_of_stock', input.out_of_stock)
  assign('badge', input.badge)
  assign('image_url', input.image_url)
  assign('hover_image_url', input.hover_image_url)
  assign('gallery_urls', input.gallery_urls)
  assign('cloudinary_public_id', input.cloudinary_public_id)
  assign('hover_cloudinary_public_id', input.hover_cloudinary_public_id)
  assign('gallery_cloudinary_ids', input.gallery_cloudinary_ids)
  assign('mock_review_count', input.mock_review_count)
  assign('mock_rating', input.mock_rating)
  assign('is_combo', input.is_combo)
  assign('hidden', input.hidden)
  assign('combo_product_ids', input.combo_product_ids)
  return out
}

const normName = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')
const nameRegex = (name) => ({ $regex: `^\\s*${escapeRegex(normName(name)).replace(/ /g, '\\s+')}\\s*$`, $options: 'i' })

/**
 * Catalogue hygiene (P0-4): a published product needs a unique name, a category and an MRP
 * (so every card can show MRP + % off). Hidden drafts may be incomplete.
 * `existing` is the stored product for updates.
 */
export async function assertPublishable(input, existing = null) {
  const merged = { ...(existing || {}), ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) }
  if (merged.hidden) return
  const problems = []
  if (!String(merged.category || '').trim()) problems.push('choose a category')
  if (merged.mrp == null || !(Number(merged.mrp) > 0)) {
    // Existing products without an MRP can still be edited (stock, images…) — only new ones, or
    // edits that clear the MRP, are blocked.
    if (!existing || input.mrp === null) problems.push('enter the MRP (the price printed on the pack)')
  }
  if (problems.length) throw badRequest(`To publish this product, ${problems.join(' and ')}. Or tick "Hidden" to save it as a draft.`)
  if (input.name !== undefined || !existing) {
    const clash = await getDb()
      .collection(C.products)
      .findOne({ name: nameRegex(merged.name), hidden: { $ne: true }, ...(existing ? { _id: { $ne: existing._id } } : {}) }, { projection: { _id: 1 } })
    if (clash) throw conflict('Another published product already has this name. Give each product a distinct name (colour + design + type), or merge them as variants.')
  }
}

export async function getProductDoc(id) {
  const doc = await getDb().collection(C.products).findOne({ _id: String(id) })
  if (!doc) throw notFound('Product not found.')
  return doc
}

export async function createProduct(input, actorId) {
  const now = new Date()
  const doc = {
    _id: uuid(),
    name: input.name,
    price: 0,
    mrp: null,
    description: null,
    category: null,
    metal: null,
    colour: null,
    styles: [],
    search_keywords: [],
    stock: 1,
    out_of_stock: false,
    badge: null,
    image_url: null,
    hover_image_url: null,
    gallery_urls: [],
    cloudinary_public_id: null,
    hover_cloudinary_public_id: null,
    gallery_cloudinary_ids: [],
    mock_review_count: 0,
    mock_rating: null,
    is_combo: false,
    combo_product_ids: [],
    hidden: false,
    rating: null,
    review_count: 0,
    ...productFields(input),
    created_by: actorId || null,
    created_at: now,
    updated_at: now,
  }
  await getDb().collection(C.products).insertOne(doc)
  return serializeProduct(doc, { admin: true })
}

export async function updateProduct(id, input) {
  const patch = productFields(input)
  const result = await getDb()
    .collection(C.products)
    .findOneAndUpdate({ _id: String(id) }, { $set: { ...patch, updated_at: new Date() } }, { returnDocument: 'after' })
  if (!result) throw notFound('Product not found.')
  return serializeProduct(result, { admin: true })
}

/** Hard delete like the old admin page. Order items keep their own snapshot (name/price/image). */
export async function deleteProduct(id) {
  const db = getDb()
  const result = await db.collection(C.products).findOneAndDelete({ _id: String(id) })
  if (!result) throw notFound('Product was not found.')
  // product_reviews had ON DELETE CASCADE in Postgres.
  await db.collection(C.productReviews).deleteMany({ product_id: String(id) })
  return serializeProduct(result, { admin: true })
}

/** Approved-reviews-only aggregate (consolidated migration §8). */
export async function refreshProductReviewAggregate(productId, session) {
  const db = getDb()
  const [agg] = await db
    .collection(C.productReviews)
    .aggregate(
      [
        { $match: { product_id: productId, status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ],
      session ? { session } : undefined,
    )
    .toArray()
  const count = agg?.count || 0
  await db.collection(C.products).updateOne(
    { _id: productId },
    { $set: { rating: count ? Math.round(agg.avg * 10) / 10 : null, review_count: count } },
    session ? { session } : undefined,
  )
}
