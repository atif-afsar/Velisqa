/**
 * Signs in as admin (ADMIN_EMAIL + ADMIN_PASSWORD in .env) and imports the full catalogue.
 */
import { readFileSync, existsSync, readFile as readFileAsync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { SIGNATURE_CATALOG_ITEMS } from '../src/data/signatureCatalogSeed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv() {
  if (!existsSync(path.join(root, '.env'))) return {}
  const out = {}
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return out
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
const email = env.ADMIN_EMAIL || env.VITE_ADMIN_EMAIL
const password = env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

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

async function productExists(supabase, name, category) {
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('name', name)
    .eq('category', category)
    .maybeSingle()
  return Boolean(data?.id)
}

async function uploadImage(supabase, filePath, fileName, userId) {
  const buffer = await readFileAsync(filePath)
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp'
  const storagePath = `products/${userId ?? 'seed'}/${Date.now()}-${fileName.replace(/\s+/g, '-')}`

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

if (!url || (!serviceKey && (!anonKey || !email || !password))) {
  console.error(
    'Need VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or ADMIN_EMAIL + ADMIN_PASSWORD in .env',
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey || anonKey)

if (!serviceKey) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) {
    console.error('Admin sign-in failed:', authError.message)
    process.exit(1)
  }
  console.log('Signed in as', authData.user?.email)
}

const userId = (await supabase.auth.getUser()).data.user?.id ?? 'seed-cli'

let added = 0
let skipped = 0
const failed = []

for (const item of SIGNATURE_CATALOG_ITEMS) {
  if (await productExists(supabase, item.name, item.category)) {
    console.log('Skip:', item.name)
    skipped += 1
    continue
  }

  const folder = FOLDER_BY_CATEGORY[item.category]
  const filePath = path.join(root, 'src', 'assets', folder, item.file)

  if (!existsSync(filePath)) {
    failed.push({ name: item.name, message: `Missing ${filePath}` })
    continue
  }

  try {
    const imageUrl = await uploadImage(supabase, filePath, item.file, userId)
    const { error } = await supabase.from('products').insert({
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      image_url: imageUrl,
      stock: item.stock,
      created_by: userId !== 'seed-cli' ? userId : null,
    })

    if (error) throw error
    console.log('Added:', item.name)
    added += 1
  } catch (err) {
    failed.push({ name: item.name, message: err.message })
    console.error('Failed:', item.name, err.message)
  }
}

console.log(JSON.stringify({ added, skipped, failed }, null, 2))
process.exit(failed.length > 0 && added === 0 ? 1 : 0)
