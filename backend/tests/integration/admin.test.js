import assert from 'node:assert/strict'
import http from 'node:http'
import { after, before, describe, test } from 'node:test'
import { agent, C, createProduct, customer, db, placeOrder, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

let app
before(async () => {
  app = await startTestServer()
})
after(stopTestServer)

describe('CAT-03 / ADMIN-02 product CRUD', () => {
  test('create → public listing → update → toggle out of stock → delete', async () => {
    const { client: admin, user } = await signedInAgent({ role: 'admin' })
    const payload = {
      name: 'Aurora Hoops', price: 1299, mrp: 1999, description: 'Hoops', category: 'earrings', metal: 'Gold plated', colour: 'Gold',
      styles: ['Everyday', 'Party'], search_keywords: ['hoop'], stock: 7, out_of_stock: false, badge: 'new',
      image_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/a.jpg', hover_image_url: null,
      gallery_urls: ['https://res.cloudinary.com/demo-cloud/image/upload/v1/a.jpg'], cloudinary_public_id: 'velisqa/products/a',
      gallery_cloudinary_ids: ['velisqa/products/a'], hover_cloudinary_public_id: null, mock_review_count: 12, mock_rating: 4.5,
      is_combo: false, combo_product_ids: [],
    }
    const created = await admin.post('/api/v1/admin/products').send(payload)
    assert.equal(created.status, 201)
    const id = created.body.data.product.id
    assert.equal(created.body.data.product.created_by, user.id)

    const publicList = await (await agent()).get('/api/v1/products')
    const listed = publicList.body.data.products.find((p) => p.id === id)
    assert.equal(listed.name, 'Aurora Hoops')
    assert.equal(listed.mock_review_count, undefined)

    const bad = await admin.patch(`/api/v1/admin/products/${id}`).send({ price: 3000, mrp: 1000 })
    assert.equal(bad.status, 422)
    const updated = await admin.patch(`/api/v1/admin/products/${id}`).send({ price: 1499, styles: ['Office'] })
    assert.equal(updated.body.data.product.price, 1499)
    const toggled = await admin.patch(`/api/v1/admin/products/${id}`).send({ out_of_stock: true, stock: 7 })
    assert.equal(toggled.body.data.product.out_of_stock, true)
    const adminList = await admin.get('/api/v1/admin/products')
    assert.equal(adminList.body.data.products.find((p) => p.id === id).mock_rating, 4.5)

    assert.equal((await admin.delete(`/api/v1/admin/products/${id}`)).status, 200)
    assert.equal((await (await agent()).get(`/api/v1/products/${id}`)).status, 404)
    assert.ok(await db().collection(C.adminAuditLogs).findOne({ action: 'product.delete', target_id: id }))
  })
})

describe('ADMIN-05 coupons', () => {
  test('create, duplicate, toggle, delete', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const res = await admin.post('/api/v1/admin/coupons').send({ code: 'fest20', discount_type: 'percentage', discount_value: 20, min_subtotal: 1500, active: true })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.coupon.code, 'FEST20')
    assert.equal((await admin.post('/api/v1/admin/coupons').send({ code: 'FEST20', discount_type: 'fixed', discount_value: 5 })).status, 409)
    assert.equal((await admin.post('/api/v1/admin/coupons').send({ code: 'X', discount_type: 'percentage', discount_value: 150 })).status, 422)
    const toggled = await admin.patch('/api/v1/admin/coupons/fest20').send({ active: false })
    assert.equal(toggled.body.data.coupon.active, false)
    assert.equal((await (await agent()).get('/api/v1/coupons/FEST20')).status, 404, 'inactive coupons are not public')
    assert.ok((await admin.get('/api/v1/admin/coupons')).body.data.coupons.some((c) => c.code === 'FEST20'))
    assert.equal((await admin.delete('/api/v1/admin/coupons/FEST20')).status, 200)
    assert.equal((await admin.delete('/api/v1/admin/coupons/FEST20')).status, 404)
  })
})

describe('ADMIN-03 / ADMIN-04 order + payment lists', () => {
  test('pagination beyond 50 with exact count, online-only payments view, soft delete hides the order', async () => {
    const product = await createProduct({ stock: 1000 })
    const shopper = await agent()
    for (let i = 0; i < 55; i += 1) {
      await placeOrder(shopper, { items: [{ productId: product._id }], customer: customer({ paymentMethod: i % 5 === 0 ? 'online' : 'cod' }) })
    }
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const page1 = await admin.get('/api/v1/admin/orders?offset=0&limit=50')
    assert.equal(page1.body.data.orders.length, 50)
    assert.equal(page1.body.data.total, 55)
    const page2 = await admin.get('/api/v1/admin/orders?offset=50&limit=50')
    assert.equal(page2.body.data.orders.length, 5)
    const first = page1.body.data.orders[0]
    assert.ok(first.order_items.length === 1 && first.order_access_token, 'admin can copy the private tracking link')

    const payments = await admin.get('/api/v1/admin/payments?offset=0&limit=50')
    assert.equal(payments.body.data.total, 11)
    assert.ok(payments.body.data.orders.every((o) => o.payment_method === 'online'))

    assert.equal((await admin.delete(`/api/v1/admin/orders/${first.id}`)).status, 200)
    assert.equal((await admin.get('/api/v1/admin/orders?offset=0&limit=50')).body.data.total, 54)
    assert.ok(await db().collection(C.orders).findOne({ _id: first.id, deleted_at: { $ne: null } }), 'record retained for reconciliation')
  })
})

