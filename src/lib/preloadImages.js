import { buildImageUrl } from './imageCdn'
import { getPrimaryImageUrl } from './productImages'
import { SIGNATURE_CATEGORIES, groupProductsByCategory } from './productCategories'

/** Matches HomeShopGrid — max products shown per category on the homepage shop section. */
export const HOME_SHOP_PRODUCT_LIMIT = 8

const GRID_DELIVERY_WIDTH = 520
const PRELOAD_BATCH_SIZE = 4
const preloaded = new Set()

/**
 * Image URLs for every product tile that can appear in #home-shop (all categories,
 * up to HOME_SHOP_PRODUCT_LIMIT each), using the same delivery size as ProductCard.
 */
export function collectHomeShopImageUrls(products) {
  if (!Array.isArray(products) || products.length === 0) return []

  const grouped = groupProductsByCategory(products, SIGNATURE_CATEGORIES)
  const seen = new Set()
  const urls = []

  for (const category of SIGNATURE_CATEGORIES) {
    for (const product of (grouped[category] ?? []).slice(0, HOME_SHOP_PRODUCT_LIMIT)) {
      const raw = getPrimaryImageUrl(product)
      if (!raw || seen.has(raw)) continue
      seen.add(raw)
      urls.push(buildImageUrl(raw, { width: GRID_DELIVERY_WIDTH }))
    }
  }

  return urls
}

function preloadOne(src) {
  if (!src || preloaded.has(src)) return
  preloaded.add(src)
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}

/** Warm the browser cache in small batches so preloads do not block the main thread. */
export function preloadImageUrls(urls) {
  if (typeof window === 'undefined' || !urls?.length) return

  const pending = urls.filter((url) => url && !preloaded.has(url))
  if (!pending.length) return

  let index = 0

  const runBatch = () => {
    const slice = pending.slice(index, index + PRELOAD_BATCH_SIZE)
    index += PRELOAD_BATCH_SIZE
    for (const src of slice) preloadOne(src)
    if (index < pending.length) scheduleNextBatch()
  }

  const scheduleNextBatch = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(runBatch, { timeout: 3000 })
    } else {
      window.setTimeout(runBatch, 120)
    }
  }

  scheduleNextBatch()
}
