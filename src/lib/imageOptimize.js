const MAX_DIMENSION = 1600
const WEBP_QUALITY = 0.82
const SKIP_OPTIMIZE_TYPES = ['image/gif']

/**
 * Resize and compress an image file for web upload (WebP).
 * Animated GIFs are uploaded unchanged.
 */
export async function optimizeImageFile(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Please choose a valid image file.')
  }

  if (SKIP_OPTIMIZE_TYPES.includes(file.type)) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  try {
    let { width, height } = bitmap
    const longest = Math.max(width, height)
    const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not process image in this browser.')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Image compression failed.'))),
        'image/webp',
        WEBP_QUALITY,
      )
    })

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'product'
    return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } finally {
    bitmap.close?.()
  }
}

export async function optimizeImageFiles(files) {
  return Promise.all(files.map((file) => optimizeImageFile(file)))
}

const THUMBNAIL_MAX_WIDTH = 600
const THUMBNAIL_QUALITY = 0.7

/**
 * Produces a small WebP thumbnail (≤600px wide) from an image file/blob, used for
 * fast-loading grid cards. Returns null for unsupported types (e.g. animated GIF)
 * so callers can simply skip the thumbnail.
 */
export async function createThumbnailFile(file, baseName = 'thumb') {
  if (!file?.type?.startsWith('image/') || SKIP_OPTIMIZE_TYPES.includes(file.type)) {
    return null
  }

  const bitmap = await createImageBitmap(file)
  try {
    let { width, height } = bitmap
    const scale = width > THUMBNAIL_MAX_WIDTH ? THUMBNAIL_MAX_WIDTH / width : 1
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/webp', THUMBNAIL_QUALITY)
    })
    if (!blob) return null

    return new File([blob], `${baseName}.thumb.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch {
    return null
  } finally {
    bitmap.close?.()
  }
}
