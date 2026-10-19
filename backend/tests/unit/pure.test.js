process.env.NODE_ENV = 'test'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

const { roundPaiseToRupee, toPaise, toRupees } = await import('../../src/lib/money.js')
const { aggregateLines, computeCouponDiscountPaise } = await import('../../src/services/pricingService.js')
const { nextShippingStatus } = await import('../../src/services/nimbusWebhookService.js')
const { generateOrderRef } = await import('../../src/services/orderService.js')
const crypto = await import('../../src/lib/crypto.js')

const id = '11111111-1111-4111-8111-111111111111'

describe('money', () => {
  test('paise conversion and Postgres-style whole-rupee rounding', () => {
    assert.equal(toPaise(1999.5), 199950)
    assert.equal(toRupees(199950), 1999.5)
    assert.equal(roundPaiseToRupee(19995), 20000)
    assert.equal(roundPaiseToRupee(1998), 2000)
    assert.equal(roundPaiseToRupee(1949), 1900)
  })
})

describe('pricing helpers', () => {
  test('lines aggregate per product; gifts are capped at qty 1; quantities clamp to 1..50', () => {
    const lines = aggregateLines([
      { productId: id, quantity: 2 },
      { productId: id, quantity: 99 },
      { productId: id, quantity: 5, isFreeGift: true },
    ])
    assert.deepEqual(lines.map((l) => [l.isGift, l.qty]), [[false, 52], [true, 1]])
    assert.throws(() => aggregateLines([]), /empty/)
    assert.throws(() => aggregateLines([{ productId: 'VELISQA_FREE_GIFT' }]), /unavailable/)
  })

  test('coupon discounts', () => {
    const pct = { active: true, discount_type: 'percentage', discount_value: 10, min_subtotal: 1999 }
    assert.equal(computeCouponDiscountPaise(pct, 199800), 0)
    assert.equal(computeCouponDiscountPaise(pct, 199950), 20000)
    const fixed = { active: true, discount_type: 'fixed', discount_value: 500, min_subtotal: 0 }
    assert.equal(computeCouponDiscountPaise(fixed, 30000), 30000, 'never more than the subtotal')
    assert.equal(computeCouponDiscountPaise({ ...fixed, active: false }, 30000), 0)
  })
})

describe('shipping status monotonicity', () => {
  test('forward only, delivered/rto terminal', () => {
    assert.equal(nextShippingStatus('not_shipped', 'shipped'), 'shipped')
    assert.equal(nextShippingStatus('shipped', 'delivered'), 'delivered')
    assert.equal(nextShippingStatus('delivered', 'shipped'), null)
    assert.equal(nextShippingStatus('out_for_delivery', 'shipped'), null)
    assert.equal(nextShippingStatus('shipped', 'rto'), 'rto')
    assert.equal(nextShippingStatus('rto', 'delivered'), null)
    assert.equal(nextShippingStatus('shipped', 'shipped'), null)
  })
})

describe('identifiers and tokens', () => {
  test('order ref format matches public.generate_order_ref()', () => {
    assert.match(generateOrderRef(new Date('2026-10-17T00:00:00Z')), /^VLQ-261017053000-[0-9A-F]{4}$/)
  })

  test('order tokens: hash is stable, ciphertext round-trips and is tamper-evident', () => {
    const token = crypto.uuid()
    assert.equal(crypto.hashOrderToken(token), crypto.hashOrderToken(token.toUpperCase()))
    const enc = crypto.encryptOrderToken(token)
    assert.equal(crypto.decryptOrderToken(enc), token)
    assert.equal(crypto.decryptOrderToken(`${enc.slice(0, -4)}AAAA`), null)
  })

  test('password hashing', async () => {
    const hash = await crypto.hashPassword('s3cret!')
    assert.equal(await crypto.verifyPassword('s3cret!', hash), true)
    assert.equal(await crypto.verifyPassword('wrong', hash), false)
    assert.equal(await crypto.verifyPassword('x', 'plaintext'), false)
  })
})
