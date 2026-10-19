import crypto from 'node:crypto'
import { expect } from '@playwright/test'

export const API = 'http://localhost:5198/api/v1'
const E2E = 'http://localhost:5198/__e2e'

let configCache = null
/** Credentials and secrets of the throwaway e2e server (see backend/scripts/e2e-server.mjs). */
export async function e2eConfig(request) {
  if (!configCache) configCache = await (await request.get(`${E2E}/config`)).json()
  return configCache
}

export async function orderInDb(request, ref) {
  return (await request.get(`${E2E}/order/${ref}`)).json()
}

export async function products(request, search = '') {
  const body = await (await request.get(`${API}/products${search ? `?search=${encodeURIComponent(search)}` : ''}`)).json()
  return body.data.products
}

export async function productByName(request, name) {
  return (await products(request)).find((p) => p.name === name)
}

/** Fails the test on uncaught page errors or 5xx API responses. */
export function watch(page) {
  const problems = []
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('response', (res) => {
    if (res.url().includes('/api/v1/') && res.status() >= 500) problems.push(`${res.status()} ${res.request().method()} ${res.url()}`)
  })
  page.on('request', (req) => {
    if (/supabase\.(co|in)/.test(req.url())) problems.push(`Supabase request: ${req.url()}`)
  })
  return problems
}

export async function addToBag(page, product) {
  await page.goto(`/product/${product.id}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: /add to bag/i }).first().click()
}

export async function fillCheckout(page, { name = 'E2E Shopper', phone = '9876543210', email = '' } = {}) {
  await page.getByLabel('Mobile number').fill(phone)
  await page.getByLabel('Full name').fill(name)
  if (email) await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel('Pincode').fill('202001')
  await page.getByLabel('City').fill('Aligarh')
  await page.getByLabel('Address').fill('12 Test Lane, Civil Lines')
  await page.getByLabel('State').fill('Uttar Pradesh')
}

export async function choosePayment(page, method) {
  await page.locator(`input[name="payment"][value="${method}"]`).check({ force: true })
}

/** Places the order from /checkout and returns the API's order payload. */
export async function placeOrder(page) {
  const response = page.waitForResponse((res) => res.url().endsWith('/api/v1/orders') && res.request().method() === 'POST')
  await page.getByRole('button', { name: /^(place order|pay now)/i }).click()
  const body = await (await response).json()
  expect(body.success, JSON.stringify(body.error)).toBe(true)
  return body.data
}

export async function signInAdmin(page, request) {
  const { admin } = await e2eConfig(request)
  await page.goto('/admin')
  await page.getByPlaceholder('Admin email').fill(admin.email)
  await page.getByPlaceholder('Password').fill(admin.password)
  await page.getByRole('button', { name: /enter dashboard/i }).click()
  await expect(page).toHaveURL(/\/admin\/home/)
}

export async function signInCustomer(page, request, creds) {
  const { customer } = await e2eConfig(request)
  const { email, password } = creds || customer
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: /sign in with email/i }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

/** HMAC the way Razorpay signs a successful checkout: order_id|payment_id with the key secret. */
export function razorpaySignature(secret, orderId, paymentId) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

/**
 * Replaces checkout.razorpay.com/v1/checkout.js with a stand-in that behaves like the real modal:
 *   mode 'pay'     → calls options.handler with a signature made by the test (Node side)
 *   mode 'dismiss' → calls options.modal.ondismiss (shopper closed the popup)
 *   mode 'tamper'  → calls options.handler with a forged signature
 * Returns a record of what the storefront passed to `new Razorpay(options)`.
 */
export async function stubRazorpay(page, request, mode = 'pay') {
  const { razorpaySecret } = await e2eConfig(request)
  const seen = []
  await page.exposeFunction('__e2eRazorpaySign', (orderId, paymentId) =>
    mode === 'tamper' ? 'f'.repeat(64) : razorpaySignature(razorpaySecret, orderId, paymentId),
  )
  await page.exposeFunction('__e2eRazorpaySeen', (options) => seen.push(options))
  await page.route('https://checkout.razorpay.com/v1/checkout.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.Razorpay = function (options) {
        this.open = async function () {
          await window.__e2eRazorpaySeen({ key: options.key, amount: options.amount, currency: options.currency, order_id: options.order_id })
          if (${JSON.stringify(mode)} === 'dismiss') { options.modal && options.modal.ondismiss && options.modal.ondismiss(); return }
          const paymentId = 'pay_e2e_' + Date.now()
          const signature = await window.__e2eRazorpaySign(options.order_id, paymentId)
          options.handler({ razorpay_order_id: options.order_id, razorpay_payment_id: paymentId, razorpay_signature: signature })
        }
        this.on = function () {}
      }`,
    }),
  )
  return seen
}
