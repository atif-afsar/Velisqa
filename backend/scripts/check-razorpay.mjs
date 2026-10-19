/**
 * Live check of the Razorpay setup against Razorpay's real TEST environment.
 *
 *   npm run check:razorpay
 *
 * Reads RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET from backend/.env and:
 *   1. refuses live keys (rzp_live_…) — this script never touches real money
 *   2. creates a ₹1 test order through the same provider code the API uses (proves the keys work)
 *   3. checks the signature maths the API uses for checkout callbacks and webhooks
 * No order is paid and nothing is written to the database.
 */
import crypto from 'node:crypto'
import { env } from '../src/config/env.js'
import { createRazorpayOrder, isRazorpayConfigured, verifyPaymentSignature, verifyWebhookSignature } from '../src/providers/razorpay.js'

const results = []
const check = (name, pass, detail = '') => {
  results.push({ check: name, result: pass ? 'PASS' : 'FAIL', detail })
  return pass
}

const keyId = env.RAZORPAY_KEY_ID || ''
if (!check('keys present', isRazorpayConfigured(), isRazorpayConfigured() ? keyId.slice(0, 12) + '…' : 'set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env')) finish()
if (!check('test-mode key', keyId.startsWith('rzp_test_'), keyId.startsWith('rzp_live_') ? 'live key refused — use rzp_test_ keys for checks' : keyId.slice(0, 9))) finish()

try {
  const order = await createRazorpayOrder({ amountPaise: 100, receipt: `check_${Date.now()}`, notes: { purpose: 'velisqa setup check' } })
  check('create test order (₹1)', Boolean(order.id) && order.amount === 100, `${order.id} status=${order.status}`)

  const paymentId = 'pay_check_' + Date.now()
  const good = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${order.id}|${paymentId}`).digest('hex')
  check('checkout signature accepted', verifyPaymentSignature({ orderId: order.id, paymentId, signature: good }))
  check('forged signature rejected', !verifyPaymentSignature({ orderId: order.id, paymentId, signature: 'f'.repeat(64) }))
} catch (error) {
  check('create test order (₹1)', false, error.message)
}

if (env.RAZORPAY_WEBHOOK_SECRET) {
  const raw = JSON.stringify({ event: 'payment.captured', check: true })
  const sig = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex')
  check('webhook signature accepted', verifyWebhookSignature(raw, sig))
  check('webhook forged signature rejected', !verifyWebhookSignature(raw, '0'.repeat(64)))
} else {
  check('webhook secret present', false, 'set RAZORPAY_WEBHOOK_SECRET (Dashboard → Webhooks) so payments confirm even if the shopper closes the tab')
}
finish()

function finish() {
  console.table(results)
  const failed = results.filter((row) => row.result === 'FAIL').length
  console.log(failed ? `${failed} check(s) failed.` : 'Razorpay test-mode setup looks good. Next: a real test payment in the browser (card 4111 1111 1111 1111, any future expiry, any CVV, OTP from the test page).')
  process.exit(failed ? 1 : 0)
}
