/**
 * CLI import of default Signature Collection (24 pieces).
 * Requires .env with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * (or run "Import default catalogue" in /admin/panel while logged in as admin).
 */
import { readFile, existsSync } from 'node:fs'
import { readFile as readFileAsync } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { SIGNATURE_CATALOG_ITEMS } from '../src/data/signatureCatalogSeed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv() {
  const envPath = path.join(root, '.env')
  if (!existsSync(envPath)) return {}
  const text = readFile(envPath, 'utf8')
  const out = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env, or use Admin → Import default catalogue.',
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

const FOLDER_BY_CATEGORY = {
  Necklace: 'Necklace',
  Bracelet: 'Bracelet',
  Rings: 'Rings',
  Earrings: 'Earrings',
}

function mimeFromFilename(file) {
  const ext = file.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  return 'image/webp'
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

async function uploadImage(filePath, fileName) {
  const buffer = await readFileAsync(filePath)
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp'
  const storagePath = `products/seed/${Date.now()}-${fileName.replace(/\s+/g, '-')}`

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(storagePath, buffer, {
      contentType: mimeFromFilename(fileName),
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('product-images').getPublicUrl(storagePath)
  return data.publicUrl
}

let added = 0
let skipped = 0

for (const item of SIGNATURE_CATALOG_ITEMS) {
  if (await productExists(item.name, item.category)) {
    console.log(`Skip: ${item.name}`)
    skipped += 1
    continue
  }

  const folder = FOLDER_BY_CATEGORY[item.category]
  const filePath = path.join(root, 'src', 'assets', folder, item.file)

  if (!existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`)
    process.exit(1)
  }

  const imageUrl = await uploadImage(filePath, item.file)

  const { error } = await supabase.from('products').insert({
    name: item.name,
    price: item.price,
    description: item.description,
    category: item.category,
    image_url: imageUrl,
    stock: item.stock,
  })

  if (error) {
    console.error(`Failed ${item.name}:`, error.message)
    process.exit(1)
  }

  console.log(`Added: ${item.name} (${item.category})`)
  added += 1
}

console.log(`Done. Added ${added}, skipped ${skipped}.`)
