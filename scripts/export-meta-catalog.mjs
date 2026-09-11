import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '../.env')
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return out
}

const env = loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const sb = createClient(supabaseUrl, supabaseKey)
const { data: products, error } = await sb
  .from('products')
  .select('*')
  .order('created_at', { ascending: false })

if (error) {
  console.error('Error fetching products:', error)
  process.exit(1)
}

const SITE_URL = 'https://www.velisqa.com'

function escapeCsv(value) {
  if (value === null || value === undefined) return '""'
  const str = String(value).replace(/"/g, '""').replace(/\r?\n/g, ' ')
  return `"${str}"`
}

const headers = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'google_product_category',
  'fb_product_category',
]

const rows = [headers.join(',')]

for (const p of products) {
  const id = p.id
  const title = p.name || 'Velisqa Jewelry'
  const description = p.description || p.name || 'Handcrafted artificial jewelry from Velisqa'
  const isOutOfStock = p.out_of_stock === true || (p.stock !== null && p.stock !== undefined && p.stock <= 0)
  const availability = isOutOfStock ? 'out of stock' : 'in stock'
  const condition = 'new'
  const price = `${Number(p.price) || 0} INR`
  const link = `${SITE_URL}/product/${p.id}`
  const imageLink = p.image_url || ''
  const brand = 'Velisqa'
  const googleCategory = 'Apparel & Accessories > Jewelry'
  const fbCategory = 'Jewelry'

  rows.push([
    escapeCsv(id),
    escapeCsv(title),
    escapeCsv(description),
    escapeCsv(availability),
    escapeCsv(condition),
    escapeCsv(price),
    escapeCsv(link),
    escapeCsv(imageLink),
    escapeCsv(brand),
    escapeCsv(googleCategory),
    escapeCsv(fbCategory),
  ].join(','))
}

const csvContent = rows.join('\n')
const outputPath = resolve(__dirname, '../public/meta-catalog.csv')
writeFileSync(outputPath, csvContent, 'utf8')

console.log(`Successfully generated Meta catalog CSV with ${products.length} products: ${outputPath}`)
