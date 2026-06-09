/** Columns for list/grid views — avoids fetching large unused fields. */
export const PRODUCT_LIST_SELECT =
  'id, name, price, stock, category, image_url, gallery_urls, cloudinary_public_id, gallery_cloudinary_ids, created_at, rating, review_count, badge'

const PRODUCT_LIST_SELECT_WITH_OOS = `${PRODUCT_LIST_SELECT}, out_of_stock`

const PRODUCT_LIST_SELECT_LEGACY =
  'id, name, price, stock, category, image_url, gallery_urls, created_at, rating, review_count, badge'

const PRODUCT_LIST_SELECT_LEGACY_WITH_OOS = `${PRODUCT_LIST_SELECT_LEGACY}, out_of_stock`

/** Fetch products for shop grids; works before and after schema migrations. */
export async function fetchProductList(supabase, options = {}) {
  const { order = { column: 'created_at', ascending: false } } = options

  const run = (columns) =>
    supabase.from('products').select(columns).order(order.column, { ascending: order.ascending })

  let { data, error } = await run(PRODUCT_LIST_SELECT_WITH_OOS)

  if (error?.message?.includes('out_of_stock')) {
    ;({ data, error } = await run(PRODUCT_LIST_SELECT))
  }

  if (error?.message?.includes('cloudinary')) {
    ;({ data, error } = await run(PRODUCT_LIST_SELECT_LEGACY_WITH_OOS))
  }

  if (error?.message?.includes('out_of_stock')) {
    ;({ data, error } = await run(PRODUCT_LIST_SELECT_LEGACY))
  }

  return { data: data ?? [], error }
}
