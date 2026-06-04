/** Columns for list/grid views — avoids fetching large unused fields. */
export const PRODUCT_LIST_SELECT =
  'id, name, price, stock, category, image_url, gallery_urls, created_at, rating, review_count, badge'

const PRODUCT_LIST_SELECT_WITH_OOS = `${PRODUCT_LIST_SELECT}, out_of_stock`

/** Fetch products for shop grids; works before and after out_of_stock migration. */
export async function fetchProductList(supabase, options = {}) {
  const { order = { column: 'created_at', ascending: false } } = options

  let query = supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT_WITH_OOS)
    .order(order.column, { ascending: order.ascending })

  let { data, error } = await query

  if (error?.message?.includes('out_of_stock')) {
    const fallback = await supabase
      .from('products')
      .select(PRODUCT_LIST_SELECT)
      .order(order.column, { ascending: order.ascending })
    data = fallback.data
    error = fallback.error
  }

  return { data: data ?? [], error }
}
