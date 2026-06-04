/**
 * Image URL helpers for fast, right-sized delivery.
 *
 * Product images live in Supabase Storage. By default (free tier) we serve a
 * small pre-generated `*.thumb.webp` variant — created at upload time — to grid
 * cards and thumbnails, while detail views use the full-size master. This needs
 * no paid features. If a thumbnail doesn't exist yet (older products), the
 * ProductImage component falls back to the master automatically.
 *
 * On Supabase Pro you can instead enable on-the-fly transformations with
 * `VITE_SUPABASE_IMAGE_TRANSFORM=true`, which resizes any width on demand.
 */

const PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/'
const RENDER_IMAGE_MARKER = '/storage/v1/render/image/public/'

/** Render widths at/below this get the small thumbnail variant on the free tier. */
const THUMBNAIL_WIDTH_THRESHOLD = 700

const TRANSFORM_ENABLED =
  String(import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORM ?? '').toLowerCase() === 'true'

/** True for a public Supabase Storage object URL we can rewrite. */
export function isSupabaseStorageUrl(url) {
  return typeof url === 'string' && url.includes(PUBLIC_OBJECT_MARKER)
}

/** Master URL from a storage URL (strips `.thumb` if present). */
export function masterImageUrl(src) {
  if (typeof src !== 'string') return src
  const [base, query] = src.split('?')
  const master = base.replace(/\.thumb\.webp$/i, '.webp')
  return query ? `${master}?${query}` : master
}

/** Inserts `.thumb` before the `.webp` extension (URL or storage path). Null if not a .webp. */
function toThumbnailVariant(value) {
  if (typeof value !== 'string') return null
  const [base, query] = value.split('?')
  if (/\.thumb\.webp$/i.test(base)) {
    return query ? `${base}?${query}` : base
  }
  if (!/\.webp$/i.test(base)) return null
  const thumb = base.replace(/\.webp$/i, '.thumb.webp')
  return query ? `${thumb}?${query}` : thumb
}

/** Storage path for a master's thumbnail (e.g. `products/x/1.webp` → `products/x/1.thumb.webp`). */
export function thumbnailStoragePath(path) {
  return toThumbnailVariant(path)
}

/** Public URL of the thumbnail variant for a Supabase image URL, or null. */
export function thumbnailUrl(src) {
  if (!isSupabaseStorageUrl(src)) return null
  return toThumbnailVariant(src)
}

/**
 * Returns the best delivery URL for an image at a given render width.
 * - Pro transforms on: resizes on the fly via the render endpoint.
 * - Free tier (default): small widths get the pre-generated thumbnail variant.
 * - Bundled assets / non-Supabase URLs: returned unchanged.
 */
export function buildImageUrl(src, { width, height, quality = 72, resize = 'cover' } = {}) {
  if (!isSupabaseStorageUrl(src)) return src

  if (TRANSFORM_ENABLED) {
    if (!width) return src
    const rendered = src.replace(PUBLIC_OBJECT_MARKER, RENDER_IMAGE_MARKER)
    const [base, existingQuery] = rendered.split('?')
    const params = new URLSearchParams(existingQuery)
    params.set('width', String(Math.round(width)))
    if (height) params.set('height', String(Math.round(height)))
    params.set('quality', String(quality))
    params.set('resize', resize)
    return `${base}?${params.toString()}`
  }

  if (width && width <= THUMBNAIL_WIDTH_THRESHOLD) {
    return thumbnailUrl(masterImageUrl(src)) ?? masterImageUrl(src)
  }
  return masterImageUrl(src)
}

/**
 * Responsive `srcSet` — only meaningful when Pro transforms are enabled (multiple
 * widths on demand). On the free tier we serve a single thumbnail, so this returns ''.
 */
export function buildImageSrcSet(src, widths, { quality = 72, resize = 'cover' } = {}) {
  if (!TRANSFORM_ENABLED || !isSupabaseStorageUrl(src) || !Array.isArray(widths)) return ''
  return widths
    .map((w) => `${buildImageUrl(src, { width: w, quality, resize })} ${w}w`)
    .join(', ')
}
