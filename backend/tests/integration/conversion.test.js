import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { after, before, describe, test } from 'node:test'
// Meta "configured" for this file only; every Graph API call is captured by the stub below.
process.env.META_PIXEL_ID = '1153920800236745'
process.env.META_CONVERSIONS_API_TOKEN = 'test-token'
const { agent, C, createProduct, customer, db, placeOrder, sentEmails, signedInAgent, startTestServer, stopTestServer } = await import('../helpers/testServer.js')
const { setMetaFetch } = await import('../../src/providers/meta.js')
const metaSent = []
setMetaFetch(async (_url, opts) => {
  metaSent.push(JSON.parse(opts.body))
  return { ok: true, json: async () => ({ events_received: 1 }) }
})

before(async () => {
  await startTestServer()
})
after(stopTestServer)

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex')

describe('P0-4 catalogue rules', () => {
  test('publishing needs MRP, category and a unique name; hidden drafts are allowed and stay off the storefront', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const base = { name: 'Gold-Tone Twisted Multi-Loop Bangle', price: 599, mrp: 1199, category: 'Bangles' }

    const noMrp = await admin.post('/api/v1/admin/products').send({ ...base, mrp: null })
    assert.equal(noMrp.status, 400)
    assert.match(noMrp.body.error.message, /MRP/)
    assert.equal((await admin.post('/api/v1/admin/products').send({ ...base, category: null })).status, 400)

    const created = await admin.post('/api/v1/admin/products').send(base)
    assert.equal(created.status, 201)
    const dupe = await admin.post('/api/v1/admin/products').send({ ...base, name: '  gold-tone twisted   multi-loop bangle ' })
    assert.equal(dupe.status, 409, 'names are unique ignoring case and spacing')

    const draft = await admin.post('/api/v1/admin/products').send({ ...base, mrp: null, hidden: true })
    assert.equal(draft.status, 201, 'hidden drafts may be incomplete and duplicate')
    const draftId = draft.body.data.product.id
    const anon = await agent()
    assert.ok(!(await anon.get('/api/v1/products')).body.data.products.some((p) => p.id === draftId))
    assert.equal((await anon.get(`/api/v1/products/${draftId}`)).status, 404)

    // Hidden products cannot be bought.
    const order = await placeOrder(anon, { items: [{ productId: draftId, quantity: 1 }] })
    assert.equal(order.status, 409)

    // Clearing the MRP of a published product is refused; other edits to legacy products without MRP still work.
    const id = created.body.data.product.id
    assert.equal((await admin.patch(`/api/v1/admin/products/${id}`).send({ mrp: null })).status, 400)
    const legacy = await createProduct({ name: 'Legacy Ring', mrp: null, category: 'Rings' })
    assert.equal((await admin.patch(`/api/v1/admin/products/${legacy._id}`).send({ stock: 4 })).status, 200)
  })
})

describe('P1-1 public offers', () => {
  test('only active, shared coupons ticked "show on site" are public', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    await admin.post('/api/v1/admin/coupons').send({ code: 'VELI10', discount_type: 'percentage', discount_value: 10, show_on_site: true, label: '10% off everything' })
    await admin.post('/api/v1/admin/coupons').send({ code: 'SECRET5', discount_type: 'percentage', discount_value: 5 })
    await db().collection(C.coupons).insertOne({ _id: 'COMEBACK-X', discount_type: 'percentage', discount_value: 10, active: true, show_on_site: true, single_use: true, email: 'a@b.c', created_at: new Date() })
    const res = await (await agent()).get('/api/v1/offers')
    assert.equal(res.status, 200)
    const codes = res.body.data.offers.map((o) => o.code)
    assert.deepEqual(codes, ['VELI10'])
    assert.equal(res.body.data.offers[0].label, '10% off everything')

    await admin.patch('/api/v1/admin/coupons/VELI10').send({ show_on_site: false })
    assert.equal((await (await agent()).get('/api/v1/offers')).body.data.offers.length, 0)
  })
})

