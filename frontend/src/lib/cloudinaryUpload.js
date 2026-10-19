import { api } from './apiClient'
import { optimizeImageFile } from './imageOptimize'

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })

/** Upload to the Velisqa API's own image store (used when Cloudinary is not configured, and for site banners). */
async function uploadToApi(file, purpose) {
  return api.post('/uploads/image', { purpose, dataUrl: await readAsDataUrl(file) })
}

/**
 * Upload an optimized image. Uses Cloudinary with parameters signed by the API
 * (admins: products; signed-in customers: review photos); falls back to the
 * API's own image store when Cloudinary is not set up.
 * @param {File} file
 * @param {{ purpose?: 'product' | 'review' | 'site' }} [options]
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export async function uploadImageToCloudinary(file, { purpose = 'product' } = {}) {
  // Wide banners need more pixels than product shots.
  const optimized = await optimizeImageFile(file, { maxDimension: purpose === 'site' ? 2560 : 1600 })
  if (purpose === 'site') return uploadToApi(optimized, purpose)

  let signed
  try {
    signed = await api.post('/uploads/signature', { purpose })
  } catch (error) {
    if (error?.status === 503) return uploadToApi(optimized, purpose)
    throw error
  }

  const formData = new FormData()
  formData.append('file', optimized)
  formData.append('api_key', signed.apiKey)
  formData.append('timestamp', String(signed.timestamp))
  formData.append('folder', signed.folder)
  formData.append('signature', signed.signature)

  const response = await fetch(signed.uploadUrl, { method: 'POST', body: formData })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Cloudinary image upload failed.')
  }
  return { secure_url: data.secure_url, public_id: data.public_id }
}
