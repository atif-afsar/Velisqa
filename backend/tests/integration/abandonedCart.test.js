import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { agent, C, createProduct, customer, db, emailBehaviour, placeOrder, sentEmails, startTestServer, stopTestServer } from '../helpers/testServer.js'
import { runAbandonedCartSweep, buildUnsubscribeUrl } from '../../src/services/marketingService.js'

before(startTestServer)
after(stopTestServer)

let client
beforeEach(async () => {
  client = await agent()
  sentEmails.length = 0
  emailBehaviour.fail = false
  for (const name of [C.checkoutLeads, C.emailSuppressions, C.coupons, C.orders, C.orderItems]) await db().collection(name).deleteMany({})
})

const EMAIL = 'asha@example.test'
const twoHoursLater = () => new Date(Date.now() + 2 * 3600_000)
const saveLead = (body) => client.post('/api/v1/checkout/lead').send(body)

async function leadFor(product, overrides = {}) {
  const res = await saveLead({ email: EMAIL, consent: true, items: [{ productId: product._id, quantity: 1 }], ...overrides })
  assert.equal(res.status, 200)
  return res
}

describe('ABN-01 capturing a bag', () => {
  test('nothing is stored without consent', async () => {
    const p = await createProduct()
    const res = await leadFor(p, { consent: false })
    assert.equal(res.body.data.saved, false)
    assert.equal(await db().collection(C.checkoutLeads).countDocuments(), 0)
  })

  test('with consent: one lead per email, items refreshed, gifts ignored, invalid email refused', async () => {
    const p = await createProduct()
    await leadFor(p)
    await leadFor(p, { email: EMAIL.toUpperCase(), items: [{ productId: p._id, quantity: 3 }, { productId: 'gift', isFreeGift: true }] })
    const leads = await db().collection(C.checkoutLeads).find({}).toArray()
    assert.equal(leads.length, 1)
    assert.equal(leads[0].email, EMAIL)
    assert.deepEqual(leads[0].items, [{ productId: p._id, quantity: 3 }])
    const bad = await saveLead({ email: 'nope', consent: true, items: [{ productId: p._id }] })
    assert.equal(bad.status, 422)
  })
})

describe('ABN-02 the recovery email', () => {
  test('goes out after the delay with a personal coupon, exactly once', async () => {
    const p = await createProduct({ name: 'Pearl Drop Earrings', price: 1000 })
    await leadFor(p)

    const tooSoon = await runAbandonedCartSweep(new Date())
    assert.equal(tooSoon.sent, 0)
    assert.equal(sentEmails.length, 0)

    const first = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(first.sent, 1)
    assert.equal(sentEmails.length, 1)
    const mail = sentEmails[0]
    assert.deepEqual(mail.to, [EMAIL])
    assert.match(mail.html, /Pearl Drop Earrings/)
    assert.match(mail.html, /10% off/)
    assert.match(mail.headers['List-Unsubscribe'], /\/api\/v1\/email\/unsubscribe\?e=/)
    const code = mail.text.match(/code (COMEBACK-[A-Z0-9]{5})/)[1]
    assert.match(mail.html, new RegExp(code))
    const coupon = await db().collection(C.coupons).findOne({ _id: code })
    assert.equal(coupon.email, EMAIL)
    assert.equal(coupon.single_use, true)
    assert.ok(coupon.expires_at > new Date())

    const again = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(again.sent, 0)
    assert.equal(sentEmails.length, 1)
  })

  test('not sent to shoppers who already ordered', async () => {
    const p = await createProduct({ price: 1000 })
    await leadFor(p)
    const order = await placeOrder(client, { items: [{ productId: p._id, quantity: 1 }], customer: customer({ email: EMAIL.toUpperCase() }) })
    assert.equal(order.status, 201)
    const result = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(result.recovered, 1)
    assert.equal(sentEmails.length, 0)
  })

  test('out-of-stock lines are left out, and a fully sold-out bag sends nothing', async () => {
    const live = await createProduct({ name: 'Live Piece', price: 700 })
    const gone = await createProduct({ name: 'Gone Piece', price: 900, stock: 0 })
    await leadFor(live, { items: [{ productId: live._id, quantity: 1 }, { productId: gone._id, quantity: 1 }] })
    await runAbandonedCartSweep(twoHoursLater())
    assert.match(sentEmails[0].html, /Live Piece/)
    assert.doesNotMatch(sentEmails[0].html, /Gone Piece/)

    sentEmails.length = 0
    await db().collection(C.checkoutLeads).deleteMany({})
    await leadFor(gone, { email: 'b@example.test' })
    const result = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(result.sent, 0)
    assert.equal(sentEmails.length, 0)
  })

  test('a provider failure leaves no live coupon behind and is retried later', async () => {
    const p = await createProduct()
    await leadFor(p)
    emailBehaviour.fail = true
    const failed = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(failed.failed, 1)
    assert.equal(await db().collection(C.coupons).countDocuments(), 0)
    assert.equal((await db().collection(C.checkoutLeads).findOne({})).send_failures, 1)

    emailBehaviour.fail = false
    const retried = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(retried.sent, 1)
  })

  test('daily cap keeps headroom under the Resend free plan', async () => {
    const p = await createProduct()
    const now = new Date()
    await db().collection(C.checkoutLeads).insertMany(
      Array.from({ length: 80 }, (_, i) => ({ _id: `old-${i}`, email: `old${i}@example.test`, consent: true, items: [], created_at: now, last_seen_at: now, email_sent_at: now, send_failures: 0 })),
    )
    await leadFor(p)
    const result = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(result.checked, 0)
    assert.equal(sentEmails.length, 0)
  })
})

