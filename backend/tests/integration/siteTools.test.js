import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { agent, request, signedInAgent, startTestServer, stopTestServer } from '../helpers/testServer.js'

before(startTestServer)
after(stopTestServer)

// Smallest valid PNG (1x1).
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('Self-hosted image uploads', () => {
  test('admin uploads are stored, deduplicated and served with long caching; type is sniffed', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const first = await admin.post('/api/v1/uploads/image').send({ purpose: 'site', dataUrl: PNG })
    assert.equal(first.status, 201)
    const second = await admin.post('/api/v1/uploads/image').send({ purpose: 'site', dataUrl: PNG })
    assert.equal(second.body.data.secure_url, first.body.data.secure_url, 'same bytes → same file')

    const path = new URL(first.body.data.secure_url).pathname
    const served = await request().get(path)
    assert.equal(served.status, 200)
    assert.match(served.headers['content-type'], /image\/png/)
    assert.match(served.headers['cache-control'], /immutable/)

    const fake = await admin.post('/api/v1/uploads/image').send({ purpose: 'product', dataUrl: 'data:image/png;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' })
    assert.equal(fake.status, 400, 'non-image bytes rejected even when labelled image/png')
    assert.ok([403, 404].includes((await request().get('/api/v1/media/site/..%2f..%2fpackage.json')).status))
    assert.equal((await request().get('/api/v1/media/site/missing.png')).status, 404)
  })

  test('customers may only upload review photos; anonymous may not upload', async () => {
    const { client: shopper } = await signedInAgent()
    assert.equal((await shopper.post('/api/v1/uploads/image').send({ purpose: 'site', dataUrl: PNG })).status, 403)
    assert.equal((await shopper.post('/api/v1/uploads/image').send({ purpose: 'review', dataUrl: PNG })).status, 201)
    assert.equal((await (await agent()).post('/api/v1/uploads/image').send({ purpose: 'review', dataUrl: PNG })).status, 401)
  })
})

describe('Hero banner settings', () => {
  test('empty by default, admin can save slides, public endpoint returns them, validation applies', async () => {
    assert.deepEqual((await request().get('/api/v1/settings/hero')).body.data.slides, [])
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const slides = [{ desktopUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg', focus: '50% 30%', to: '/collections/earrings', label: 'Shop earrings', alt: 'Earrings' }]
    assert.equal((await admin.put('/api/v1/admin/settings/hero').send({ slides })).status, 200)
    const saved = (await request().get('/api/v1/settings/hero')).body.data.slides
    assert.equal(saved[0].to, '/collections/earrings')
    assert.equal((await request().get('/api/v1/settings/hero')).body.data.intervalSeconds, 5, 'default rotation')
    assert.equal((await admin.put('/api/v1/admin/settings/hero').send({ slides, intervalSeconds: 8 })).status, 200)
    assert.equal((await request().get('/api/v1/settings/hero')).body.data.intervalSeconds, 8)
    assert.equal((await admin.put('/api/v1/admin/settings/hero').send({ slides, intervalSeconds: 1 })).status, 422)
    assert.equal((await admin.put('/api/v1/admin/settings/hero').send({ slides: [{ desktopUrl: 'x', to: 'https://evil.example' }] })).status, 422)
    const { client: shopper } = await signedInAgent()
    assert.equal((await shopper.put('/api/v1/admin/settings/hero').send({ slides })).status, 403)
  })
})

describe('Bulk product import', () => {
  test('valid rows are created, invalid rows reported with reasons', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    const res = await admin.post('/api/v1/admin/products/bulk').send({
      products: [
        { name: 'Bulk Hoops', price: 499, mrp: 799, category: 'Earrings', stock: 5, image_url: 'https://res.cloudinary.com/x/a.jpg', gallery_urls: ['https://res.cloudinary.com/x/a.jpg'] },
        { name: '', price: 100 },
        { name: 'Bad MRP', price: 900, mrp: 100 },
      ],
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.created, 1)
    assert.equal(res.body.data.failed, 2)
    assert.match(res.body.data.results[2].error, /MRP/)
    const list = await request().get('/api/v1/products?search=Bulk Hoops')
    assert.equal(list.body.data.products[0].name, 'Bulk Hoops')
  })

  test('AI drafting reports clearly when no API key is configured', async () => {
    const { client: admin } = await signedInAgent({ role: 'admin' })
    assert.equal((await admin.get('/api/v1/admin/ai/status')).body.data.configured, false)
    const res = await admin.post('/api/v1/admin/ai/product-draft').send({ dataUrl: PNG })
    assert.equal(res.status, 503)
    assert.match(res.body.error.message, /ANTHROPIC_API_KEY/)
  })
})
