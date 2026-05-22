const CART_STORAGE_KEY = 'velisqa_cart_v1'

export function loadCartItems() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidCartItem) : []
  } catch {
    return []
  }
}

export function saveCartItems(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

function isValidCartItem(item) {
  return (
    item &&
    typeof item.productId === 'string' &&
    typeof item.name === 'string' &&
    Number.isFinite(Number(item.price)) &&
    Number.isFinite(Number(item.quantity)) &&
    item.quantity > 0
  )
}
