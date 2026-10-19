/**
 * Demo catalogue + the coupons the old SQL seeded (SAVE10 / VELISQA5 / FREE50),
 * for local development and staging smoke tests only. Never run against
 * production data: real records come from scripts/migrate-supabase.mjs.
 *
 *   node scripts/seed.mjs            # refuses when NODE_ENV=production
 */
import { C, closeDb, connectDb, ensureIndexes } from '../src/config/db.js'
import { env } from '../src/config/env.js'
import { uuid } from '../src/lib/crypto.js'

if (env.isProd && !process.argv.includes('--i-know-this-is-not-production-data')) {
  console.error('Refusing to seed demo data with NODE_ENV=production.')
  process.exit(1)
}

const IMAGE = (n) => `/images/img${n}.webp`
const DEMO = [
  ['Aurelia Layered Necklace', 'Necklace', 499, 799, 'Gold plated', 'Gold', ['Wedding', 'Party'], 1],
  ['Velisqa Lustre Chain Necklace', 'Necklace', 399, 599, 'Gold plated', 'Gold', ['Everyday'], 2],
  ['Celeste Pendant Necklace', 'Necklace', 1299, 1799, 'Silver plated', 'Silver', ['Party'], 3],
  ['Luna Drop Earrings', 'Earrings', 349, 499, 'Rose gold plated', 'Rose gold', ['Everyday', 'Office'], 4],
  ['Noor Hoop Earrings', 'Earrings', 299, 449, 'Gold plated', 'Gold', ['Minimal'], 5],
  ['Solace Stacking Ring', 'Rings', 249, 399, '925 silver', 'Silver', ['Minimal'], 6],
  ['Ember Cocktail Ring', 'Rings', 599, 899, 'Gold plated', 'Gold', ['Statement'], 7],
  ['Iris Chain Bracelet', 'Bracelet', 449, 699, 'Stainless steel', 'Silver', ['Everyday'], 8],
  ['Saanvi Kada Bangle', 'Bangles', 899, 1299, 'Brass', 'Gold', ['Traditional', 'Wedding'], 9],
]

const db = await connectDb()
await ensureIndexes(db)
const now = Date.now()
let inserted = 0
for (const [index, [name, category, price, mrp, metal, colour, styles, img]] of DEMO.entries()) {
  const exists = await db.collection(C.products).findOne({ name })
  if (exists) continue
  await db.collection(C.products).insertOne({
    _id: uuid(),
    name,
    price,
    mrp,
    description: `${name} — demo product for development and staging.`,
    category,
    metal,
    colour,
    styles,
    search_keywords: [category.toLowerCase(), colour.toLowerCase()],
    stock: 8,
    out_of_stock: false,
    badge: index < 2 ? 'bestseller' : null,
    image_url: IMAGE(img),
    hover_image_url: null,
    gallery_urls: [IMAGE(img)],
    cloudinary_public_id: null,
    hover_cloudinary_public_id: null,
    gallery_cloudinary_ids: [],
    mock_review_count: 0,
    mock_rating: null,
    is_combo: false,
    combo_product_ids: [],
    rating: null,
    review_count: 0,
    created_by: null,
    created_at: new Date(now - index * 60_000),
    updated_at: new Date(now - index * 60_000),
  })
  inserted += 1
}

const coupons = [
  ['SAVE10', 'percentage', 10, 1999],
  ['VELISQA5', 'percentage', 5, 1499],
  ['FREE50', 'fixed', 50, 999],
]
for (const [code, type, value, min] of coupons) {
  await db.collection(C.coupons).updateOne(
    { _id: code },
    { $setOnInsert: { _id: code, discount_type: type, discount_value: value, min_subtotal: min, active: true, created_at: new Date() } },
    { upsert: true },
  )
}
console.log(`seed: ${inserted} product(s) inserted, ${coupons.length} coupon(s) ensured`)
await closeDb()
