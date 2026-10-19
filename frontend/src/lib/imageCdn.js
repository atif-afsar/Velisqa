/**
 * Image URL helpers for fast, right-sized delivery.
 *
 * Product images are served from Cloudinary when URLs point there (recommended).
 * Legacy Supabase Storage URLs still work via pre-generated thumbnails or Pro transforms.
 */

import {
  buildCloudinarySrcSet,
  getOptimizedCloudinaryUrl,
  isCloudinaryUrl,
} from './cloudinaryUrl'

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

/** Master URL from a storage URL (strips `.thumb` if present). Cloudinary URLs are normalized. */
export function masterImageUrl(src) {
  if (typeof src !== 'string') return src

  if (isCloudinaryUrl(src)) {
    return getOptimizedCloudinaryUrl(src, { width: 2000, quality: 'auto' })
  }

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

function normalizeQuality(quality) {
  if (quality === 'auto' || quality == null) return 'auto'
  return String(quality)
}

/**
 * Returns the best delivery URL for an image at a given render width.
 * - Cloudinary: f_auto,q_auto,w_{width}
 * - Supabase Pro transforms: on-the-fly resize
 * - Supabase free tier: pre-generated thumbnail for small widths
 */
export function buildImageUrl(src, { width, height, quality = 'auto', resize = 'cover' } = {}) {
  if (!src) return src

  if (isCloudinaryUrl(src)) {
    if (!width) return masterImageUrl(src)
    return getOptimizedCloudinaryUrl(src, { width, quality: 'auto' })
  }

  if (!isSupabaseStorageUrl(src)) return src

  if (TRANSFORM_ENABLED) {
    if (!width) return src
    const rendered = src.replace(PUBLIC_OBJECT_MARKER, RENDER_IMAGE_MARKER)
    const [base, existingQuery] = rendered.split('?')
    const params = new URLSearchParams(existingQuery)
    params.set('width', String(Math.round(width)))
    if (height) params.set('height', String(Math.round(height)))
    params.set('quality', String(quality === 'auto' ? 72 : quality))
    params.set('resize', resize)
    return `${base}?${params.toString()}`
  }

  if (width && width <= THUMBNAIL_WIDTH_THRESHOLD) {
    return thumbnailUrl(masterImageUrl(src)) ?? masterImageUrl(src)
  }
  return masterImageUrl(src)
}

/**
 * Responsive `srcSet` for Cloudinary or Supabase Pro transforms.
 */
export function buildImageSrcSet(src, widths, { quality = 'auto', resize = 'cover' } = {}) {
  if (!Array.isArray(widths) || !widths.length) return ''

  if (isCloudinaryUrl(src)) {
    return buildCloudinarySrcSet(src, widths, { quality: normalizeQuality(quality) })
  }

  if (!TRANSFORM_ENABLED || !isSupabaseStorageUrl(src)) return ''

  return widths
    .map((w) => `${buildImageUrl(src, { width: w, quality, resize })} ${w}w`)
    .join(', ')
}