describe('P0-3 Meta CAPI matching', () => {
  test('orders store tracking context (never exposed) and Purchase carries hashed customer data', async () => {
    const product = await createProduct({ price: 400 })
    const client = await agent()
    const res = await client
      .post('/api/v1/orders')
      .set('User-Agent', 'TestBrowser/1.0')
      .send({
        customer: customer({ giftWrap: true, giftMessage: 'Happy birthday!', giftReceipt: true }),
        items: [{ productId: product._id, quantity: 2 }],
        tracking: { fbp: 'fb.1.1700000000000.123', fbc: 'fb.1.1700000000000.abc', test_event_code: 'TEST123' },
      })
    assert.equal(res.status, 201)
    const order = await db().collection(C.orders).findOne({ order_ref: res.body.data.order_ref })
    assert.equal(order.tracking.fbp, 'fb.1.1700000000000.123')
    assert.equal(order.tracking.client_user_agent, 'TestBrowser/1.0')
    assert.equal(order.gift_message, 'Happy birthday!')
    assert.equal(order.gift_receipt, true)

    const { buildUserData } = await import('../../src/providers/meta.js')
    const ud = buildUserData({ email: ' Asha@Example.test ', phone: '98765 43210', name: 'Asha Verma', city: 'New Delhi', state: 'Delhi', zip: '110001', ip: '1.2.3.4', fbp: 'x' })
    assert.deepEqual(ud.em, [sha('asha@example.test')])
    assert.deepEqual(ud.ph, [sha('919876543210')])
    assert.deepEqual(ud.fn, [sha('asha')])
    assert.deepEqual(ud.ln, [sha('verma')])
    assert.deepEqual(ud.ct, [sha('newdelhi')])
    assert.deepEqual(ud.country, [sha('in')])
    assert.equal(ud.client_ip_address, '1.2.3.4')

    // Full Purchase payload through the provider with a stubbed Graph API.
    const { recordAndSendMetaPurchase } = await import('../../src/services/metaService.js')
    metaSent.length = 0
    await recordAndSendMetaPurchase(order)
    const event = metaSent[0].data[0]
    assert.equal(metaSent[0].test_event_code, 'TEST123')
    assert.equal(event.event_id, order.order_ref)
    assert.equal(event.user_data.client_user_agent, 'TestBrowser/1.0')
    assert.equal(event.user_data.fbc, 'fb.1.1700000000000.abc')
    assert.ok(event.user_data.em && event.user_data.ph && event.user_data.zp && event.user_data.external_id)
    assert.deepEqual(event.custom_data.contents, [{ id: product._id, quantity: 2, item_price: 400 }])
    assert.equal(event.custom_data.num_items, 2)

    // Serializers never leak tracking.
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const list = await admin.get('/api/v1/admin/orders')
    const row = (list.body.data.orders || []).find((o) => o.order_ref === order.order_ref)
    if (row) assert.equal(row.tracking, undefined)
  })

  test('AddToCart server copies reach CAPI with the same event_id plus IP and user agent', async () => {
    metaSent.length = 0
    const res = await (await agent()).post('/api/v1/events/meta-conversions').set('User-Agent', 'UA/2').send({
      event_name: 'AddToCart',
      event_id: 'atc_123',
      custom_data: { currency: 'INR', value: 399, content_type: 'product', content_ids: ['p1'] },
    })
    assert.equal(res.status, 200)
    const event = metaSent[0].data[0]
    assert.equal(event.event_name, 'AddToCart')
    assert.equal(event.event_id, 'atc_123')
    assert.equal(event.user_data.client_user_agent, 'UA/2')
    assert.ok(event.user_data.client_ip_address)
    assert.equal(event.custom_data.value, 399)
  })
})

describe('P0-6 review requests', () => {
  test('delivered orders get one email; the signed link lets the buyer review without logging in', async () => {
    const product = await createProduct({ price: 450 })
    const client = await agent()
    const placed = await placeOrder(client, { items: [{ productId: product._id, quantity: 1 }], customer: customer({ email: 'buyer@example.test' }) })
    const ref = placed.body.data.order_ref
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000)
    await db().collection(C.orders).updateOne({ order_ref: ref }, { $set: { order_status: 'delivered', shipping_status: 'delivered', delivered_at: sixDaysAgo } })

    const { runReviewRequestSweep, reviewToken } = await import('../../src/services/reviewRequestService.js')
    const before = sentEmails.length
    const summary = await runReviewRequestSweep()
    assert.ok(summary.sent >= 1)
    const mail = sentEmails.slice(before).find((m) => (Array.isArray(m.to) ? m.to : [m.to]).includes('buyer@example.test'))
    assert.ok(mail, 'review email sent')
    assert.match(mail.html, new RegExp(`/review/${ref}\\?t=`))
    await runReviewRequestSweep()
    assert.equal(sentEmails.slice(before).filter((m) => (Array.isArray(m.to) ? m.to : [m.to]).includes('buyer@example.test')).length, 1, 'sent once')

    const order = await db().collection(C.orders).findOne({ order_ref: ref })
    const t = reviewToken(order)
    const anon = await agent()
    assert.equal((await anon.get(`/api/v1/review-requests/${ref}`).query({ t: 'x'.repeat(40) })).status, 403)
    const info = await anon.get(`/api/v1/review-requests/${ref}`).query({ t })
    assert.equal(info.status, 200)
    assert.equal(info.body.data.items[0].productId, product._id)

    const submit = await anon.post(`/api/v1/review-requests/${ref}`).send({ t, reviews: [{ productId: product._id, rating: 5, title: 'Love it', body: 'Beautiful finish and quick delivery.' }] })
    assert.equal(submit.status, 201)
    const review = await db().collection(C.productReviews).findOne({ product_id: product._id })
    assert.equal(review.status, 'pending')
    assert.equal(review.is_verified_purchase, true)
    assert.equal((await anon.post(`/api/v1/review-requests/${ref}`).send({ t, reviews: [{ productId: product._id, rating: 4, title: 'Again', body: 'Trying to review twice.' }] })).status, 409)
  })
})
