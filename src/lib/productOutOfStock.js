/** Whether Supabase `products.out_of_stock` column exists (cached after first check). */
let columnExistsCache = null

export async function hasOutOfStockColumn(supabase) {
  if (columnExistsCache !== null) return columnExistsCache
  const { error } = await supabase.from('products').select('out_of_stock').limit(1)
  columnExistsCache = !error
  return columnExistsCache
}

export function resetOutOfStockColumnCache() {
  columnExistsCache = null
}

/** Build DB patch for admin save / toggle. */
export function buildAvailabilityPatch({ outOfStock, stock, useColumn }) {
  const qty = Math.max(0, Math.floor(Number(stock) || 0))
  if (useColumn) {
    return { out_of_stock: Boolean(outOfStock), stock: qty }
  }
  if (outOfStock) {
    return { stock: 0 }
  }
  return { stock: qty <= 0 ? 1 : qty }
}

export function readOutOfStockFromProduct(product, useColumn) {
  if (useColumn) return Boolean(product?.out_of_stock)
  return Math.max(0, Math.floor(Number(product?.stock) || 0)) <= 0
}