describe('ADMIN-01 inbox and live order events', () => {
  test('inbox counts match the old client-side rules', async () => {
    await db().collection(C.orders).deleteMany({})
    const product = await createProduct({ stock: 100 })
    const shopper = await agent()
    await placeOrder(shopper, { items: [{ productId: product._id }], customer: customer({ paymentMethod: 'cod' }) }) // needs shipment
    await placeOrder(shopper, { items: [{ productId: product._id }], customer: customer({ paymentMethod: 'online' }) }) // awaiting payment
    const bogus = await placeOrder(shopper, { items: [{ productId: product._id }], customer: customer({ paymentMethod: 'cod', phone: '12345' }) })
    assert.equal(bogus.status, 201)
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const inbox = await admin.get('/api/v1/admin/inbox')
    assert.equal(inbox.status, 200)
    const { counts } = inbox.body.data
    assert.equal(counts.needsShipment, 1, 'invalid phone excluded like orderNeedsShipment()')
    assert.equal(counts.awaitingUpi, 1)
    assert.equal(counts.totalOpen, counts.paymentReviews + counts.needsShipment + counts.pendingReviews + counts.pendingReturns)
    assert.equal(inbox.body.data.recentOrders.length, 3)
    const { stats } = inbox.body.data
    assert.equal(stats.today.orders, 3, 'all three orders were placed today')
    assert.equal(stats.week.orders, 3)
    assert.ok(stats.today.revenue > 0 && stats.avgOrderValue > 0)
  })

  test('SSE stream delivers a new order to signed-in admins', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const cookie = (await admin.raw.get('/api/v1/auth/me')).request.cookies
    const server = app.listen(0)
    const { port } = server.address()
    let req
    const received = await new Promise((resolve, reject) => {
      req = http.get({ port, path: '/api/v1/admin/events', headers: { Cookie: cookie, Origin: 'http://localhost:5173' } }, (res) => {
        if (!/^text\/event-stream/.test(res.headers['content-type'] || '')) return reject(new Error(`bad content-type ${res.headers['content-type']} (${res.statusCode})`))
        let buffer = ''
        res.on('data', (chunk) => {
          buffer += chunk
          if (buffer.includes('event: order')) {
            req.destroy()
            resolve(buffer)
          }
        })
        setTimeout(async () => {
          const product = await createProduct()
          await placeOrder(await agent(), { items: [{ productId: product._id }] })
        }, 100)
      })
      req.on('error', (error) => (error.code === 'ECONNRESET' ? null : reject(error)))
      setTimeout(() => reject(new Error('no SSE event')), 10_000).unref()
    }).finally(() => {
      req?.destroy()
      server.closeAllConnections()
      server.close()
    })
    assert.match(received, /"order_ref":"VLQ-/)
  })
})

describe('Dashboard date range', () => {
  test('summary for a range: totals, split, daily series, list; invalid ranges refused', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const start = new Date(Date.now() - 86_400_000).toISOString()
    const end = new Date(Date.now() + 60_000).toISOString()
    const res = await admin.get(`/api/v1/admin/dashboard/summary?start=${start}&end=${end}`)
    assert.equal(res.status, 200)
    const data = res.body.data
    assert.ok(data.orders > 0)
    assert.equal(data.cod.orders + data.online.orders, data.orders)
    assert.equal(data.daily.reduce((sum, day) => sum + day.orders, 0), data.orders)
    assert.match(data.daily[0].date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok('revenue' in data.previous && 'orders' in data.previous)
    const statusTotal = Object.values(data.status).reduce((sum, n) => sum + n, 0)
    assert.equal(statusTotal, data.listTotal, 'every order lands in exactly one status bucket')
    assert.ok(Array.isArray(data.topProducts) && data.topProducts.length > 0)
    assert.ok(data.topProducts[0].units > 0 && data.topProducts[0].revenue > 0)
    assert.ok(data.list.length > 0 && data.list[0].order_ref)
    const empty = await admin.get('/api/v1/admin/dashboard/summary?start=2001-01-01&end=2001-01-02')
    assert.deepEqual([empty.body.data.orders, empty.body.data.revenue, empty.body.data.list.length], [0, 0, 0])
    assert.equal((await admin.get(`/api/v1/admin/dashboard/summary?start=${end}&end=${start}`)).status, 422)
  })
})

describe('ADMIN-06 analytics', () => {
  test('returns orders in range with line items', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const start = new Date(Date.now() - 86_400_000).toISOString()
    const end = new Date(Date.now() + 60_000).toISOString()
    const res = await admin.get(`/api/v1/admin/analytics/orders?start=${start}&end=${end}`)
    assert.equal(res.status, 200)
    assert.ok(res.body.data.orders.length > 0)
    assert.ok(Array.isArray(res.body.data.orders[0].order_items))
    const empty = await admin.get('/api/v1/admin/analytics/orders?start=2001-01-01&end=2001-01-02')
    assert.equal(empty.body.data.orders.length, 0)
  })
})

describe('CAT-04 signed uploads', () => {
  test('admins can sign product uploads; customers only review uploads; anonymous none', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const signed = await admin.post('/api/v1/uploads/signature').send({ purpose: 'product' })
    assert.equal(signed.status, 200)
    assert.equal(signed.body.data.folder, 'velisqa/products')
    assert.match(signed.body.data.signature, /^[0-9a-f]{40}$/)
    assert.equal(signed.body.data.apiSecret, undefined)

    const { client: shopper } = await signedInAgent()
    assert.equal((await shopper.post('/api/v1/uploads/signature').send({ purpose: 'product' })).status, 403)
    assert.equal((await shopper.post('/api/v1/uploads/signature').send({ purpose: 'review' })).body.data.folder, 'velisqa/reviews')
    assert.equal((await (await agent()).post('/api/v1/uploads/signature').send({ purpose: 'review' })).status, 401)
  })
})
