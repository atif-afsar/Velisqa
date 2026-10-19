import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { createProduct, request, startTestServer, stopTestServer } from '../helpers/testServer.js'

before(startTestServer)
after(stopTestServer)

describe('CAT-01 / CAT-02 / CART-01 public catalogue', () => {
  test('list is newest-first with PostgREST field names; detail and batch lookup work', async () => {
    const older = await createProduct({ name: 'Older Ring', category: 'rings', created_at: new Date(Date.now() - 60_000) })
    const newer = await createProduct({ name: 'Newer Chain', category: 'necklaces', search_keywords: ['layering'] })
    const list = await request().get('/api/v1/products')
    assert.equal(list.status, 200)
    const ids = list.body.data.products.map((p) => p.id)
    assert.ok(ids.indexOf(newer._id) < ids.indexOf(older._id))
    const sample = list.body.data.products[0]
    for (const field of ['id', 'name', 'price', 'mrp', 'stock', 'out_of_stock', 'category', 'image_url', 'gallery_urls', 'hover_image_url', 'styles', 'search_keywords', 'is_combo', 'combo_product_ids', 'rating', 'review_count', 'created_at']) {
      assert.ok(field in sample, `missing ${field}`)
    }
    assert.equal(sample.created_by, undefined)

    assert.equal((await request().get(`/api/v1/products/${older._id}`)).body.data.product.name, 'Older Ring')
    assert.equal((await request().get('/api/v1/products/does-not-exist')).status, 404)

    const lookup = await request().get(`/api/v1/products/lookup?ids=${newer._id},${older._id},missing`)
    assert.equal(lookup.body.data.products.length, 2, 'deleted/missing ids are simply absent (cart marks them unavailable)')
  })

  test('server-side search, category filter, sort and id/name projection', async () => {
    await createProduct({ name: 'Zircon Bangle', category: 'bangles', price: 300 })
    await createProduct({ name: 'Pearl Bangle', category: 'bangles', price: 900 })
    const search = await request().get('/api/v1/products?search=layering')
    assert.ok(search.body.data.products.every((p) => p.search_keywords.includes('layering') || /layering/i.test(p.name + p.description)))
    const bangles = await request().get('/api/v1/products?category=Bangles&sort=price_asc')
    assert.deepEqual(bangles.body.data.products.map((p) => p.price), [300, 900])
    const names = await request().get('/api/v1/products?fields=id,name')
    assert.deepEqual(Object.keys(names.body.data.products[0]).sort(), ['id', 'name'])
  })
})
