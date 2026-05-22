import { supabase } from './supabaseClient'
import { optimizeImageFile } from './imageOptimize'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

export function getStoragePathFromPublicUrl(url) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

export async function uploadProductImage(file, userId) {
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

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export async function uploadProductImages(files, userId) {
  const urls = []
  for (const file of files) {
    urls.push(await uploadProductImage(file, userId))
  }
  return urls
}

export async function deleteProductImage(publicUrl) {
  const path = getStoragePathFromPublicUrl(publicUrl)
  if (!path) return

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path])
  if (error) {
    console.warn('[Velisqa] Could not delete product image:', error.message)
  }
}

export async function deleteProductImages(publicUrls) {
  const paths = publicUrls
    .map(getStoragePathFromPublicUrl)
    .filter(Boolean)
  if (!paths.length) return

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths)
  if (error) {
    console.warn('[Velisqa] Could not delete product images:', error.message)
  }
}
