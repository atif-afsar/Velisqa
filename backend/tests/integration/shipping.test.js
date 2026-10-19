import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { agent, C, createProduct, customer, db, placeOrder, request, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

const { setNimbusFetch } = await import('../../src/providers/nimbuspost.js')

before(startTestServer)
after(async () => {
  setNimbusFetch(null)
  await stopTestServer()
})

let calls
let lastAwb
beforeEach(() => {
  calls = { create: 0, cancel: 0 }
  // Fake NimbusPost v2: lookups find nothing, create returns an AWB, cancel succeeds.
  setNimbusFetch(async (url, options = {}) => {
    if ((options.method || 'GET') === 'GET') return new Response('{}', { status: 404 })
    if (url.endsWith('/v2/shipments')) {
      calls.create += 1
      await new Promise((resolve) => setTimeout(resolve, 50))
      return new Response(JSON.stringify({ status: true, data: { order_id: 'NP1', shipment_id: 'SH1', awb_number: (lastAwb = String(1234567890000 + Math.floor(Math.random() * 999))), courier_name: 'Delhivery' } }), { status: 200 })
    }
    if (url.endsWith('/v2/shipments/cancel')) {
      calls.cancel += 1
      return new Response(JSON.stringify({ status: true }), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  })
})

async function codOrder(overrides = {}) {
  const product = await createProduct({ stock: 5 })
  const res = await placeOrder(await agent(), { items: [{ productId: product._id }], customer: customer(overrides) })
  return db().collection(C.orders).findOne({ order_ref: res.body.data.order_ref })
}

describe('SHIP-01 NimbusPost shipment creation', () => {
  test('ships a pending COD order once and stores AWB/tracking', async () => {
    const order = await codOrder()
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const res = await admin.post(`/api/v1/admin/orders/${order._id}/ship`).send({})
    assert.equal(res.status, 200)
    assert.equal(res.body.data.shipment.awb, lastAwb)
    const shipped = await db().collection(C.orders).findOne({ _id: order._id })
    assert.equal(shipped.shipping_status, 'shipped')
    assert.equal(shipped.order_status, 'shipped')
    assert.equal(shipped.courier_name, 'Delhivery')
    assert.equal(shipped.tracking_url, `https://nimbuspost.com/tracking/?awb=${lastAwb}`)
    assert.equal(shipped.payment_status, 'pending', 'COD stays pending until collected')
    assert.equal((await admin.post(`/api/v1/admin/orders/${order._id}/ship`).send({})).status, 409)
    assert.equal(calls.create, 1)
  })

  test('concurrent ship clicks book at most one shipment', async () => {
    const order = await codOrder()
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const results = await Promise.all([1, 2, 3].map(() => admin.post(`/api/v1/admin/orders/${order._id}/ship`).send({})))
    assert.equal(results.filter((res) => res.status === 200).length, 1)
    assert.equal(calls.create, 1)
  })

  test('unpaid online orders and cancelled orders cannot ship', async () => {
    const online = await codOrder({ paymentMethod: 'online' })
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const res = await admin.post(`/api/v1/admin/orders/${online._id}/ship`).send({})
    assert.equal(res.status, 409)
    assert.equal(res.body.error.message, 'Online orders must be paid before shipping.')
    const cancelled = await codOrder()
    await admin.post(`/api/v1/admin/orders/${cancelled._id}/cancel`).send({})
    assert.equal((await admin.post(`/api/v1/admin/orders/${cancelled._id}/ship`).send({})).status, 409)
  })

  test('admin cancel of a shipped order cancels on NimbusPost and marks RTO', async () => {
    const order = await codOrder()
    const { client: admin } = await signedInAgent({ role: 'admin' })
    await admin.post(`/api/v1/admin/orders/${order._id}/ship`).send({})
    const res = await admin.post(`/api/v1/admin/orders/${order._id}/cancel`).send({})
    assert.equal(res.status, 200)
    assert.equal(res.body.data.cancelledOnNimbusPost, true)
    assert.equal(calls.cancel, 1)
    const after = await db().collection(C.orders).findOne({ _id: order._id })
    assert.deepEqual([after.order_status, after.shipping_status], ['cancelled', 'rto'])
  })

  test('reset-shipment only for stuck/invalid AWB and keeps the old value in history', async () => {
    const order = await codOrder()
    const { client: admin } = await signedInAgent({ role: 'admin' })
    await db().collection(C.orders).updateOne({ _id: order._id }, { $set: { nimbuspost_awb: 'proxy error', shipping_status: 'shipped', order_status: 'shipped' } })
    assert.equal((await admin.post(`/api/v1/admin/orders/${order._id}/reset-shipment`).send({})).status, 200)
    const reset = await db().collection(C.orders).findOne({ _id: order._id })
    assert.deepEqual([reset.nimbuspost_awb, reset.shipping_status], [null, 'not_shipped'])
    assert.ok(await db().collection(C.orderStatusHistory).findOne({ order_id: order._id, 'metadata.previous_awb': 'proxy error' }))

    await admin.post(`/api/v1/admin/orders/${order._id}/ship`).send({})
    assert.equal((await admin.post(`/api/v1/admin/orders/${order._id}/reset-shipment`).send({})).status, 409)
  })
})

describe('SHIP-02 NimbusPost webhook', () => {
  const send = (payload, secret = 'nimbus_webhook_secret') =>
    request().post('/api/v1/webhooks/nimbuspost').set('Content-Type', 'application/json').set('X-Webhook-Secret', secret).send(JSON.stringify(payload))

  test('wrong or query-string secret is rejected', async () => {
    assert.equal((await send({ awb: '1', status: 'delivered' }, 'nope')).status, 401)
    const viaQuery = await request().post('/api/v1/webhooks/nimbuspost?secret=nimbus_webhook_secret').set('Content-Type', 'application/json').send('{}')
    assert.equal(viaQuery.status, 401)
  })

  test('statuses move forward only; delivered never regresses; duplicates are ignored', async () => {
    const order = await codOrder()
    const { client: admin } = await signedInAgent({ role: 'admin' })
    await admin.post(`/api/v1/admin/orders/${order._id}/ship`).send({})

    const ofd = await send({ awb_number: lastAwb, status: 'Out For Delivery', event_time: 't1' })
    assert.equal(ofd.body.data.updated, true)
    const delivered = await send({ awb_number: lastAwb, status: 'delivered', event_time: 't2' })
    assert.equal(delivered.body.data.updated, true)
    let row = await db().collection(C.orders).findOne({ _id: order._id })
    assert.deepEqual([row.shipping_status, row.order_status], ['delivered', 'delivered'])
    assert.ok(row.delivered_at instanceof Date)

    const late = await send({ awb_number: lastAwb, status: 'in_transit', event_time: 't0' })
    assert.equal(late.body.data.reason, 'no_forward_transition')
    const dup = await send({ awb_number: lastAwb, status: 'delivered', event_time: 't2' })
    assert.equal(dup.body.data.reason, 'duplicate')
    row = await db().collection(C.orders).findOne({ _id: order._id })
    assert.equal(row.shipping_status, 'delivered')

    assert.equal((await send({ awb: lastAwb, status: 'weird_status' })).body.data.reason, 'unmapped_status')
    assert.equal((await send({ awb: '999999999', status: 'delivered', event_time: 'x' })).body.data.reason, 'order_not_found')
  })

  test('cancelled orders keep order_status=cancelled when RTO updates arrive', async () => {
    const order = await codOrder()
    const { client: admin } = await signedInAgent({ role: 'admin' })
    await admin.post(`/api/v1/admin/orders/${order._id}/ship`).send({})
    await db().collection(C.orders).updateOne({ _id: order._id }, { $set: { order_status: 'cancelled' } })
    await send({ awb_number: lastAwb, status: 'rto_in_transit', event_time: 'r1' })
    const row = await db().collection(C.orders).findOne({ _id: order._id })
    assert.deepEqual([row.order_status, row.shipping_status], ['cancelled', 'rto'])
  })
})

describe('NimbusPost parsing helpers (ported unchanged)', () => {
  test('AWB validation and state mapping', async () => {
    const { isValidAwb, shippingState, parseShipmentResponse } = await import('../../src/providers/nimbuspost.js')
    assert.equal(isValidAwb('1234567890'), true)
    assert.equal(isValidAwb('NMBC1234567'), true)
    assert.equal(isValidAwb('proxy error'), false)
    assert.equal(isValidAwb('12345'), false)
    assert.equal(shippingState('Aligarh', '202001', ''), 'UP')
    assert.equal(shippingState('X', '560001', ''), 'KA')
    assert.equal(shippingState('X', '999999', 'flat 1, state: kerala'), 'KL')
    assert.equal(shippingState('Anywhere', '999999', '', 'Tamil Nadu'), 'TN')
    assert.equal(parseShipmentResponse({ data: { shipments: [{ awb: 'AWB12345678' }] } }).awb, 'AWB12345678')
  })
})
