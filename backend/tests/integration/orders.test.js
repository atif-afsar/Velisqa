import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { agent, C, createProduct, customer, db, placeOrder, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

before(startTestServer)
after(stopTestServer)

async function guestOrder({ stock = 5, paymentMethod = 'cod' } = {}) {
  const client = await agent()
  const product = await createProduct({ stock })
  const res = await placeOrder(client, { items: [{ productId: product._id, quantity: 2 }], customer: customer({ paymentMethod }) })
  return { client, product, ref: res.body.data.order_ref, token: res.body.data.access_token }
}

describe('ORD-02 private order access', () => {
  test('valid token reads the order (header or legacy ?token=), wrong/missing token gets 404', async () => {
    const { ref, token } = await guestOrder()
    const stranger = await agent()
    const viaHeader = await stranger.get(`/api/v1/orders/private/${ref}`).set('X-Order-Access-Token', token)
    assert.equal(viaHeader.status, 200)
    const order = viaHeader.body.data.order
    assert.equal(order.orderRef, ref)
    assert.equal(order.paymentMethod, 'cod')
    assert.equal(order.items[0].quantity, 2)
    assert.ok('productId' in order.items[0])
    assert.equal(viaHeader.headers['cache-control'], 'no-store')

    assert.equal((await stranger.get(`/api/v1/orders/private/${ref}?token=${token}`)).status, 200)
    assert.equal((await stranger.get(`/api/v1/orders/private/${ref}`).set('X-Order-Access-Token', '00000000-0000-0000-0000-000000000000')).status, 404)
    assert.equal((await stranger.get(`/api/v1/orders/private/${ref}`)).status, 404)
  })

  test('owner session works without the token; another account cannot see it', async () => {
    const { client: owner } = await signedInAgent()
    const product = await createProduct()
    const res = await placeOrder(owner, { items: [{ productId: product._id }] })
    const ref = res.body.data.order_ref
    assert.equal((await owner.get(`/api/v1/orders/private/${ref}`)).status, 200)
    const { client: other } = await signedInAgent()
    assert.equal((await other.get(`/api/v1/orders/private/${ref}`)).status, 404)
  })
})

describe('ORD-03 signed-in order history', () => {
  test('lists only own orders, with items and a usable private token', async () => {
    const { client: owner } = await signedInAgent()
    const product = await createProduct()
    const mine = await placeOrder(owner, { items: [{ productId: product._id }] })
    await guestOrder() // someone else's order

    const list = await owner.get('/api/v1/orders/mine')
    assert.equal(list.status, 200)
    assert.equal(list.body.data.orders.length, 1)
    const row = list.body.data.orders[0]
    assert.equal(row.order_ref, mine.body.data.order_ref)
    assert.equal(row.order_access_token, mine.body.data.access_token)
    assert.equal(row.order_items.length, 1)
    assert.equal(row.access_token_hash, undefined, 'internal fields stay hidden')

    const detail = await owner.get(`/api/v1/orders/mine/${row.order_ref}`)
    assert.equal(detail.body.data.order.order_items[0].product_id, product._id)
    assert.equal((await (await agent()).get('/api/v1/orders/mine')).status, 401)
  })
})

describe('ORD-04 / SHIP-03 customer cancellation', () => {
  test('cancel before dispatch restores reserved stock once', async () => {
    const { client, product, ref, token } = await guestOrder({ stock: 5 })
    assert.equal((await db().collection(C.products).findOne({ _id: product._id })).stock, 3)
    const res = await client.post(`/api/v1/orders/private/${ref}/cancel`).send({ accessToken: token })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.message, 'Your order was cancelled before dispatch.')
    assert.equal((await db().collection(C.products).findOne({ _id: product._id })).stock, 5)
    const again = await client.post(`/api/v1/orders/private/${ref}/cancel`).send({ accessToken: token })
    assert.equal(again.status, 409)
    assert.equal((await db().collection(C.products).findOne({ _id: product._id })).stock, 5, 'no double restore')
  })

  test('online unpaid order cancels without touching stock', async () => {
    const { client, product, ref, token } = await guestOrder({ stock: 5, paymentMethod: 'online' })
    assert.equal((await client.post(`/api/v1/orders/private/${ref}/cancel`).send({ accessToken: token })).status, 200)
    assert.equal((await db().collection(C.products).findOne({ _id: product._id })).stock, 5)
  })

  test('delivered and out-for-delivery orders cannot be cancelled; wrong token is 404', async () => {
    const { client, ref, token } = await guestOrder()
    await db().collection(C.orders).updateOne({ order_ref: ref }, { $set: { shipping_status: 'out_for_delivery' } })
    assert.equal((await client.post(`/api/v1/orders/private/${ref}/cancel`).send({ accessToken: token })).status, 409)
    await db().collection(C.orders).updateOne({ order_ref: ref }, { $set: { shipping_status: 'delivered', order_status: 'delivered' } })
    assert.equal((await client.post(`/api/v1/orders/private/${ref}/cancel`).send({ accessToken: token })).status, 409)
    assert.equal((await client.post(`/api/v1/orders/private/${ref}/cancel`).send({ accessToken: 'bad' })).status, 404)
  })

  test('admin cancel restores stock and is audited', async () => {
    const { product, ref } = await guestOrder({ stock: 6 })
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const order = await db().collection(C.orders).findOne({ order_ref: ref })
    const res = await admin.post(`/api/v1/admin/orders/${order._id}/cancel`).send({})
    assert.equal(res.status, 200)
    assert.equal(res.body.data.orderRef, ref)
    assert.equal((await db().collection(C.products).findOne({ _id: product._id })).stock, 6)
    assert.ok(await db().collection(C.adminAuditLogs).findOne({ action: 'order.cancel', target_id: order._id }))
  })
})

describe('SHIP-02 live tracking', () => {
  test('before shipment the tracking endpoint returns the friendly placeholder', async () => {
    const { client, ref, token } = await guestOrder()
    const res = await client.get(`/api/v1/orders/private/${ref}/tracking`).set('X-Order-Access-Token', token)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.tracking.message, 'Tracking will appear after the parcel is shipped.')
  })
})
