import { optimizeImageFile } from './imageOptimize'

export function isCloudinaryUploadConfigured() {
  return Boolean(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  )
}

/**
 * Upload a product image to Cloudinary (unsigned preset).
 * @returns {{ secure_url: string, public_id: string }}
 */
export async function uploadImageToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env',
    )
  }

  const optimized = await optimizeImageFile(file)

  const formData = new FormData()
  formData.append('file', optimized)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'velisqa/products')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Cloudinary image upload failed.')
  }

  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
  }
}
