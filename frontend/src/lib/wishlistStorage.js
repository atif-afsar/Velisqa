const WISHLIST_STORAGE_KEY = 'velisqa_wishlist_v1'

export function loadWishlistIds() {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((id) => typeof id === 'string' && id.length > 0))]
  } catch {
    return []
  }
}

export function saveWishlistIds(ids) {
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0))]
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(unique))
}
