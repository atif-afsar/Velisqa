/** @typedef {'bestseller' | 'new'} ProductBadgeType */

const NEW_PRODUCT_DAYS = 30
const BESTSELLER_REVIEW_THRESHOLD = 80

export function getProductRating(product) {
  const raw = Number(product?.rating)
  if (Number.isFinite(raw) && raw > 0) {
    return Math.min(5, Math.max(1, Math.round(raw * 10) / 10))
  }
  return 0
}

export function getProductReviewCount(product) {
  const raw = Number(product?.review_count)
  if (Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw)
  }
  return 0
}

export function isProductNew(product) {
  const created = product?.created_at
  if (!created) return false
  const createdMs = new Date(created).getTime()
  if (!Number.isFinite(createdMs)) return false
  const ageDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24)
  return ageDays <= NEW_PRODUCT_DAYS
}

/**
 * @param {object} product
 * @returns {ProductBadgeType | null}
 */
export function getProductBadge(product) {
  const explicit = product?.badge
  if (explicit === 'bestseller' || explicit === 'new') {
    return explicit
  }

  if (isProductNew(product)) {
    return 'new'
  }

  if (getProductReviewCount(product) >= BESTSELLER_REVIEW_THRESHOLD) {
    return 'bestseller'
  }

  return null
}

export function getBadgeLabel(badge) {
  if (badge === 'bestseller') return 'Bestseller'
  if (badge === 'new') return 'New'
  return null
}

export function formatReviewCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(count)
}
