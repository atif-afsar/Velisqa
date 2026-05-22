/** Ordered image URLs for a product (gallery + legacy single image). */
export function getProductImageUrls(product) {
  if (!product) return []

  const gallery = product.gallery_urls
  if (Array.isArray(gallery) && gallery.length > 0) {
    return gallery.filter((url) => typeof url === 'string' && url.trim())
  }

  if (product.image_url) {
    return [product.image_url]
  }

  return []
}

export function getPrimaryImageUrl(product) {
  const urls = getProductImageUrls(product)
  return urls[0] ?? null
}
