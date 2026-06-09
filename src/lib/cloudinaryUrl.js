/** Preset widths aligned with the VELISQA image plan */
export const CLOUDINARY_WIDTHS = {
  thumb: 250,
  card: 500,
  detail: 1000,
  hero: 1400,
}

export function isCloudinaryConfigured() {
  return Boolean(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME)
}

export function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/upload/')
}

function getCloudNameFromUrl(imageUrl) {
  const match = imageUrl.match(/res\.cloudinary\.com\/([^/]+)\/image\/upload\//)
  return match?.[1] ?? import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? null
}

/** Strip transformation + version segments to recover the public_id path */
export function extractCloudinaryPublicId(imageUrl) {
  if (!isCloudinaryUrl(imageUrl)) return null

  const afterUpload = imageUrl.split('/image/upload/')[1]
  if (!afterUpload) return null

  const segments = afterUpload.split('/')
  let i = 0

  if (segments[i]?.match(/^v\d+$/)) i += 1

  while (
    segments[i] &&
    (segments[i].includes(',') ||
      /^[a-z]_/.test(segments[i]) ||
      segments[i].startsWith('c_') ||
      segments[i].startsWith('g_'))
  ) {
    i += 1
  }

  const publicId = segments.slice(i).join('/')
  return publicId || null
}

export function cloudinaryUrlFromPublicId(publicId, options = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  if (!cloudName || !publicId) return ''

  const width = options.width ?? CLOUDINARY_WIDTHS.card
  const quality = options.quality ?? 'auto'

  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_${quality},w_${width}/${publicId}`
}

export function getOptimizedCloudinaryUrl(imageUrl, options = {}) {
  if (!imageUrl) return ''

  const width = options.width ?? CLOUDINARY_WIDTHS.card
  const quality = options.quality ?? 'auto'

  if (!isCloudinaryUrl(imageUrl)) {
    return imageUrl
  }

  const cloudName = getCloudNameFromUrl(imageUrl)
  const publicId = extractCloudinaryPublicId(imageUrl)
  if (!cloudName || !publicId) return imageUrl

  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_${quality},w_${width}/${publicId}`
}

export function buildCloudinarySrcSet(imageUrl, widths, options = {}) {
  if (!isCloudinaryUrl(imageUrl) || !Array.isArray(widths) || !widths.length) return ''

  return widths
    .map((w) => `${getOptimizedCloudinaryUrl(imageUrl, { ...options, width: w })} ${w}w`)
    .join(', ')
}
