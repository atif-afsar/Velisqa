/**
 * Catalogue data baked into prerendered pages (scripts/prerender.mjs).
 *
 * - At build time the prerender sets `globalThis.__VELISQA_DATA__` before rendering a route.
 * - In the browser the same data ships as <script id="velisqa-data" type="application/json">,
 *   so the first render shows exactly the content crawlers saw — no loading skeleton.
 *
 * Shape: { products?: Product[] (card fields), product?: Product (full row, product pages) }
 */
const SCRIPT_ID = 'velisqa-data'
let clientData

export function getPrerenderData() {
  if (globalThis.__VELISQA_DATA__) return globalThis.__VELISQA_DATA__
  if (typeof document === 'undefined') return null
  if (clientData === undefined) {
    try {
      const node = document.getElementById(SCRIPT_ID)
      clientData = node ? JSON.parse(node.textContent) : null
    } catch {
      clientData = null
    }
  }
  return clientData
}

/** Columns the storefront needs to render product cards and listings. */
export const CARD_FIELDS = [
  'id',
  'name',
  'price',
  'mrp',
  'stock',
  'out_of_stock',
  'category',
  'image_url',
  'gallery_urls',
  'created_at',
  'rating',
  'review_count',
  'badge',
  'hover_image_url',
  'hover_cloudinary_public_id',
  'cloudinary_public_id',
  'gallery_cloudinary_ids',
  'metal',
  'colour',
  'styles',
  'search_keywords',
  'is_combo',
  'combo_product_ids',
]

export function toCardProduct(product) {
  const out = {}
  for (const key of CARD_FIELDS) if (product[key] != null) out[key] = product[key]
  // Cards show the first image (the full gallery ships with the product page's own data).
  for (const key of ['gallery_urls', 'gallery_cloudinary_ids']) if (Array.isArray(out[key])) out[key] = out[key].slice(0, 2)
  return out
}
