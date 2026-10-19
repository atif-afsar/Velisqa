import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { after, before, describe, test } from 'node:test'
import { agent, C, db, mongoTarget, startTestServer, stopTestServer } from '../helpers/testServer.js'

const run = promisify(execFile)
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

before(startTestServer)
after(stopTestServer)

const ids = {
  user: '6f1d2a3b-0000-4000-8000-000000000001',
  googleUser: '6f1d2a3b-0000-4000-8000-000000000002',
  product: '7a2b3c4d-0000-4000-8000-000000000001',
  deletedProduct: '7a2b3c4d-0000-4000-8000-0000000000ff',
  order: '8b3c4d5e-0000-4000-8000-000000000001',
  item: '9c4d5e6f-0000-4000-8000-000000000001',
  payment: 'ad5e6f70-0000-4000-8000-000000000001',
  review: 'be6f7081-0000-4000-8000-000000000001',
  ret: 'cf708192-0000-4000-8000-000000000001',
  retItem: 'd08192a3-0000-4000-8000-000000000001',
}
const legacyToken = 'e3b0c442-98fc-4c14-9afb-f4c8996fb924'

function writeExport(dir) {
  mkdirSync(dir, { recursive: true })
  const files = {
    auth_users: [
      { id: ids.user, email: 'Buyer@Example.test', created_at: '2026-05-01T10:00:00Z', email_confirmed_at: '2026-05-01T10:05:00Z', user_metadata: { full_name: 'Legacy Buyer' }, identities: [{ provider: 'email' }] },
      { id: ids.googleUser, email: 'g@example.test', created_at: '2026-06-01T10:00:00Z', user_metadata: { name: 'G User' }, identities: [{ provider: 'google', identity_data: { sub: '1029384756' } }] },
    ],
    // bcrypt of "legacyPass1" (cost 4), as stored in auth.users.encrypted_password
    auth_password_hashes: [[ids.user, '$2b$04$.0IH24qhOBqtesHR5QKXEO6ZJ5G5xMZtVu2mquq.8GDUzuKh4yF32']],
    profiles: [
      { id: ids.user, full_name: 'Legacy Buyer', email: 'buyer@example.test', role: 'user', created_at: '2026-05-01T10:00:00Z' },
      { id: ids.googleUser, full_name: 'G User', email: 'g@example.test', role: 'admin', created_at: '2026-06-01T10:00:00Z' },
    ],
    products: [
      { id: ids.product, name: 'Legacy Necklace', price: '499.00', mrp: 799, category: 'Necklace', stock: 4, out_of_stock: false, gallery_urls: '["https://x.supabase.co/storage/v1/object/public/product-images/a.webp"]', image_url: 'https://x.supabase.co/storage/v1/object/public/product-images/a.webp', styles: '{Everyday,Party}', search_keywords: [], rating: 4.9, review_count: 130, mock_rating: 4.9, mock_review_count: 120, combo_product_ids: [], created_at: '2026-04-01T00:00:00Z' },
    ],
    coupons: [{ code: 'save10', discount_type: 'percentage', discount_value: '10.00', min_subtotal: '1999.00', active: true, created_at: '2026-04-01T00:00:00Z' }],
    orders: [
      {
        id: ids.order, order_ref: 'VLQ-260501101500-AB12', user_id: ids.user, customer_name: 'Legacy Buyer', customer_phone: '9876543210', customer_email: 'buyer@example.test',
        delivery_address: '1 Old Road', delivery_city: 'Aligarh', delivery_pincode: '202001', payment_method: 'online', payment_status: 'paid', payment_gateway: 'razorpay',
        razorpay_order_id: 'order_legacy1', razorpay_payment_id: 'pay_legacy1', subtotal: '998.00', delivery_charge: '0.00', tax_amount: 0, discount_amount: 0, gift_wrap: false, gift_wrap_fee: 0,
        grand_total: '998.00', order_status: 'delivered', shipping_status: 'delivered', nimbuspost_awb: '1234567890', is_enquiry: false, order_access_token: legacyToken,
        delivered_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), created_at: '2026-05-01T10:15:00Z', updated_at: '2026-05-04T10:15:00Z',
      },
    ],
    order_items: [
      { id: ids.item, order_id: ids.order, product_id: ids.product, product_name: 'Legacy Necklace', product_url: `/product/${ids.product}`, unit_price: '499.00', quantity: 2, line_total: '998.00', is_free_gift: false, created_at: '2026-05-01T10:15:00Z' },
    ],
    payments: [{ id: ids.payment, order_id: ids.order, provider: 'razorpay', provider_order_id: 'order_legacy1', provider_payment_id: 'pay_legacy1', amount: '998.00', status: 'paid', signature_verified: true, created_at: '2026-05-01T10:16:00Z' }],
    payment_events: [],
    refunds: [],
    order_status_history: [],
    payment_review_logs: [],
    product_reviews: [{ id: ids.review, product_id: ids.product, user_id: ids.user, order_id: ids.order, rating: 4, title: 'Nice', body: 'Lovely necklace, as pictured.', reviewer_name: 'Legacy', image_urls: [], is_verified_purchase: true, status: 'approved', created_at: '2026-05-06T00:00:00Z' }],
    order_returns: [{ id: ids.ret, order_id: ids.order, user_id: ids.user, status: 'rejected', reason: 'Other', refund_amount: '998.00', requested_at: '2026-05-05T00:00:00Z' }],
    order_return_items: [{ id: ids.retItem, return_id: ids.ret, order_item_id: ids.item, quantity: 2 }],
  }
  for (const [name, rows] of Object.entries(files)) writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(rows))
}

