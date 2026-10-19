import { env } from '../config/env.js'
import { hmacHex, safeEqual } from '../lib/crypto.js'
import { ProviderError, unavailable } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

let fetchImpl = (...args) => fetch(...args)
export function setRazorpayFetch(fn) {
  fetchImpl = fn || ((...args) => fetch(...args))
}

export const isRazorpayConfigured = () => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)

/** Checkout callback signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!env.RAZORPAY_KEY_SECRET) throw unavailable('Online payments are not configured.')
  return safeEqual(hmacHex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), String(signature || ''))
}

/** Webhook signature over the exact raw request bytes. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw unavailable('Razorpay webhook secret is not configured.')
  return safeEqual(hmacHex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), String(signature || ''))
}

export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  if (!isRazorpayConfigured()) throw unavailable('Online payments are not configured right now. Please choose Cash on Delivery.')
  const response = await fetchImpl('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(20_000),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.id) {
    logger.error('Razorpay order API failed', { status: response.status, code: data?.error?.code })
    throw new ProviderError('The payment gateway is unavailable right now. Please try again in a moment.', 502)
  }
  return data
}
