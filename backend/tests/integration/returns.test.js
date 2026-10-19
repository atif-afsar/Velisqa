import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { C, createProduct, db, placeOrder, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

before(startTestServer)
after(stopTestServer)

async function deliveredOrder({ daysAgo = 1, paymentStatus = 'paid' } = {}) {
  const { client, user } = await signedInAgent()
  const product = await createProduct({ stock: 5 })
  const res = await placeOrder(client, { items: [{ productId: product._id, quantity: 2 }] })
  const order = await db().collection(C.orders).findOne({ order_ref: res.body.data.order_ref })
  await db().collection(C.orders).updateOne(
    { _id: order._id },
    { $set: { order_status: 'delivered', shipping_status: 'delivered', payment_status: paymentStatus, delivered_at: new Date(Date.now() - daysAgo * 86_400_000) } },
  )
  return { client, user, product, order }
}

describe('RET-01 customer return eligibility and submission', () => {
  test('eligible within 5 days of delivery; submit creates pending return with all items; second request refused', async () => {
    const { client, order } = await deliveredOrder({ daysAgo: 4 })
    assert.equal((await client.get(`/api/v1/returns/eligibility?orderId=${order._id}`)).body.data.eligible, true)
    const res = await client.post('/api/v1/returns').send({ orderId: order._id, reason: 'Damaged or defective', customerNotes: 'Clasp broken' })
    assert.equal(res.status, 201)
    const row = await db().collection(C.orderReturns).findOne({ _id: res.body.data.returnId })
    assert.equal(row.status, 'pending')
    assert.equal(row.refund_amount, order.grand_total)
    assert.equal(await db().collection(C.orderReturnItems).countDocuments({ return_id: row._id }), 1)

    assert.equal((await client.get(`/api/v1/returns/eligibility?orderId=${order._id}`)).body.data.eligible, false)
    assert.equal((await client.post('/api/v1/returns').send({ orderId: order._id, reason: 'Other' })).status, 409)

    const single = await client.get(`/api/v1/returns?orderId=${order._id}`)
    assert.equal(single.body.data.return.status, 'pending')
    const map = await client.get(`/api/v1/returns?orderIds=${order._id},nope`)
    assert.equal(map.body.data.returns[order._id].reason, 'Damaged or defective')
  })

  test('outside the window, undelivered, or someone else’s order is not eligible', async () => {
    const old = await deliveredOrder({ daysAgo: 6 })
    assert.equal((await old.client.get(`/api/v1/returns/eligibility?orderId=${old.order._id}`)).body.data.eligible, false)
    assert.equal((await old.client.post('/api/v1/returns').send({ orderId: old.order._id, reason: 'Other' })).status, 409)

    const fresh = await deliveredOrder({ daysAgo: 1 })
    const { client: stranger } = await signedInAgent()
    assert.equal((await stranger.get(`/api/v1/returns/eligibility?orderId=${fresh.order._id}`)).body.data.eligible, false)
    assert.equal((await stranger.post('/api/v1/returns').send({ orderId: fresh.order._id, reason: 'Other' })).status, 409)
    assert.deepEqual((await stranger.get(`/api/v1/returns?orderIds=${fresh.order._id}`)).body.data.returns, {})
  })
})

describe('RET-02 admin return workflow', () => {
  test('approve → reverse AWB → received → QC pass (stock once) → refunded; illegal steps refused', async () => {
    const { client, product, order } = await deliveredOrder({ daysAgo: 2 })
    const submit = await client.post('/api/v1/returns').send({ orderId: order._id, reason: 'Wrong item received' })
    const returnId = submit.body.data.returnId
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const act = (body) => admin.post(`/api/v1/admin/returns/${returnId}/actions`).send(body)

    const list = await admin.get('/api/v1/admin/returns?status=pending')
    const listed = list.body.data.returns.find((row) => row.id === returnId)
    assert.equal(listed.orders.order_ref, order.order_ref)

    assert.equal((await act({ action: 'qc_pass' })).status, 409, 'cannot QC before receipt')
    assert.equal((await act({ action: 'approve' })).status, 200)
    assert.equal((await act({ action: 'approve' })).status, 409)
    assert.equal((await act({ action: 'set_reverse_awb' })).status, 400)
    assert.equal((await act({ action: 'set_reverse_awb', reverseAwb: 'RV123456', reverseTrackingUrl: 'https://track.example/RV123456' })).status, 200)
    assert.equal((await act({ action: 'mark_received' })).status, 200)
    const stockBefore = (await db().collection(C.products).findOne({ _id: product._id })).stock
    assert.equal((await act({ action: 'qc_pass' })).status, 200)
    assert.equal((await act({ action: 'qc_pass' })).status, 409)
    assert.equal((await db().collection(C.products).findOne({ _id: product._id })).stock, stockBefore + 2, 'inventory restored exactly once')

    const refunded = await act({ action: 'mark_refunded' })
    assert.equal(refunded.body.data.message, 'Return closed and order marked refunded.')
    const finalOrder = await db().collection(C.orders).findOne({ _id: order._id })
    assert.deepEqual([finalOrder.order_status, finalOrder.payment_status], ['returned', 'refunded'])
    const row = await db().collection(C.orderReturns).findOne({ _id: returnId })
    assert.ok(row.approved_at && row.pickup_scheduled_at && row.received_at && row.qc_completed_at && row.refunded_at)
  })

  test('reject requires a reason and closes the request', async () => {
    const { client, order } = await deliveredOrder({ daysAgo: 1, paymentStatus: 'pending' })
    const { body } = await client.post('/api/v1/returns').send({ orderId: order._id, reason: 'Changed my mind' })
    const { client: admin } = await signedInAgent({ role: 'admin' })
    assert.equal((await admin.post(`/api/v1/admin/returns/${body.data.returnId}/actions`).send({ action: 'reject' })).status, 400)
    assert.equal((await admin.post(`/api/v1/admin/returns/${body.data.returnId}/actions`).send({ action: 'reject', rejectionReason: 'Outside policy' })).status, 200)
    const completed = await admin.get('/api/v1/admin/returns?status=completed')
    assert.ok(completed.body.data.returns.some((row) => row.id === body.data.returnId && row.rejection_reason === 'Outside policy'))
  })
})