async function script(name, args) {
  const { uri, dbName } = mongoTarget()
  try {
    return await run(process.execPath, [`scripts/${name}`, ...args], {
      cwd: backendDir,
      env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri, MONGODB_DB_NAME: dbName, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    })
  } catch (error) {
    return { stdout: error.stdout, stderr: error.stderr, code: error.code }
  }
}

describe('OPS-01 Supabase export → Mongo import (offline fixture)', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'velisqa-export-'))
  const reports = mkdtempSync(path.join(os.tmpdir(), 'velisqa-reports-'))

  test('dry run writes nothing', async () => {
    writeExport(dir)
    const out = await script('migrate-supabase.mjs', ['--from-dir', dir, '--report-file', path.join(reports, 'dry.json')])
    assert.match(out.stdout, /orders: exported 1/)
    assert.equal(await db().collection(C.orders).countDocuments({ _id: ids.order }), 0)
  })

  test('apply preserves ids/refs/money, links Google, carries bcrypt hashes; second run is a no-op', async () => {
    const first = await script('migrate-supabase.mjs', ['--from-dir', dir, '--apply', '--report-file', path.join(reports, 'a1.json')])
    assert.equal(first.code, undefined, first.stderr)
    const order = await db().collection(C.orders).findOne({ _id: ids.order })
    assert.equal(order.order_ref, 'VLQ-260501101500-AB12')
    assert.equal(order.grand_total, 998)
    assert.equal(order.stock_applied, true)
    assert.ok(order.access_token_hash && !JSON.stringify(order).includes(legacyToken))
    const user = await db().collection(C.users).findOne({ _id: ids.user })
    assert.equal(user.email, 'buyer@example.test')
    assert.match(user.password_hash, /^\$2[aby]\$/)
    assert.equal((await db().collection(C.users).findOne({ _id: ids.googleUser })).google_sub, '1029384756')
    assert.equal((await db().collection(C.coupons).findOne({ _id: 'SAVE10' })).min_subtotal, 1999)
    const product = await db().collection(C.products).findOne({ _id: ids.product })
    assert.deepEqual(product.styles, ['Everyday', 'Party'])
    assert.deepEqual([product.rating, product.review_count], [4, 1], 'aggregate recomputed from approved reviews only')

    const second = await script('migrate-supabase.mjs', ['--from-dir', dir, '--apply', '--report-file', path.join(reports, 'a2.json')])
    assert.match(second.stdout, /orders: exported 1, inserted 0, updated 0, unchanged 1/)
    assert.equal(await db().collection(C.orders).countDocuments({ order_ref: 'VLQ-260501101500-AB12' }), 1)
  })

  test('verify-migration reconciles counts, totals, references and samples', async () => {
    const out = await script('verify-migration.mjs', ['--from-dir', dir, '--report-file', path.join(reports, 'verify.json')])
    const { readFileSync } = await import('node:fs')
    const report = JSON.parse(readFileSync(path.join(reports, 'verify.json'), 'utf8'))
    assert.equal(report.counts.orders.source, 1)
    assert.equal(report.orderGrandTotal.target >= 998, true)
    assert.equal(report.sample.mismatches, 0)
    // The fixture still points at Supabase Storage, so the image check must flag it.
    assert.ok(report.problems.some((problem) => problem.type === 'supabase_images_remaining'))
    assert.ok(!report.problems.some((problem) => problem.type === 'sample_mismatch' || problem.type === 'dangling_reference'), JSON.stringify(report.problems))
    assert.equal(out.code, 2)
  })

  test('the old private link token and the old password both work against the new API', async () => {
    const client = await agent()
    const res = await client.get(`/api/v1/orders/private/VLQ-260501101500-AB12?token=${legacyToken}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.order.items[0].quantity, 2)

    const login = await client.post('/api/v1/auth/login').send({ email: 'buyer@example.test', password: 'legacyPass1' })
    assert.equal(login.status, 200, 'imported bcrypt hash verified')
    const mine = await client.get('/api/v1/orders/mine')
    assert.equal(mine.body.data.orders[0].order_access_token, legacyToken)
    // Delivered 2 days ago and the earlier return was rejected → eligible again.
    assert.equal((await client.get(`/api/v1/returns/eligibility?orderId=${ids.order}`)).body.data.eligible, true)
  })
})
