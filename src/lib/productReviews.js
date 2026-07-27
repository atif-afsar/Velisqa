import { isCloudinaryUploadConfigured, uploadImageToCloudinary } from './cloudinaryUpload'
import { supabase } from './supabaseClient'

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'reported']
export const MAX_REVIEW_IMAGES = 3
export const REVIEWS_PAGE_SIZE = 6
const MAX_REVIEW_IMAGE_BYTES = 10 * 1024 * 1024
const ACCEPTED_REVIEW_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const REVIEW_LIST_SELECT =
  'id, rating, title, body, reviewer_name, image_urls, is_verified_purchase, created_at'

export function buildReviewSummary(ratings = []) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const rating of ratings) {
    const value = Math.round(Number(rating))
    if (value >= 1 && value <= 5) distribution[value] += 1
  }

  const total = ratings.length
  const average =
    total > 0
      ? Math.round((ratings.reduce((sum, rating) => sum + Number(rating), 0) / total) * 10) / 10
      : 0

  return { total, average, distribution }
}

export async function fetchProductReviewSummary(productId) {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('status', 'approved')

  if (error) throw error
  return buildReviewSummary((data ?? []).map((row) => row.rating))
}

export async function fetchApprovedProductReviews(productId, { limit, offset = 0 } = {}) {
  let query = supabase
    .from('product_reviews')
    .select(REVIEW_LIST_SELECT, limit != null ? { count: 'exact' } : undefined)
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (limit != null) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw error

  if (limit != null) {
    return {
      reviews: data ?? [],
      total: count ?? 0,
      hasMore: (count ?? 0) > offset + (data?.length ?? 0),
    }
  }

  return data ?? []
}

export async function fetchApprovedProductReviewsPage(productId, page = 0, pageSize = REVIEWS_PAGE_SIZE) {
  return fetchApprovedProductReviews(productId, {
    limit: pageSize,
    offset: page * pageSize,
  })
}

const AGGREGATE_CHUNK_SIZE = 80

function isReviewSchemaMissing(error) {
  return /product_reviews/i.test(error?.message || '')
}

/** Live approved-review aggregates — used when products.rating is empty or stale. */
export async function fetchApprovedReviewAggregatesByProductIds(productIds = []) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))]
  if (!uniqueIds.length) return new Map()

  const aggregateMap = new Map()

  for (let index = 0; index < uniqueIds.length; index += AGGREGATE_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(index, index + AGGREGATE_CHUNK_SIZE)
    const { data, error } = await supabase
      .from('product_reviews')
      .select('product_id, rating')
      .eq('status', 'approved')
      .in('product_id', chunk)

    if (error) {
      if (isReviewSchemaMissing(error)) return new Map()
      throw error
    }

    const ratingsByProduct = new Map()
    for (const row of data ?? []) {
      const list = ratingsByProduct.get(row.product_id) ?? []
      list.push(Number(row.rating))
      ratingsByProduct.set(row.product_id, list)
    }

    for (const [productId, ratings] of ratingsByProduct) {
      const summary = buildReviewSummary(ratings)
      if (summary.total > 0) {
        aggregateMap.set(productId, {
          rating: summary.average,
          review_count: summary.total,
        })
      }
    }
  }

  return aggregateMap
}

export function applyReviewAggregatesToProducts(products, aggregateMap) {
  if (!Array.isArray(products) || !aggregateMap?.size) return products

  return products.map((product) => {
    const live = aggregateMap.get(product.id)
    if (!live) return product
    return {
      ...product,
      rating: live.rating,
      review_count: live.review_count,
    }
  })
}

export async function enrichProductsWithApprovedReviewAggregates(products) {
  if (!Array.isArray(products) || products.length === 0) return products
  try {
    const aggregateMap = await fetchApprovedReviewAggregatesByProductIds(products.map((p) => p.id))
    return applyReviewAggregatesToProducts(products, aggregateMap)
  } catch {
    return products
  }
}

export async function enrichProductWithApprovedReviewAggregates(product) {
  if (!product?.id) return product
  const [enriched] = await enrichProductsWithApprovedReviewAggregates([product])
  return enriched ?? product
}

export async function fetchReviewViewerState(productId, userId) {
  if (!userId) return { eligible: false, ownReview: null }

  const [eligibility, ownReviewResult] = await Promise.all([
    supabase.rpc('can_review_product', { p_product_id: productId }),
    supabase
      .from('product_reviews')
      .select('id, rating, title, body, image_urls, status, created_at')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (eligibility.error) throw eligibility.error
  if (ownReviewResult.error) throw ownReviewResult.error
  return {
    eligible: Boolean(eligibility.data),
    ownReview: ownReviewResult.data ?? null,
  }
}

export async function uploadReviewImages(files) {
  if (!files.length) return []
  if (!isCloudinaryUploadConfigured()) {
    throw new Error('Review image uploads are temporarily unavailable. Submit your review without a photo.')
  }

  const urls = []
  for (const file of files.slice(0, MAX_REVIEW_IMAGES)) {
    if (!ACCEPTED_REVIEW_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`${file.name}: use JPG, PNG, or WebP.`)
    }
    if (file.size > MAX_REVIEW_IMAGE_BYTES) {
      throw new Error(`${file.name} is larger than 10 MB.`)
    }
    const uploaded = await uploadImageToCloudinary(file, { folder: 'velisqa/reviews' })
    urls.push(uploaded.secure_url)
  }
  return urls
}

export async function submitProductReview({
  productId,
  rating,
  title,
  body,
  reviewerName,
  imageUrls = [],
}) {
  const { data, error } = await supabase.rpc('submit_product_review', {
    p_product_id: productId,
    p_rating: rating,
    p_title: title,
    p_body: body,
    p_reviewer_name: reviewerName,
    p_image_urls: imageUrls,
  })
  if (error) throw error
  return data
}

export async function fetchAdminProductReviews(status = 'pending') {
  let query = supabase
    .from('product_reviews')
    .select(`
      id,
      product_id,
      user_id,
      order_id,
      rating,
      title,
      body,
      reviewer_name,
      image_urls,
      is_verified_purchase,
      status,
      created_at,
      updated_at,
      products ( id, name, image_url )
    `)
    .order('created_at', { ascending: status === 'pending' })

  if (status !== 'all') query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function moderateProductReview(reviewId, status) {
  if (!REVIEW_STATUSES.includes(status)) throw new Error('Invalid review status.')
  const { error } = await supabase
    .from('product_reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
  if (error) throw error
}

export async function reportProductReview(reviewId) {
  const { error } = await supabase.rpc('report_product_review', { p_review_id: reviewId })
  if (error) throw error
}
