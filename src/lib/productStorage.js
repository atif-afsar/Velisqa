import { supabase } from './supabaseClient'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

export function getStoragePathFromPublicUrl(url) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

export async function uploadProductImage(file, userId) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg'
  const filePath = `products/${userId ?? 'anon'}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export async function deleteProductImage(publicUrl) {
  const path = getStoragePathFromPublicUrl(publicUrl)
  if (!path) return

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path])
  if (error) {
    console.warn('[Velisqa] Could not delete product image:', error.message)
  }
}
