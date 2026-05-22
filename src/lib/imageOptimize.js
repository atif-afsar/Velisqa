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
