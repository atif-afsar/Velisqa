import { uploadImageToCloudinary } from './cloudinaryUpload'

/** @typedef {{ url: string, publicId: string | null }} ProductImageAsset */

/**
 * Upload product images to Cloudinary (signed by the API, admin only).
 * @returns {Promise<ProductImageAsset[]>}
 */
export async function uploadProductImages(files) {
  const assets = []
  for (const file of files) {
    const uploaded = await uploadImageToCloudinary(file, { purpose: 'product' })
    assets.push({ url: uploaded.secure_url, publicId: uploaded.public_id })
  }
  return assets
}