describe('ABN-03 unsubscribe', () => {
  test('a valid link stops all further offer emails; a forged one does nothing', async () => {
    const p = await createProduct()
    await leadFor(p)
    const url = new URL(buildUnsubscribeUrl(EMAIL))

    const forged = await client.get(`${url.pathname}?e=${encodeURIComponent(EMAIL)}&t=${'0'.repeat(32)}`)
    assert.equal(forged.status, 400)
    assert.equal(await db().collection(C.emailSuppressions).countDocuments(), 0)

    const good = await client.get(`${url.pathname}${url.search}`)
    assert.equal(good.status, 200)
    assert.match(good.text, /unsubscribed/i)

    const result = await runAbandonedCartSweep(twoHoursLater())
    assert.equal(result.sent, 0)
    assert.equal(sentEmails.length, 0)
    const again = await leadFor(p)
    assert.equal(again.body.data.saved, false)
  })
})

describe('ABN-04 personal coupons at checkout', () => {
  const issue = (overrides = {}) =>
    db().collection(C.coupons).insertOne({
      _id: 'COMEBACK-TEST1',
      discount_type: 'percentage',
      discount_value: 10,
      min_subtotal: 0,
      active: true,
      single_use: true,
      used_at: null,
      email: EMAIL,
      expires_at: new Date(Date.now() + 3600_000),
      created_at: new Date(),
      ...overrides,
    })
  const quote = (p, email) => client.post('/api/v1/checkout/quote').send({ items: [{ productId: p._id, quantity: 1 }], couponCode: 'comeback-test1', paymentMethod: 'online', email })

  test('applies for its owner only (email match is case-insensitive)', async () => {
    const p = await createProduct({ price: 1000 })
    await issue()
    assert.equal((await quote(p, EMAIL.toUpperCase())).body.data.discount, 100)
    assert.equal((await quote(p, 'someone-else@example.test')).body.data.couponCode, null)
    assert.equal((await quote(p, undefined)).body.data.couponCode, null)
  })

  test('works once: the order spends it, the next order cannot reuse it', async () => {
    const p = await createProduct({ price: 1000, stock: 5 })
    await issue()
    const first = await placeOrder(client, { items: [{ productId: p._id, quantity: 1 }], customer: customer({ email: EMAIL, paymentMethod: 'online', couponCode: 'COMEBACK-TEST1' }) })
    assert.equal(first.status, 201)
    assert.equal(first.body.data.grand_total, 900)
    assert.ok((await db().collection(C.coupons).findOne({ _id: 'COMEBACK-TEST1' })).used_at)

    const second = await placeOrder(client, { items: [{ productId: p._id, quantity: 1 }], customer: customer({ email: EMAIL, paymentMethod: 'online', couponCode: 'COMEBACK-TEST1' }), idempotencyKey: 'second-try-000' })
    assert.equal(second.body.data.grand_total, 1000)
    const lookup = await client.get('/api/v1/coupons/COMEBACK-TEST1')
    assert.equal(lookup.status, 404)
  })

  test('an expired code is refused at lookup and at pricing', async () => {
    const p = await createProduct({ price: 1000 })
    await issue({ expires_at: new Date(Date.now() - 1000) })
    assert.equal((await client.get('/api/v1/coupons/COMEBACK-TEST1')).status, 404)
    assert.equal((await quote(p, EMAIL)).body.data.couponCode, null)
  })

  test('shared admin coupons keep working exactly as before', async () => {
    const p = await createProduct({ price: 1000 })
    await db().collection(C.coupons).insertOne({ _id: 'SAVE10', discount_type: 'percentage', discount_value: 10, min_subtotal: 0, active: true, created_at: new Date() })
    const q = (email) => client.post('/api/v1/checkout/quote').send({ items: [{ productId: p._id, quantity: 1 }], couponCode: 'SAVE10', paymentMethod: 'online', email })
    assert.equal((await q(undefined)).body.data.discount, 100)
    assert.equal((await q('anyone@example.test')).body.data.discount, 100)
  })
})
