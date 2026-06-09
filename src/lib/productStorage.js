import { supabase } from './supabaseClient'
import { uploadImageToCloudinary, isCloudinaryUploadConfigured } from './cloudinaryUpload'
import { isCloudinaryUrl } from './cloudinaryUrl'
import { optimizeImageFile, createThumbnailFile } from './imageOptimize'
import { thumbnailStoragePath } from './imageCdn'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

/** @typedef {{ url: string, publicId: string | null }} ProductImageAsset */

export function getStoragePathFromPublicUrl(url) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

async function uploadProductImageToSupabase(file, userId) {
  const optimized = await optimizeImageFile(file)
  const ext =
    optimized.type === 'image/webp'
      ? 'webp'
      : optimized.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const filePath = `products/${userId ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(filePath, optimized, {
      cacheControl: '31536000',
      upsert: false,
      contentType: optimized.type || undefined,
    })

  if (uploadError) {
    throw uploadError
  }

  const thumbPath = thumbnailStoragePath(filePath)
  if (thumbPath) {
    try {
      const thumb = await createThumbnailFile(optimized)
      if (thumb) {
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(thumbPath, thumb, {
          cacheControl: '31536000',
          upsert: true,
          contentType: 'image/webp',
        })
      }
    } catch (err) {
      console.warn('[Velisqa] Could not create image thumbnail:', err?.message ?? err)
    }
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath)
  return { url: data.publicUrl, publicId: null }
}

/**
 * Upload a product image to Cloudinary (preferred) or Supabase Storage (legacy fallback).
 * @returns {Promise<ProductImageAsset>}
 */
export async function uploadProductImage(file, userId) {
  if (isCloudinaryUploadConfigured()) {
    const uploaded = await uploadImageToCloudinary(file)
    return {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    }
  }

  return uploadProductImageToSupabase(file, userId)
}

/** @returns {Promise<ProductImageAsset[]>} */
export async function uploadProductImages(files, userId) {
  const assets = []
  for (const file of files) {
    assets.push(await uploadProductImage(file, userId))
  }
  return assets
}

function withThumbnailPaths(paths) {
  const all = []
  for (const path of paths) {
    all.push(path)
    const thumb = thumbnailStoragePath(path)
    if (thumb) all.push(thumb)
  }
  return all
}

export async function deleteProductImage(publicUrl) {
  if (isCloudinaryUrl(publicUrl)) return

  const path = getStoragePathFromPublicUrl(publicUrl)
  if (!path) return

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove(withThumbnailPaths([path]))
  if (error) {
    console.warn('[Velisqa] Could not delete product image:', error.message)
  }
}

export async function deleteProductImages(publicUrls) {
  const paths = publicUrls
    .filter((url) => url && !isCloudinaryUrl(url))
    .map(getStoragePathFromPublicUrl)
    .filter(Boolean)

  if (!paths.length) return

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove(withThumbnailPaths(paths))
  if (error) {
    console.warn('[Velisqa] Could not delete product images:', error.message)
  }
}
