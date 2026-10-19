/**
 * Self-contained API for the browser (Playwright) tests in ../e2e.
 *
 *   node scripts/e2e-server.mjs        # listens on E2E_API_PORT (default 5198)
 *
 * Starts a throwaway in-memory MongoDB replica set (nothing is written to disk or to your
 * real database), seeds a small catalogue + coupons + an admin and a customer, and fakes
 * only the outbound provider HTTP:
 *   - Razorpay Orders API → returns order_e2e_<n>; checkout signatures are still verified
 *     for real with E2E_RAZORPAY_SECRET (the browser test signs like Razorpay does).
 *   - NimbusPost → books an AWB without calling the courier.
 * Test-only helpers are under /__e2e (only mounted by this script).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PORT = Number(process.env.E2E_API_PORT || 5198)
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 5199)
export const E2E = {
  razorpayKey: 'rzp_test_e2e',
  razorpaySecret: 'e2e_razorpay_secret',
  razorpayWebhookSecret: 'e2e_razorpay_webhook_secret',
  nimbusWebhookSecret: 'e2e_nimbus_webhook_secret',
  admin: { email: 'admin@e2e.test', password: 'E2eAdminPass123' },
  customer: { email: 'shopper@e2e.test', password: 'E2eShopperPass123' },
}

// Environment must be set before the app modules read it (dotenv never overrides these).
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: String(PORT),
  HOST: '127.0.0.1',
  FRONTEND_ORIGIN: `http://localhost:${WEB_PORT}`,
  CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${WEB_PORT}`,
  PUBLIC_API_ORIGIN: `http://localhost:${PORT}`,
  RAZORPAY_KEY_ID: E2E.razorpayKey,
  RAZORPAY_KEY_SECRET: E2E.razorpaySecret,
  RAZORPAY_WEBHOOK_SECRET: E2E.razorpayWebhookSecret,
  NIMBUSPOST_API_KEY: 'e2e_nimbus_key',
  NIMBUSPOST_API_SECRET: 'e2e_nimbus_secret',
  NIMBUSPOST_WAREHOUSE_ID: '1',
  NIMBUSPOST_AUTO_SHIP: 'false',
  NIMBUSPOST_WEBHOOK_SECRET: E2E.nimbusWebhookSecret,
  MEDIA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'velisqa-e2e-media-')),
  ANTHROPIC_API_KEY: '',
  CLOUDINARY_CLOUD_NAME: '',
  SMTP_HOST: '',
  META_ACCESS_TOKEN: '',
})

const { MongoMemoryReplSet } = await import('mongodb-memory-server')
const { C, connectDb, closeDb, ensureIndexes } = await import('../src/config/db.js')
const { createApp } = await import('../src/app.js')
const { hashPassword, uuid } = await import('../src/lib/crypto.js')
const { setRazorpayFetch } = await import('../src/providers/razorpay.js')
const { setNimbusFetch } = await import('../src/providers/nimbuspost.js')

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
const db = await connectDb(replSet.getUri(), 'velisqa_e2e')
await ensureIndexes()

// ── Provider fakes ──
let razorpayOrders = 0
setRazorpayFetch(async (url, options = {}) => {
  if (url.endsWith('/v1/orders') && options.method === 'POST') {
    const body = JSON.parse(options.body)
    razorpayOrders += 1
    return Response.json({ id: `order_e2e_${Date.now()}_${razorpayOrders}`, entity: 'order', amount: body.amount, currency: body.currency, receipt: body.receipt, status: 'created' })
  }
  return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
})
let awb = 7700000000000
setNimbusFetch(async (url, options = {}) => {
  if ((options.method || 'GET') === 'GET') return new Response('{}', { status: 404 })
  if (url.endsWith('/v2/shipments')) {
    awb += 1
    return Response.json({ status: true, data: { order_id: `NP${awb}`, shipment_id: `SH${awb}`, awb_number: String(awb), courier_name: 'Delhivery' } })
  }
  if (url.endsWith('/v2/shipments/cancel')) return Response.json({ status: true })
  return new Response('{}', { status: 404 })
})

// ── Seed ──
const now = Date.now()
const PRODUCTS = [
  // name, category, price, mrp, stock, image
  ['E2E Aurelia Layered Necklace', 'Necklace', 899, 1299, 25, 1],
  ['E2E Celeste Pendant Necklace', 'Necklace', 1299, 1799, 25, 3],
  ['E2E Luna Drop Earrings', 'Earrings', 349, 499, 25, 4],
  ['E2E Solace Stacking Ring', 'Rings', 249, 399, 25, 6],
  ['E2E Iris Chain Bracelet', 'Bracelet', 449, 699, 25, 8],
  ['E2E Saanvi Kada Bangle', 'Bangles', 599, 999, 25, 9],
  ['E2E Last Piece Ring', 'Rings', 299, 499, 1, 7],
  ['E2E Sold Out Earrings', 'Earrings', 399, 599, 0, 5],
  ['E2E Free Gift Studs', 'Earrings', 199, 399, 50, 2],
  // Only the admin tests edit/delete these, so other suites never see them change.
  ['E2E Admin Edit Pendant', 'Necklace', 649, 999, 10, 3],
  ['E2E Admin Delete Anklet', 'Bracelet', 299, 499, 10, 8],
]
await db.collection(C.products).insertMany(
  PRODUCTS.map(([name, category, price, mrp, stock, img], index) => ({
    _id: uuid(),
    name,
    price,
    mrp,
    description: `${name} — fixture for browser tests.`,
    category,
    metal: 'Gold plated',
    colour: 'Gold',
    styles: ['Everyday'],
    search_keywords: [category.toLowerCase()],
    stock,
    out_of_stock: stock === 0,
    badge: index === 0 ? 'bestseller' : null,
    image_url: `/images/img${img}.webp`,
    hover_image_url: null,
    gallery_urls: [`/images/img${img}.webp`],
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
  })),
)
await db.collection(C.coupons).insertMany([
  { _id: 'E2E10', discount_type: 'percentage', discount_value: 10, min_subtotal: 500, active: true, created_at: new Date() },
  { _id: 'E2EOFF', discount_type: 'fixed', discount_value: 100, min_subtotal: 0, active: false, created_at: new Date() },
])

async function createUser({ email, password, role, name }) {
  const _id = uuid()
  const at = new Date()
  await db.collection(C.users).insertOne({ _id, email, password_hash: await hashPassword(password), google_sub: null, email_verified: true, full_name: name, disabled: false, created_at: at, updated_at: at })
  await db.collection(C.profiles).insertOne({ _id, email, role, full_name: name, created_at: at })
  return _id
}
await createUser({ ...E2E.admin, role: 'admin', name: 'E2E Admin' })
await createUser({ ...E2E.customer, role: 'user', name: 'E2E Shopper' })

// ── App + test-only helpers ──
const express = (await import('express')).default
const server = express()
server.get('/__e2e/config', (_req, res) => res.json(E2E))
server.get('/__e2e/order/:ref', async (req, res) => {
  const order = await db.collection(C.orders).findOne({ order_ref: req.params.ref })
  res.json(order || null)
})
server.use(createApp())
const listener = server.listen(PORT, '127.0.0.1', () => console.log(`E2E API ready on http://localhost:${PORT} (in-memory MongoDB)`))

async function shutdown() {
  listener.close()
  await closeDb().catch(() => {})
  await replSet.stop().catch(() => {})
  fs.rmSync(process.env.MEDIA_DIR, { recursive: true, force: true })
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
