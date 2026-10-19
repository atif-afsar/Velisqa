import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { after, before, describe, test } from 'node:test'
import { C, db, mongoTarget, startTestServer, stopTestServer } from '../helpers/testServer.js'

const run = promisify(execFile)
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

before(startTestServer)
after(stopTestServer)

async function script(name, args, origin) {
  const { uri, dbName } = mongoTarget()
  return run(process.execPath, [`scripts/${name}`, ...args], {
    cwd: backendDir,
    env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri, MONGODB_DB_NAME: dbName, PUBLIC_API_ORIGIN: origin },
  })
}

describe('OPS-02 store data export → import on another MongoDB', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'velisqa-data-'))
  const created = new Date('2026-01-02T03:04:05Z')

  test('export → empty DB → import restores products, coupons, banners; image links follow the new server', async () => {
    await db().collection(C.products).insertOne({
      _id: 'p-transfer',
      name: 'Transfer Ring',
      price: 499,
      stock: 3,
      image_url: 'http://old-api.test/api/v1/media/products/abc.webp',
      gallery_urls: ['http://old-api.test/api/v1/media/products/abc.webp', 'https://res.cloudinary.com/x/y.png'],
      created_at: created,
    })
    await db().collection(C.coupons).insertOne({ _id: 'MOVE10', discount_type: 'percentage', discount_value: 10, min_subtotal: 0, active: true, created_at: created })
    await db().collection(C.siteSettings).insertOne({ _id: 'hero', slides: [{ desktopUrl: 'http://old-api.test/api/v1/media/site/h.webp' }], intervalSeconds: 7, updated_at: created })

    await script('export-data.mjs', ['--dir', dir], 'http://old-api.test')
    const file = readFileSync(path.join(dir, 'products.json'), 'utf8')
    assert.ok(file.includes('{{API_ORIGIN}}/api/v1/media/products/abc.webp'))
    assert.ok(!file.includes('old-api.test'))

    for (const name of [C.products, C.coupons, C.siteSettings]) await db().collection(name).deleteMany({})
    const out = await script('import-data.mjs', ['--dir', dir], 'https://api.new-server.test')
    assert.match(out.stdout, /products: 1 added/)

    const product = await db().collection(C.products).findOne({ _id: 'p-transfer' })
    assert.equal(product.image_url, 'https://api.new-server.test/api/v1/media/products/abc.webp')
    assert.equal(product.gallery_urls[1], 'https://res.cloudinary.com/x/y.png', 'Cloudinary links untouched')
    assert.ok(product.created_at instanceof Date, 'dates stay dates')
    assert.equal(product.created_at.toISOString(), created.toISOString())
    assert.equal((await db().collection(C.coupons).findOne({ _id: 'MOVE10' })).discount_value, 10)
    const hero = await db().collection(C.siteSettings).findOne({ _id: 'hero' })
    assert.equal(hero.intervalSeconds, 7)
    assert.equal(hero.slides[0].desktopUrl, 'https://api.new-server.test/api/v1/media/site/h.webp')
  })

  test('re-running import never overwrites live edits unless --overwrite is given', async () => {
    await db().collection(C.products).updateOne({ _id: 'p-transfer' }, { $set: { price: 549 } })
    const again = await script('import-data.mjs', ['--dir', dir], 'https://api.new-server.test')
    assert.match(again.stdout, /products: 0 added, 0 replaced/)
    assert.equal((await db().collection(C.products).findOne({ _id: 'p-transfer' })).price, 549)

    await script('import-data.mjs', ['--dir', dir, '--overwrite'], 'https://api.new-server.test')
    assert.equal((await db().collection(C.products).findOne({ _id: 'p-transfer' })).price, 499)
  })
})
