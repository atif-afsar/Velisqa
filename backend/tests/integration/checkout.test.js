import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { agent, C, createProduct, customer, db, placeOrder, startTestServer, stopTestServer } from '../helpers/testServer.js'

before(startTestServer)
after(stopTestServer)

let client
beforeEach(async () => {
  client = await agent()
  await db().collection(C.coupons).deleteMany({})
  await db().collection(C.coupons).insertMany([
    { _id: 'SAVE10', discount_type: 'percentage', discount_value: 10, min_subtotal: 1999, active: true, created_at: new Date() },
    { _id: 'FREE50', discount_type: 'fixed', discount_value: 50, min_subtotal: 999, active: true, created_at: new Date() },
    { _id: 'OLD', discount_type: 'fixed', discount_value: 100, min_subtotal: 0, active: false, created_at: new Date() },
  ])
})

const quote = (body) => client.post('/api/v1/checkout/quote').send(body)

describe('CART-03 server pricing parity (consolidated_checkout.sql)', () => {
  test('online: subtotal only; COD: +₹50 fee +2% of (subtotal − discount) rounded; gift wrap ₹50', async () => {
    const p = await createProduct({ price: 999 })
    const online = await quote({ items: [{ productId: p._id, quantity: 1 }] })
    assert.equal(online.status, 200)
    assert.equal(online.body.data.grandTotal, 999)

    const cod = await quote({ items: [{ productId: p._id, quantity: 1 }], paymentMethod: 'cod', giftWrap: true })
    // 999 + 50 wrap + 50 COD + round(999 * 0.02 = 19.98) = 20
    assert.deepEqual(
      { tax: cod.body.data.tax, codFee: cod.body.data.codFee, wrap: cod.body.data.giftWrapFee, total: cod.body.data.grandTotal },
      { tax: 20, codFee: 50, wrap: 50, total: 1119 },
    )
  })

  test('client-supplied prices are ignored', async () => {
    const p = await createProduct({ price: 750 })
    const res = await quote({ items: [{ productId: p._id, quantity: 2, price: 1, unitPrice: 1, lineTotal: 2 }] })
    assert.equal(res.body.data.subtotal, 1500)
  })

  test('coupons: min subtotal, percentage whole-rupee rounding, fixed, inactive', async () => {
    const p = await createProduct({ price: 1999.5 })
    const save10 = await quote({ items: [{ productId: p._id, quantity: 1 }], couponCode: 'save10' })
    assert.equal(save10.body.data.couponCode, 'SAVE10')
    assert.equal(save10.body.data.discount, 200) // round(199.95)

    const small = await createProduct({ price: 998 })
    const below = await quote({ items: [{ productId: small._id, quantity: 1 }], couponCode: 'FREE50' })
    assert.equal(below.body.data.discount, 0)
    assert.equal(below.body.data.couponCode, null)

    const atMin = await createProduct({ price: 999 })
    const fixed = await quote({ items: [{ productId: atMin._id, quantity: 1 }], couponCode: 'FREE50' })
    assert.equal(fixed.body.data.discount, 50)
    assert.equal(fixed.body.data.grandTotal, 949)

    const inactive = await quote({ items: [{ productId: atMin._id, quantity: 1 }], couponCode: 'OLD' })
    assert.equal(inactive.body.data.discount, 0)
  })

  test('free gift: allowed at ₹1,299, refused at ₹1,298, refused above ₹400 value, only one gift', async () => {
    const gift = await createProduct({ name: 'Studs', price: 400 })
    const pricey = await createProduct({ name: 'Ring', price: 401 })
    const at1298 = await createProduct({ price: 1298 })
    const at1299 = await createProduct({ price: 1299 })

    const ok = await quote({ items: [{ productId: at1299._id, quantity: 1 }, { productId: gift._id, quantity: 3, isFreeGift: true }] })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.data.grandTotal, 1299)
    const giftLine = ok.body.data.items.find((item) => item.isFreeGift)
    assert.deepEqual({ qty: giftLine.quantity, price: giftLine.lineTotal }, { qty: 1, price: 0 })

    const low = await quote({ items: [{ productId: at1298._id, quantity: 1 }, { productId: gift._id, isFreeGift: true }] })
    assert.equal(low.status, 409)
    const tooValuable = await quote({ items: [{ productId: at1299._id, quantity: 1 }, { productId: pricey._id, isFreeGift: true }] })
    assert.equal(tooValuable.status, 409)
    const synthetic = await quote({ items: [{ productId: at1299._id, quantity: 1 }, { productId: 'VELISQA_FREE_GIFT', isFreeGift: true }] })
    assert.equal(synthetic.status, 409, 'synthetic gift ids are never honoured')
  })

  test('stock is checked on the aggregated quantity across duplicate lines', async () => {
    const p = await createProduct({ stock: 3 })
    const res = await quote({ items: [{ productId: p._id, quantity: 2 }, { productId: p._id, quantity: 2 }] })
    assert.equal(res.status, 409)
    const oos = await createProduct({ stock: 5, out_of_stock: true })
    assert.equal((await quote({ items: [{ productId: oos._id, quantity: 1 }] })).status, 409)
  })
})

