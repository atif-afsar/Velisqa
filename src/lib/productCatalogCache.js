const CACHE_KEY = 'velisqa:product-catalog:v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readProductCatalogCache() {
  if (!canUseStorage()) return null

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.data)) return null

    const age = Date.now() - (parsed.fetchedAt || 0)
    return {
      data: parsed.data,
      fetchedAt: parsed.fetchedAt || 0,
      expired: age > CACHE_TTL_MS,
    }
  } catch {
    return null
  }
}

export function writeProductCatalogCache(products) {
  if (!canUseStorage() || !Array.isArray(products)) return

  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: products,
        fetchedAt: Date.now(),
      }),
    )
  } catch {
    // Storage full or private mode — ignore
  }
}

export function findCachedProduct(productId) {
  if (!productId) return null
  const cache = readProductCatalogCache()
  return cache?.data?.find((item) => String(item.id) === String(productId)) ?? null
}

export function clearProductCatalogCache() {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}
