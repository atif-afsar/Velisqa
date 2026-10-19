import crypto from 'node:crypto'
import { expect, test } from '@playwright/test'
import { API, addToBag, choosePayment, e2eConfig, fillCheckout, orderInDb, placeOrder, productByName, stubRazorpay, watch } from './helpers.js'

/**
 * Online payments through the real storefront + API. Only Razorpay's own servers are replaced:
 * the Orders API is faked by the e2e server, and checkout.js by a stand-in that signs the
 * payment like Razorpay does — so the API's signature verification runs for real.
 */
async function startOnlineCheckout(page, request, productName) {
  const product = await productByName(request, productName)
  await addToBag(page, product)
  await page.goto('/checkout')
  await fillCheckout(page)
  await choosePayment(page, 'online')
  const order = await placeOrder(page)
  return { product, order }
}

async function waitForPayment(request, ref, status) {
  await expect.poll(async () => (await orderInDb(request, ref))?.payment_status, { timeout: 15_000 }).toBe(status)
}

test.describe('Razorpay online payment', () => {
  test('RZ-01 successful payment: modal gets the server amount, signature verified, order paid, stock taken once', async ({ page, request }) => {
    const problems = watch(page)
    const seen = await stubRazorpay(page, request, 'pay')
    const { product, order } = await startOnlineCheckout(page, request, 'E2E Iris Chain Bracelet')

    // Prepaid orders have no COD fee: total = price.
    expect(order.grand_total).toBe(product.price)
    await waitForPayment(request, order.order_ref, 'paid')
    expect(seen[0]).toMatchObject({ key: 'rzp_test_e2e', amount: product.price * 100, currency: 'INR' })
    expect(seen[0].order_id).toMatch(/^order_e2e_/)

    await expect(page).toHaveURL(new RegExp(`/order-confirmation/${order.order_ref}`))
    await expect(page.locator('main')).toContainText(order.order_ref)
    await expect(page.locator('main')).toContainText(/order successfully placed/i)
    expect((await productByName(request, product.name)).stock).toBe(product.stock - 1)
    expect(problems).toEqual([])
  })

  test('RZ-02 shopper closes the popup: order saved unpaid, stock untouched, retry from the pay link succeeds', async ({ page, request, browser }) => {
    await stubRazorpay(page, request, 'dismiss')
    const { product, order } = await startOnlineCheckout(page, request, 'E2E Aurelia Layered Necklace')
    await expect(page.locator('main')).toContainText('Payment was not completed')
    const saved = await orderInDb(request, order.order_ref)
    expect(saved.payment_status).toBe('awaiting_payment')
    expect((await productByName(request, product.name)).stock).toBe(product.stock)

    // Retry later from the private pay link (fresh tab), this time completing the payment.
    const retry = await browser.newContext()
    const pay = await retry.newPage()
    await stubRazorpay(pay, request, 'pay')
    await pay.goto(`/pay/${order.order_ref}?token=${order.access_token}`)
    await waitForPayment(request, order.order_ref, 'paid')
    await expect(pay).toHaveURL(new RegExp(`/order-confirmation/${order.order_ref}`))
    expect((await productByName(request, product.name)).stock).toBe(product.stock - 1)
    await retry.close()
  })

  test('RZ-03 forged signature is never accepted as payment', async ({ page, request }) => {
    await stubRazorpay(page, request, 'tamper')
    const verify = page.waitForResponse((res) => res.url().includes('/payments/razorpay/verify'))
    const { product, order } = await startOnlineCheckout(page, request, 'E2E Solace Stacking Ring')
    expect((await verify).status()).toBeGreaterThanOrEqual(400)
    expect((await orderInDb(request, order.order_ref)).payment_status).toBe('awaiting_payment')
    expect((await productByName(request, product.name)).stock).toBe(product.stock)
    // The shopper is told the truth and offered a way to pay, not a success screen.
    await expect(page.locator('main')).toContainText(/payment not confirmed yet/i)
    await expect(page.locator('main')).not.toContainText(/order successfully placed/i)
    await expect(page.getByRole('link', { name: 'Complete payment' })).toHaveAttribute('href', `/pay/${order.order_ref}?token=${order.access_token}`)
  })

  test('RZ-04 webhook confirms a payment even if the browser never came back (and replays are ignored)', async ({ page, request }) => {
    const seen = await stubRazorpay(page, request, 'dismiss')
    const { product, order } = await startOnlineCheckout(page, request, 'E2E Celeste Pendant Necklace')
    await expect(page.locator('main')).toContainText('Payment was not completed')
    const { razorpayWebhookSecret } = await e2eConfig(request)

    const event = {
      entity: 'event',
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_wh_${Date.now()}`, order_id: seen[0].order_id, amount: seen[0].amount, method: 'upi' } } },
    }
    const raw = JSON.stringify(event)
    const send = (signature, eventId) =>
      request.post(`${API}/webhooks/razorpay`, {
        headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': signature, 'X-Razorpay-Event-Id': eventId },
        data: raw,
      })
    expect((await send('0'.repeat(64), 'evt_bad')).status()).toBe(400)
    const good = crypto.createHmac('sha256', razorpayWebhookSecret).update(raw).digest('hex')
    expect((await send(good, `evt_${order.order_ref}`)).status()).toBe(200)
    await waitForPayment(request, order.order_ref, 'paid')
    const replay = await (await send(good, `evt_${order.order_ref}`)).json()
    expect(replay.data.duplicate).toBe(true)
    expect((await productByName(request, product.name)).stock).toBe(product.stock - 1)
  })

  test('RZ-05 paid orders cannot be charged again from the pay link', async ({ page, request }) => {
    await stubRazorpay(page, request, 'pay')
    const { order } = await startOnlineCheckout(page, request, 'E2E Luna Drop Earrings')
    await waitForPayment(request, order.order_ref, 'paid')
    const res = await request.post(`${API}/payments/razorpay/orders`, {
      headers: { Origin: 'http://localhost:5199' },
      data: { orderRef: order.order_ref, accessToken: order.access_token },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})