describe('CART-02 coupon lookup', () => {
  test('active coupon is returned, inactive/unknown are 404', async () => {
    assert.equal((await client.get('/api/v1/coupons/free50')).body.data.coupon.code, 'FREE50')
    assert.equal((await client.get('/api/v1/coupons/OLD')).status, 404)
    assert.equal((await client.get('/api/v1/coupons/NOPE')).status, 404)
  })
})

describe('ORD-01 / ORD-02 order creation', () => {
  test('COD order persists server totals, reserves stock once, returns legacy wire shape', async () => {
    const p = await createProduct({ price: 600, stock: 5 })
    const res = await placeOrder(client, { items: [{ productId: p._id, quantity: 2, price: 1 }], customer: customer({ paymentMethod: 'cod', giftWrap: true }) })
    assert.equal(res.status, 201)
    const { order_ref: ref, access_token: token, grand_total: total, payment_status: status } = res.body.data
    assert.match(ref, /^VLQ-\d{12}-[0-9A-F]{4}$/)
    assert.match(token, /^[0-9a-f-]{36}$/)
    assert.equal(total, 1200 + 50 + 50 + 24)
    assert.equal(status, 'pending')

    const order = await db().collection(C.orders).findOne({ order_ref: ref })
    assert.equal(order.access_token_hash.length, 64)
    assert.ok(!JSON.stringify(order).includes(token), 'raw token is never stored')
    assert.equal(order.delivery_charge, 50)
    assert.equal(order.tax_amount, 24)
    assert.equal((await db().collection(C.products).findOne({ _id: p._id })).stock, 3)
    assert.equal(await db().collection(C.orderItems).countDocuments({ order_id: order._id }), 1)
  })

  test('online order starts awaiting_payment and does not touch stock yet', async () => {
    const p = await createProduct({ stock: 4 })
    const res = await placeOrder(client, { items: [{ productId: p._id, quantity: 1 }], customer: customer({ paymentMethod: 'online' }) })
    assert.equal(res.body.data.payment_status, 'awaiting_payment')
    assert.equal((await db().collection(C.products).findOne({ _id: p._id })).stock, 4)
  })

  test('20 concurrent buyers of the last unit: exactly one succeeds, stock never negative', async () => {
    const p = await createProduct({ stock: 1 })
    const buyers = await Promise.all(Array.from({ length: 20 }, () => agent()))
    const results = await Promise.all(buyers.map((buyer) => placeOrder(buyer, { items: [{ productId: p._id, quantity: 1 }] })))
    const created = results.filter((res) => res.status === 201)
    assert.equal(created.length, 1, `statuses: ${results.map((r) => r.status).join(',')}`)
    assert.ok(results.every((res) => res.status === 201 || res.status === 409))
    assert.equal((await db().collection(C.products).findOne({ _id: p._id })).stock, 0)
  })

  test('idempotency key: retry returns the same order; different payload with same key is refused', async () => {
    const p = await createProduct({ stock: 10 })
    const key = 'checkout-key-0001'
    const first = await placeOrder(client, { items: [{ productId: p._id, quantity: 1 }], idempotencyKey: key })
    const retry = await placeOrder(client, { items: [{ productId: p._id, quantity: 1 }], idempotencyKey: key })
    assert.equal(first.status, 201)
    assert.equal(retry.status, 200)
    assert.equal(retry.body.data.order_ref, first.body.data.order_ref)
    assert.equal(retry.body.data.access_token, first.body.data.access_token)
    assert.equal(await db().collection(C.orders).countDocuments({ idempotency_key: key }), 1)
    assert.equal((await db().collection(C.products).findOne({ _id: p._id })).stock, 9, 'stock reserved once')

    const conflicting = await placeOrder(client, { items: [{ productId: p._id, quantity: 3 }], idempotencyKey: key })
    assert.equal(conflicting.status, 409)
  })

  test('validation: empty bag, bad PIN, missing name', async () => {
    const p = await createProduct()
    assert.equal((await placeOrder(client, { items: [] })).status, 422)
    assert.equal((await placeOrder(client, { items: [{ productId: p._id }], customer: customer({ pincode: '12345' }) })).status, 422)
    assert.equal((await placeOrder(client, { items: [{ productId: p._id }], customer: customer({ name: '  ' }) })).status, 422)
  })

  test('signed-in checkout links the order to the user', async () => {
    const { signedInAgent } = await import('../helpers/testServer.js')
    const { client: authed, user } = await signedInAgent()
    const p = await createProduct()
    const res = await placeOrder(authed, { items: [{ productId: p._id }] })
    const order = await db().collection(C.orders).findOne({ order_ref: res.body.data.order_ref })
    assert.equal(order.user_id, user.id)
  })
})
