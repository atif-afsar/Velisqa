import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { after, before, beforeEach, describe, test } from 'node:test'
import { agent, C, createProduct, customer, db, placeOrder, request, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

const { setRazorpayFetch } = await import('../../src/providers/razorpay.js')

before(startTestServer)
after(async () => {
  setRazorpayFetch(null)
  await stopTestServer()
})

let rzpCalls = 0
beforeEach(() => {
  rzpCalls = 0
  setRazorpayFetch(async (_url, options) => {
    rzpCalls += 1
    const body = JSON.parse(options.body)
    return new Response(JSON.stringify({ id: `order_${crypto.randomBytes(6).toString('hex')}`, amount: body.amount, currency: 'INR' }), { status: 200 })
  })
})

const sign = (secret, value) => crypto.createHmac('sha256', secret).update(value).digest('hex')

async function onlineOrder({ price = 1000, stock = 5 } = {}) {
  const client = await agent()
  const product = await createProduct({ price, stock })
  const res = await placeOrder(client, { items: [{ productId: product._id, quantity: 1 }], customer: customer({ paymentMethod: 'online' }) })
  const { order_ref: ref, access_token: token } = res.body.data
  const rzp = await client.post('/api/v1/payments/razorpay/orders').send({ orderRef: ref, accessToken: token })
  return { client, product, ref, token, rzp }
}

const stockOf = async (id) => (await db().collection(C.products).findOne({ _id: id })).stock

function webhook(event, eventId) {
  // A string body is sent byte-for-byte (superagent would re-serialize a Buffer as JSON).
  const raw = JSON.stringify(event)
  return request()
    .post('/api/v1/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', sign('rzp_webhook_secret', raw))
    .set('X-Razorpay-Event-Id', eventId)
    .send(raw)
}

const captured = (rzpOrderId, amount, paymentId = 'pay_abc') => ({
  entity: 'event',
  event: 'payment.captured',
  payload: { payment: { entity: { id: paymentId, order_id: rzpOrderId, amount, method: 'upi', email: 'a@b.test', contact: '+919876543210' } } },
})

describe('PAY-01 Razorpay order creation', () => {
  test('provider order uses the server amount in paise and is reused on retry', async () => {
    const { client, ref, token, rzp } = await onlineOrder({ price: 1234.5 })
    assert.equal(rzp.status, 200)
    assert.equal(rzp.body.data.amount, 123450)
    assert.equal(rzp.body.data.razorpayKeyId, 'rzp_test_key')
    const again = await client.post('/api/v1/payments/razorpay/orders').send({ orderRef: ref, accessToken: token })
    assert.equal(again.body.data.razorpayOrderId, rzp.body.data.razorpayOrderId)
    assert.equal(rzpCalls, 1, 'second click reuses the provider order')
    assert.equal(await db().collection(C.payments).countDocuments({ provider_order_id: rzp.body.data.razorpayOrderId }), 1)
  })

  test('wrong token, COD orders and paid orders are refused', async () => {
    const { client, ref } = await onlineOrder()
    assert.equal((await client.post('/api/v1/payments/razorpay/orders').send({ orderRef: ref, accessToken: 'nope' })).status, 404)
    const product = await createProduct()
    const cod = await placeOrder(client, { items: [{ productId: product._id }], customer: customer({ paymentMethod: 'cod' }) })
    const res = await client.post('/api/v1/payments/razorpay/orders').send({ orderRef: cod.body.data.order_ref, accessToken: cod.body.data.access_token })
    assert.equal(res.status, 400)
  })
})

describe('PAY-02 signature verification', () => {
  test('invalid signature never marks paid; valid signature marks paid and decrements stock once', async () => {
    const { client, product, ref, rzp } = await onlineOrder({ stock: 5 })
    const rzpOrderId = rzp.body.data.razorpayOrderId
    const bad = await client.post('/api/v1/payments/razorpay/verify').send({ orderRef: ref, razorpay_order_id: rzpOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'deadbeef' })
    assert.equal(bad.status, 400)
    assert.equal((await db().collection(C.orders).findOne({ order_ref: ref })).payment_status, 'awaiting_payment')

    const good = { orderRef: ref, razorpay_order_id: rzpOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign('rzp_test_secret', `${rzpOrderId}|pay_1`) }
    assert.equal((await client.post('/api/v1/payments/razorpay/verify').send(good)).status, 200)
    const order = await db().collection(C.orders).findOne({ order_ref: ref })
    assert.equal(order.payment_status, 'paid')
    assert.equal(order.order_status, 'confirmed')
    assert.equal(await stockOf(product._id), 4)
    const payment = await db().collection(C.payments).findOne({ provider_order_id: rzpOrderId })
    assert.equal(payment.status, 'paid')
    assert.equal(payment.signature_verified, true)

    const repeat = await client.post('/api/v1/payments/razorpay/verify').send(good)
    assert.equal(repeat.body.data.message, 'Order is already marked as paid.')
    assert.equal(await stockOf(product._id), 4, 'no double decrement')
  })

  test('a valid signature for another order cannot pay this order', async () => {
    const a = await onlineOrder()
    const b = await onlineOrder()
    const rzpB = b.rzp.body.data.razorpayOrderId
    const res = await a.client.post('/api/v1/payments/razorpay/verify').send({ orderRef: a.ref, razorpay_order_id: rzpB, razorpay_payment_id: 'pay_x', razorpay_signature: sign('rzp_test_secret', `${rzpB}|pay_x`) })
    assert.equal(res.status, 400)
    assert.equal((await db().collection(C.orders).findOne({ order_ref: a.ref })).payment_status, 'awaiting_payment')
  })
})

describe('PAY-03 Razorpay webhook', () => {
  test('rejects missing/invalid signature', async () => {
    const raw = JSON.stringify(captured('order_x', 100))
    assert.equal((await request().post('/api/v1/webhooks/razorpay').set('Content-Type', 'application/json').send(raw)).status, 400)
    const res = await request().post('/api/v1/webhooks/razorpay').set('Content-Type', 'application/json').set('X-Razorpay-Signature', 'bad').send(raw)
    assert.equal(res.status, 400)
  })

  test('webhook first, then client verify and replays: one paid transition, one stock decrement', async () => {
    const { client, product, ref, rzp } = await onlineOrder({ price: 800, stock: 5 })
    const rzpOrderId = rzp.body.data.razorpayOrderId
    const first = await webhook(captured(rzpOrderId, 80000), 'evt_1')
    assert.equal(first.status, 200)
    assert.equal(first.body.data.outcome, 'paid')
    assert.equal(await stockOf(product._id), 4)

    const replay = await webhook(captured(rzpOrderId, 80000), 'evt_1')
    assert.equal(replay.body.data.duplicate, true)
    const orderPaid = await webhook({ ...captured(rzpOrderId, 80000), event: 'order.paid', payload: { order: { entity: { id: rzpOrderId, amount_paid: 80000 } }, payment: captured(rzpOrderId, 80000).payload.payment } }, 'evt_2')
    assert.equal(orderPaid.body.data.outcome, 'noop:already_paid')
    const verify = await client.post('/api/v1/payments/razorpay/verify').send({ orderRef: ref, razorpay_order_id: rzpOrderId, razorpay_payment_id: 'pay_abc', razorpay_signature: sign('rzp_test_secret', `${rzpOrderId}|pay_abc`) })
    assert.equal(verify.status, 200)
    assert.equal(await stockOf(product._id), 4)
    assert.equal(await db().collection(C.paymentEvents).countDocuments({ event_id: 'evt_1' }), 1)
    assert.equal(await db().collection(C.orderStatusHistory).countDocuments({ new_status: 'confirmed', order_id: (await db().collection(C.orders).findOne({ order_ref: ref }))._id }), 1)
  })

  test('amount mismatch is not marked paid', async () => {
    const { ref, rzp } = await onlineOrder({ price: 900 })
    const res = await webhook(captured(rzp.body.data.razorpayOrderId, 100), 'evt_mismatch')
    assert.equal(res.body.data.outcome, 'rejected:amount_mismatch')
    assert.equal((await db().collection(C.orders).findOne({ order_ref: ref })).payment_status, 'awaiting_payment')
  })

  test('payment.failed records the attempt but keeps the order payable', async () => {
    const { ref, rzp } = await onlineOrder()
    const rzpOrderId = rzp.body.data.razorpayOrderId
    await webhook({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_f', order_id: rzpOrderId, error_code: 'BAD_REQUEST_ERROR', error_description: 'declined' } } } }, 'evt_fail')
    assert.equal((await db().collection(C.payments).findOne({ provider_order_id: rzpOrderId })).status, 'failed')
    assert.equal((await db().collection(C.orders).findOne({ order_ref: ref })).payment_status, 'awaiting_payment')
  })

  test('refund.processed records one refund and marks the order refunded', async () => {
    const { ref, rzp } = await onlineOrder({ price: 500 })
    const rzpOrderId = rzp.body.data.razorpayOrderId
    await webhook(captured(rzpOrderId, 50000, 'pay_r'), 'evt_cap_r')
    const refund = { event: 'refund.processed', payload: { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_r', amount: 50000 } } } }
    assert.equal((await webhook(refund, 'evt_rf_1')).body.data.outcome, 'refunded')
    assert.equal((await webhook(refund, 'evt_rf_2')).body.data.outcome, 'noop:refund_exists')
    assert.equal(await db().collection(C.refunds).countDocuments({ provider_refund_id: 'rfnd_1' }), 1)
    assert.equal((await db().collection(C.orders).findOne({ order_ref: ref })).payment_status, 'refunded')
  })
})

describe('PAY-05 admin payment approval / rejection', () => {
  test('approve marks paid once, logs review, audits; second approve is 409', async () => {
    const { product, ref } = await onlineOrder({ stock: 3 })
    const { client: admin, user } = await signedInAgent({ role: 'admin' })
    const order = await db().collection(C.orders).findOne({ order_ref: ref })
    const res = await admin.post(`/api/v1/admin/payments/${order._id}/approve`).send({})
    assert.equal(res.status, 200)
    const updated = await db().collection(C.orders).findOne({ _id: order._id })
    assert.equal(updated.payment_status, 'paid')
    assert.equal(updated.payment_reviewed_by, user.id)
    assert.equal(await stockOf(product._id), 2)
    assert.ok(await db().collection(C.paymentReviewLogs).findOne({ order_id: order._id, action: 'approved' }))
    assert.equal((await admin.post(`/api/v1/admin/payments/${order._id}/approve`).send({})).status, 409)
    assert.equal(await stockOf(product._id), 2)
  })

  test('reject only applies to payment_submitted orders and requires a reason', async () => {
    const { ref } = await onlineOrder()
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const order = await db().collection(C.orders).findOne({ order_ref: ref })
    assert.equal((await admin.post(`/api/v1/admin/payments/${order._id}/reject`).send({ reason: 'x' })).status, 409)
    await db().collection(C.orders).updateOne({ _id: order._id }, { $set: { payment_status: 'payment_submitted' } })
    assert.equal((await admin.post(`/api/v1/admin/payments/${order._id}/reject`).send({})).status, 422)
    const ok = await admin.post(`/api/v1/admin/payments/${order._id}/reject`).send({ reason: 'UTR not found' })
    assert.equal(ok.status, 200)
    assert.equal((await db().collection(C.orders).findOne({ _id: order._id })).payment_status, 'rejected')
  })
})

describe('MKT-01 Meta CAPI endpoint', () => {
  test('unpaid online orders and unknown refs cannot trigger a Purchase', async () => {
    const { client, ref } = await onlineOrder()
    assert.equal((await client.post('/api/v1/events/meta-conversions').send({ event_name: 'Purchase', event_id: ref })).status, 400)
    assert.equal((await client.post('/api/v1/events/meta-conversions').send({ event_name: 'Purchase', event_id: 'VLQ-NOPE' })).status, 404)
    const other = await client.post('/api/v1/events/meta-conversions').send({ event_name: 'ViewContent', event_id: ref })
    assert.equal(other.body.data.skipped, true)
  })

  test('the Purchase claim is unique per order (no double counting)', async () => {
    const { recordAndSendMetaPurchase } = await import('../../src/services/metaService.js')
    const product = await createProduct()
    const res = await placeOrder(await agent(), { items: [{ productId: product._id }] })
    const order = await db().collection(C.orders).findOne({ order_ref: res.body.data.order_ref })
    // Without Meta credentials the call is skipped, never sent.
    assert.equal((await recordAndSendMetaPurchase(order)).skipped, true)
    await db().collection(C.metaEvents).insertOne({ _id: 'm1', order_id: order._id, event_name: 'Purchase', status: 'sent', created_at: new Date() })
    await assert.rejects(db().collection(C.metaEvents).insertOne({ _id: 'm2', order_id: order._id, event_name: 'Purchase', status: 'sending', created_at: new Date() }), /E11000/)
  })
})
