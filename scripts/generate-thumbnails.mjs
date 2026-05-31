/**
 * One-time backfill: generate `*.thumb.webp` thumbnails for existing product
 * images already in Supabase Storage, so grid cards load the small variant
 * instead of falling back to the full-size master.
 *
 * Requires .env with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Run:  npm run thumbnails
 *
 * Safe to re-run — it skips images that already have a thumbnail.
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUCKET = 'product-images'
const OBJECT_MARKER = `/storage/v1/object/public/${BUCKET}/`
const THUMB_WIDTH = 600

function loadEnv() {
  const envPath = path.join(root, '.env')
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

function storagePathFromUrl(publicUrl) {
  if (typeof publicUrl !== 'string') return null
  const idx = publicUrl.indexOf(OBJECT_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(publicUrl.slice(idx + OBJECT_MARKER.length).split('?')[0])
}

function thumbPath(p) {
  return /\.webp$/i.test(p) ? p.replace(/\.webp$/i, '.thumb.webp') : null
}

const { data: products, error } = await supabase
  .from('products')
  .select('id, name, image_url, gallery_urls')

if (error) {
  console.error('Could not load products:', error.message)
  process.exit(1)
}

const urls = new Set()
for (const p of products ?? []) {
  if (p.image_url) urls.add(p.image_url)
  if (Array.isArray(p.gallery_urls)) p.gallery_urls.forEach((u) => u && urls.add(u))
}

let made = 0
let skipped = 0
let failed = 0

for (const publicUrl of urls) {
  const masterPath = storagePathFromUrl(publicUrl)
  const tPath = masterPath && thumbPath(masterPath)
  if (!tPath) {
    skipped += 1
    continue
  }

  // Skip if the thumbnail already exists.
  const dir = tPath.split('/').slice(0, -1).join('/')
  const name = tPath.split('/').pop()
  const { data: existing } = await supabase.storage.from(BUCKET).list(dir, { search: name, limit: 1 })
  if (existing?.some((f) => f.name === name)) {
    skipped += 1
    continue
  }

  try {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(masterPath)
    if (dlErr) throw dlErr
    const input = Buffer.from(await blob.arrayBuffer())
    const thumb = await sharp(input)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 70, effort: 5 })
      .toBuffer()

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(tPath, thumb, { contentType: 'image/webp', cacheControl: '31536000', upsert: true })
    if (upErr) throw upErr

    console.log(`thumb ✓ ${masterPath} (${Math.round(thumb.length / 1024)} KB)`)
    made += 1
  } catch (err) {
    console.warn(`thumb ✗ ${masterPath}: ${err.message ?? err}`)
    failed += 1
  }
}

console.log(`\nDone. Created ${made}, skipped ${skipped}, failed ${failed}.`)
