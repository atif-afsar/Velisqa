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
