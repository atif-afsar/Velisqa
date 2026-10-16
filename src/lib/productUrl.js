/**
 * SEO-friendly product URLs: /product/<name-slug>-<first 6 chars of id>
 * e.g. /product/floral-pearl-necklace-064e71
 *
 * The short id suffix keeps URLs unique without a database slug column.
 * Legacy /product/<uuid> URLs still resolve and are redirected to the slug.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHORT_ID_LENGTH = 6

export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

export function isProductUuid(value) {
  return UUID_RE.test(String(value || ''))
}

export function productSlug(product) {
  if (!product?.id) return ''
  const shortId = String(product.id).replace(/-/g, '').slice(0, SHORT_ID_LENGTH).toLowerCase()
  const name = slugify(product.name) || 'jewellery'
  return `${name}-${shortId}`
}

export function productPath(product) {
  if (!product?.id) return '/collections'
  return `/product/${productSlug(product)}`
}

/** Short id prefix from a slug param, or null when the param is not a slug. */
export function shortIdFromParam(param) {
  const match = /-([0-9a-f]{6})$/i.exec(String(param || ''))
  return match ? match[1].toLowerCase() : null
}

/** Finds the product whose id starts with the slug's short id. */
export function matchProductBySlug(products, param) {
  const shortId = shortIdFromParam(param)
  if (!shortId || !Array.isArray(products)) return null
  const exact = products.find((p) => productSlug(p) === param)
  if (exact) return exact
  return products.find((p) => String(p.id).replace(/-/g, '').toLowerCase().startsWith(shortId)) ?? null
}
