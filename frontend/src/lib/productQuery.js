import { api } from './apiClient'

/**
 * Catalogue reads from the Velisqa API. Products keep the same snake_case
 * fields the storefront used before (id, price, gallery_urls, rating …), and
 * rating/review_count already come from approved reviews only.
 */
export async function fetchProductList(options = {}) {
  try {
    const data = await api.get('/products', { query: options })
    return { data: data.products ?? [], error: null }
  } catch (error) {
    return { data: [], error }
  }
}

/** GETs already retry on network/5xx errors inside apiClient. */
export const fetchProductListWithRetry = (options = {}) => fetchProductList(options)

export async function fetchProductById(id) {
  const data = await api.get(`/products/${encodeURIComponent(id)}`)
  return data.product
}

/** Batched hydration for cart, wishlist and combo lists (missing ids are simply absent). */
export async function fetchProductsByIds(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))]
  if (!unique.length) return []
  const data = await api.get('/products/lookup', { query: { ids: unique.join(',') } })
  return data.products ?? []
}

export async function fetchProductIdNames() {
  const data = await api.get('/products', { query: { fields: 'id,name' } })
  return data.products ?? []
}
