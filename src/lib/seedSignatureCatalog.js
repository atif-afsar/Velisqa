import { SIGNATURE_CATALOG_ITEMS } from '../data/signatureCatalogSeed'
import { normalizeProductCategory } from './productCategories'
import { supabase } from './supabaseClient'
import { uploadProductImage } from './productStorage'

const assetModules = import.meta.glob('../assets/{Necklace,Bracelet,Rings,Earrings}/*.{webp,png,jpg,jpeg}', {
  eager: true,
  import: 'default',
})

const FOLDER_BY_CATEGORY = {
  Necklace: 'Necklace',
  Bracelet: 'Bracelet',
  Rings: 'Rings',
  Earrings: 'Earrings',
}

function resolveAssetUrl(category, file) {
  const folder = FOLDER_BY_CATEGORY[category]
  const needle = `/assets/${folder}/${file}`.replace(/\\/g, '/')
  const matchKey = Object.keys(assetModules).find((key) => key.replace(/\\/g, '/').endsWith(needle))
  return matchKey ? assetModules[matchKey] : null
}

async function productExists(name, category) {
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('name', name)
    .eq('category', category)
    .maybeSingle()
  return Boolean(data?.id)
}

function mimeFromFilename(file) {
  const ext = file.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'image/webp'
}

export function countCatalogProductsPresent(products) {
  const expected = new Set(SIGNATURE_CATALOG_ITEMS.map((item) => `${item.name}|${item.category}`))
  let found = 0
  for (const product of products) {
    const key = `${product.name}|${normalizeProductCategory(product.category)}`
    if (expected.has(key)) found += 1
  }
  return found
}

export function isSignatureCatalogComplete(products) {
  return countCatalogProductsPresent(products) >= SIGNATURE_CATALOG_ITEMS.length
}

/**
 * Uploads default asset images and inserts catalogue rows (skips existing name + category).
 */
export async function importSignatureCatalog({ userId, onProgress }) {
  const results = { added: 0, skipped: 0, failed: [] }

  for (let i = 0; i < SIGNATURE_CATALOG_ITEMS.length; i += 1) {
    const item = SIGNATURE_CATALOG_ITEMS[i]
    const category = normalizeProductCategory(item.category)

    onProgress?.({ current: i + 1, total: SIGNATURE_CATALOG_ITEMS.length, item: item.name })

    try {
      if (await productExists(item.name, category)) {
        results.skipped += 1
        continue
      }

      const assetUrl = resolveAssetUrl(item.category, item.file)
      if (!assetUrl) {
        throw new Error(`Asset not found: ${item.category}/${item.file}`)
      }

      const response = await fetch(assetUrl)
      if (!response.ok) {
        throw new Error(`Could not read ${item.file}`)
      }

      const blob = await response.blob()
      const file = new File([blob], item.file.replace(/\s+/g, '-'), {
        type: blob.type || mimeFromFilename(item.file),
      })

      const imageAsset = await uploadProductImage(file, userId)

      const insertRow = {
        name: item.name,
        price: item.price,
        description: item.description,
        category,
        image_url: imageAsset.url,
        cloudinary_public_id: imageAsset.publicId,
        gallery_urls: [imageAsset.url],
        gallery_cloudinary_ids: imageAsset.publicId ? [imageAsset.publicId] : [],
        stock: item.stock,
        created_by: userId ?? null,
      }

      let { error } = await supabase.from('products').insert(insertRow)

      if (error?.message?.includes('cloudinary')) {
        const { cloudinary_public_id: _a, gallery_cloudinary_ids: _b, ...legacyRow } = insertRow
        ;({ error } = await supabase.from('products').insert(legacyRow))
      }

      if (error) {
        throw error
      }

      results.added += 1
    } catch (err) {
      results.failed.push({ name: item.name, message: err.message ?? String(err) })
    }
  }

  return results
}
