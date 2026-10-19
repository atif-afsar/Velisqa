import { api } from './apiClient'

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'reported']
export const MAX_REVIEW_IMAGES = 3
export const REVIEWS_PAGE_SIZE = 6
const MAX_REVIEW_IMAGE_BYTES = 10 * 1024 * 1024
const ACCEPTED_REVIEW_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const productPath = (productId) => `/products/${encodeURIComponent(productId)}`

export const fetchProductReviewSummary = (productId) => api.get(`${productPath(productId)}/reviews/summary`)

export async function fetchApprovedProductReviewsPage(productId, page = 0, pageSize = REVIEWS_PAGE_SIZE) {
  return api.get(`${productPath(productId)}/reviews`, { query: { page, pageSize } })
}

/** Most recent approved reviews across the catalogue (homepage reviews strip). */
export async function fetchLatestApprovedReviews(limit = 6) {
  const data = await api.get('/reviews/latest', { query: { limit } })
  return data.reviews ?? []
}

export async function fetchReviewViewerState(productId, userId) {
  if (!userId) return { eligible: false, ownReview: null }
  return api.get(`${productPath(productId)}/reviews/viewer`)
}

export async function uploadReviewImages(files) {
  if (!files.length) return []
  // Loaded on demand: only reviewers attaching photos need the upload client.
  const { uploadImageToCloudinary } = await import('./cloudinaryUpload')

  const urls = []
  for (const file of files.slice(0, MAX_REVIEW_IMAGES)) {
    if (!ACCEPTED_REVIEW_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`${file.name}: use JPG, PNG, or WebP.`)
    }
    if (file.size > MAX_REVIEW_IMAGE_BYTES) {
      throw new Error(`${file.name} is larger than 10 MB.`)
    }
    try {
      const uploaded = await uploadImageToCloudinary(file, { purpose: 'review' })
      urls.push(uploaded.secure_url)
    } catch (error) {
      if (error?.status === 503) {
        throw new Error('Review image uploads are temporarily unavailable. Submit your review without a photo.', { cause: error })
      }
      throw error
    }
  }
  return urls
}

export async function submitProductReview({ productId, rating, title, body, reviewerName, imageUrls = [] }) {
  const data = await api.post(`${productPath(productId)}/reviews`, { rating, title, body, reviewerName, imageUrls })
  return data.reviewId
}

export async function fetchAdminProductReviews(status = 'pending') {
  const data = await api.get('/admin/reviews', { query: { status } })
  return data.reviews ?? []
}

export async function moderateProductReview(reviewId, status) {
  if (!REVIEW_STATUSES.includes(status)) throw new Error('Invalid review status.')
  await api.patch(`/admin/reviews/${encodeURIComponent(reviewId)}`, { status })
}

export async function reportProductReview(reviewId) {
  await api.post(`/reviews/${encodeURIComponent(reviewId)}/report`)
}
