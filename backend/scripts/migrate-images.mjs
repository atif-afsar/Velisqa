/**
 * Mirrors product/review images still served from Supabase Storage
 * (`/storage/v1/object/public/...`) into Cloudinary, then rewrites every
 * reference (image_url, hover_image_url, gallery_urls[], review image_urls[])
 * and fills the *_cloudinary_* id fields. Originals are NOT deleted.
 *
 *   node scripts/migrate-images.mjs             # dry run: lists what would move
 *   node scripts/migrate-images.mjs --apply     # upload + rewrite (idempotent: deterministic public_id, mapping file)
 *
 * Uses Cloudinary when CLOUDINARY_* is set, otherwise the API server's own media store (MEDIA_DIR).
 * The old bucket must still be publicly readable while this runs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { C, closeDb, connectDb } from '../src/config/db.js'
import { sha256 } from '../src/lib/crypto.js'
import { isCloudinaryConfigured, uploadRemoteImage } from '../src/providers/cloudinary.js'
import { saveImage } from '../src/services/mediaService.js'

const { values: args } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'mapping-file': { type: 'string', default: 'reports/image-mapping.json' } } })
const mappingFile = path.resolve(args['mapping-file'])
const mapping = existsSync(mappingFile) ? JSON.parse(readFileSync(mappingFile, 'utf8')) : {}
const isSupabaseUrl = (url) => typeof url === 'string' && url.includes('/storage/v1/object/public/')
// Supabase free-tier thumbnails (`.thumb.webp`) are not needed: Cloudinary resizes on the fly.
const masterUrl = (url) => url.replace(/\.thumb\.webp(\?.*)?$/i, '.webp$1')

const stats = { found: 0, uploaded: 0, reused: 0, failed: 0, productsUpdated: 0, reviewsUpdated: 0, bytes: 0, failures: [] }

async function mirror(url, folder) {
  const source = masterUrl(url)
  if (mapping[source]) {
    stats.reused += 1
    return mapping[source]
  }
  stats.found += 1
  if (!args.apply) return null
  try {
    const head = await fetch(source, { method: 'HEAD' })
    if (!head.ok) throw new Error(`source HTTP ${head.status}`)
    let uploaded
    if (isCloudinaryConfigured()) {
      uploaded = await uploadRemoteImage({ url: source, folder, publicId: `supabase-${sha256(source).slice(0, 24)}` })
    } else {
      // No Cloudinary: copy the file into the API server's own media store instead.
      const response = await fetch(source)
      if (!response.ok) throw new Error(`source HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      const type = response.headers.get('content-type') || 'image/webp'
      uploaded = saveImage(`data:${type};base64,${bytes.toString('base64')}`, { folder: folder.endsWith('reviews') ? 'reviews' : 'products' })
    }
    mapping[source] = { url: uploaded.url, publicId: uploaded.publicId?.startsWith('local/') ? null : uploaded.publicId }
    stats.uploaded += 1
    stats.bytes += Number(uploaded.bytes) || 0
    writeFileSync(mappingFile, JSON.stringify(mapping, null, 2))
    return mapping[source]
  } catch (error) {
    stats.failed += 1
    stats.failures.push({ url: source.split('/public/')[1], message: error.message })
    return null
  }
}

mkdirSync(path.dirname(mappingFile), { recursive: true })
const db = await connectDb()

for (const product of await db.collection(C.products).find({}).toArray()) {
  const gallery = Array.isArray(product.gallery_urls) ? product.gallery_urls : []
  const urls = [product.image_url, product.hover_image_url, ...gallery].filter(isSupabaseUrl)
  if (!urls.length) continue
  const patch = {}
  const swap = async (url) => (isSupabaseUrl(url) ? (await mirror(url, 'velisqa/products')) : null)

  const galleryIds = Array.isArray(product.gallery_cloudinary_ids) ? [...product.gallery_cloudinary_ids] : []
  const nextGallery = []
  for (const [index, url] of gallery.entries()) {
    const moved = await swap(url)
    nextGallery.push(moved?.url || url)
    if (moved) galleryIds[index] = moved.publicId
  }
  if (gallery.length && nextGallery.some((url, index) => url !== gallery[index])) {
    patch.gallery_urls = nextGallery
    patch.gallery_cloudinary_ids = nextGallery.map((_url, index) => galleryIds[index] ?? null)
  }
  const primary = await swap(product.image_url)
  if (primary) Object.assign(patch, { image_url: primary.url, cloudinary_public_id: primary.publicId })
  const hover = await swap(product.hover_image_url)
  if (hover) Object.assign(patch, { hover_image_url: hover.url, hover_cloudinary_public_id: hover.publicId })

  if (args.apply && Object.keys(patch).length) {
    await db.collection(C.products).updateOne({ _id: product._id }, { $set: { ...patch, updated_at: new Date() } })
    stats.productsUpdated += 1
  }
}

for (const review of await db.collection(C.productReviews).find({ image_urls: /\/storage\/v1\// }).toArray()) {
  const next = []
  for (const url of review.image_urls) next.push(isSupabaseUrl(url) ? (await mirror(url, 'velisqa/reviews'))?.url || url : url)
  if (args.apply && next.some((url, index) => url !== review.image_urls[index])) {
    await db.collection(C.productReviews).updateOne({ _id: review._id }, { $set: { image_urls: next } })
    stats.reviewsUpdated += 1
  }
}

console.log(JSON.stringify({ mode: args.apply ? 'apply' : 'dry-run', ...stats, failures: stats.failures.slice(0, 20) }, null, 2))
await closeDb()
process.exit(stats.failed ? 2 : 0)
