import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { agent, C, createProduct, db, placeOrder, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

before(startTestServer)
after(stopTestServer)

const review = (overrides = {}) => ({ rating: 5, title: 'Lovely piece', body: 'Looks even better in person.', reviewerName: 'Asha', ...overrides })

async function buyerWithDelivery(product) {
  const { client, user } = await signedInAgent()
  const res = await placeOrder(client, { items: [{ productId: product._id }] })
  await db().collection(C.orders).updateOne({ order_ref: res.body.data.order_ref }, { $set: { order_status: 'delivered', shipping_status: 'delivered' } })
  return { client, user }
}

describe('REV-01 verified reviews', () => {
  test('non-buyers and undelivered buyers cannot review', async () => {
    const product = await createProduct({ stock: 20 })
    const { client } = await signedInAgent()
    assert.equal((await client.get(`/api/v1/products/${product._id}/reviews/viewer`)).body.data.eligible, false)
    assert.equal((await client.post(`/api/v1/products/${product._id}/reviews`).send(review())).status, 403)
    await placeOrder(client, { items: [{ productId: product._id }] })
    assert.equal((await client.post(`/api/v1/products/${product._id}/reviews`).send(review())).status, 403)
    assert.equal((await (await agent()).post(`/api/v1/products/${product._id}/reviews`).send(review())).status, 401)
  })

  test('delivered buyer submits once; review is pending until approved; aggregates come from approved only', async () => {
    const product = await createProduct({ stock: 20, mock_rating: 4.9, mock_review_count: 120 })
    const { client } = await buyerWithDelivery(product)
    assert.equal((await client.get(`/api/v1/products/${product._id}/reviews/viewer`)).body.data.eligible, true)
    const created = await client.post(`/api/v1/products/${product._id}/reviews`).send(review({ rating: 4, imageUrls: ['https://res.cloudinary.com/demo-cloud/image/upload/v1/velisqa/reviews/x.jpg'] }))
    assert.equal(created.status, 201)
    assert.equal((await client.post(`/api/v1/products/${product._id}/reviews`).send(review())).status, 409)
    const bad = await client.post(`/api/v1/products/${product._id}/reviews`).send(review({ imageUrls: ['https://evil.example/x.jpg'] }))
    assert.equal(bad.status, 422)

    const viewer = await client.get(`/api/v1/products/${product._id}/reviews/viewer`)
    assert.equal(viewer.body.data.ownReview.status, 'pending')
    assert.equal((await client.get(`/api/v1/products/${product._id}/reviews`)).body.data.total, 0)

    const { client: admin } = await signedInAgent({ role: 'admin' })
    const pending = await admin.get('/api/v1/admin/reviews?status=pending')
    const row = pending.body.data.reviews.find((r) => r.id === created.body.data.reviewId)
    assert.equal(row.products.name, product.name)
    assert.equal((await admin.patch(`/api/v1/admin/reviews/${row.id}`).send({ status: 'approved' })).status, 200)

    const page = await client.get(`/api/v1/products/${product._id}/reviews?page=0&pageSize=6`)
    assert.equal(page.body.data.total, 1)
    assert.equal(page.body.data.reviews[0].is_verified_purchase, true)
    const summary = await client.get(`/api/v1/products/${product._id}/reviews/summary`)
    assert.deepEqual([summary.body.data.total, summary.body.data.average, summary.body.data.distribution[4]], [1, 4, 1])
    const publicProduct = (await client.get(`/api/v1/products/${product._id}`)).body.data.product
    assert.deepEqual([publicProduct.rating, publicProduct.review_count], [4, 1], 'mock counts never leak into public ratings')
    assert.equal(publicProduct.mock_rating, undefined)
    assert.equal((await client.get('/api/v1/reviews/latest?limit=6')).body.data.reviews[0].product_id, product._id)
  })

  test('reporting hides an approved review (not your own) and updates the aggregate', async () => {
    const product = await createProduct({ stock: 20 })
    const { client: author } = await buyerWithDelivery(product)
    const created = await author.post(`/api/v1/products/${product._id}/reviews`).send(review())
    const { client: admin } = await signedInAgent({ role: 'admin' })
    await admin.patch(`/api/v1/admin/reviews/${created.body.data.reviewId}`).send({ status: 'approved' })

    assert.equal((await author.post(`/api/v1/reviews/${created.body.data.reviewId}/report`).send({})).status, 409, 'cannot report own review')
    const { client: reader } = await signedInAgent()
    assert.equal((await reader.post(`/api/v1/reviews/${created.body.data.reviewId}/report`).send({})).status, 200)
    assert.equal((await db().collection(C.products).findOne({ _id: product._id })).review_count, 0)
    assert.equal((await reader.post(`/api/v1/reviews/${created.body.data.reviewId}/report`).send({})).status, 409)
  })
})
