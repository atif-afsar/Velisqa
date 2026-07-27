/** Columns for list/grid views — avoids fetching large unused fields. */
const PRODUCT_COMMERCE_FIELDS = 'mrp, metal, colour, styles, search_keywords'
const PRODUCT_CORE_FIELDS =
  'id, name, price, stock, category, image_url, gallery_urls, created_at, rating, review_count, badge'
const PRODUCT_CORE_FIELDS_WITHOUT_RATINGS =
  'id, name, price, stock, category, image_url, gallery_urls, created_at, badge'
const PRODUCT_CLOUDINARY_FIELDS = 'cloudinary_public_id, gallery_cloudinary_ids'

export const PRODUCT_LIST_SELECT =
  `${PRODUCT_CORE_FIELDS}, ${PRODUCT_COMMERCE_FIELDS}, ${PRODUCT_CLOUDINARY_FIELDS}`

function commerceColumnsMissing(error) {
  const message = String(error?.message || '')
  return ['mrp', 'metal', 'colour', 'styles', 'search_keywords'].some((column) => message.includes(column))
}

function ratingColumnsMissing(error) {
  const message = String(error?.message || '')
  return message.includes('rating') || message.includes('review_count')
}

function productListColumns({ commerce, cloudinary, outOfStock, ratings }) {
  return [
    ratings ? PRODUCT_CORE_FIELDS : PRODUCT_CORE_FIELDS_WITHOUT_RATINGS,
    commerce ? PRODUCT_COMMERCE_FIELDS : null,
    cloudinary ? PRODUCT_CLOUDINARY_FIELDS : null,
    outOfStock ? 'out_of_stock' : null,
  ].filter(Boolean).join(', ')
}

/** Fetch products for shop grids; works before and after schema migrations. */
export async function fetchProductList(supabase, options = {}) {
  const { order = { column: 'created_at', ascending: false } } = options

  const run = (columns) =>
    supabase.from('products').select(columns).order(order.column, { ascending: order.ascending })

  const supported = { commerce: true, cloudinary: true, outOfStock: true, ratings: true }
  let result = { data: [], error: null }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    result = await run(productListColumns(supported))
    if (!result.error) break

    if (supported.ratings && ratingColumnsMissing(result.error)) {
      supported.ratings = false
      continue
    }
    if (supported.commerce && commerceColumnsMissing(result.error)) {
      supported.commerce = false
      continue
    }
    if (supported.cloudinary && result.error.message?.includes('cloudinary')) {
      supported.cloudinary = false
      continue
    }
    if (supported.outOfStock && result.error.message?.includes('out_of_stock')) {
      supported.outOfStock = false
      continue
    }
    break
  }

  return { data: result.data ?? [], error: result.error }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** Retry transient Supabase/network failures (common on cold start / mobile). */
export async function fetchProductListWithRetry(supabase, options = {}, retries = 2) {
  let lastResult = { data: [], error: null }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    lastResult = await fetchProductList(supabase, options)
    if (!lastResult.error) return lastResult
    if (attempt < retries) await wait(400 * (attempt + 1))
  }

  return lastResult
}
