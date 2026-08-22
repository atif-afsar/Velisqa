import { masterImageUrl } from './imageCdn'

function normalizeGalleryUrl(url) {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  return trimmed ? masterImageUrl(trimmed) : ''
}

/** Ordered image URLs for a product (gallery + legacy single image). */
export function getProductImageUrls(product) {
  if (!product) return []

  const gallery = product.gallery_urls
  if (Array.isArray(gallery) && gallery.length > 0) {
    return gallery.map(normalizeGalleryUrl).filter(Boolean)
  }

  if (product.image_url) {
    const url = normalizeGalleryUrl(product.image_url)
    return url ? [url] : []
  }

  return []
}

export function getPrimaryImageUrl(product) {
  const urls = getProductImageUrls(product)
  return urls[0] ?? null
}

export function getHoverImageUrl(product) {
  if (!product) return null

  // Explicit hover image set by admin
  if (product.hover_image_url && typeof product.hover_image_url === 'string') {
    const url = normalizeGalleryUrl(product.hover_image_url)
    if (url) return url
  }

  // Explicit index specified
  if (typeof product.hover_image_index === 'number' && product.hover_image_index >= 0) {
    const urls = getProductImageUrls(product)
    if (urls[product.hover_image_index]) {
      return urls[product.hover_image_index]
    }
  }

  return null
}
