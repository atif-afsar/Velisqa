import { expect, test } from '@playwright/test'
import { addToBag, choosePayment, fillCheckout, orderInDb, placeOrder, productByName, watch } from './helpers.js'

const codTotal = (subtotal) => subtotal + 50 + Math.round(subtotal * 0.02)

test.describe('Bag and Cash-on-Delivery checkout', () => {
  test('CO-01 bag: change quantity and remove a line', async ({ page, request }) => {
    await addToBag(page, await productByName(request, 'E2E Solace Stacking Ring'))
    await page.goto('/cart')
    const items = page.getByRole('region', { name: 'Items in your bag' })
    await expect(items).toContainText('Solace Stacking Ring')
    await items.getByRole('button', { name: 'Increase quantity' }).first().click()
    await expect(page.getByRole('complementary', { name: 'Order summary' })).toContainText('₹498')
    await items.getByRole('button', { name: 'Decrease quantity' }).first().click()
    await expect(page.getByRole('complementary', { name: 'Order summary' })).toContainText('₹249')
    await items.getByRole('button', { name: /remove .* from bag/i }).first().click()
    await expect(page.locator('main')).toContainText('Your bag is empty')
  })

  test('CO-02 COD order: server-priced total, confirmation page, stock reserved', async ({ page, request }) => {
    const problems = watch(page)
    const product = await productByName(request, 'E2E Luna Drop Earrings')
    await addToBag(page, product)
    await page.goto('/checkout')
    await fillCheckout(page)
    await choosePayment(page, 'cod')
    const order = await placeOrder(page)
    expect(order.grand_total).toBe(codTotal(349))
    await expect(page).toHaveURL(new RegExp(`/order-confirmation/${order.order_ref}\\?token=`))
    await expect(page.locator('main')).toContainText(order.order_ref)
    const after = await productByName(request, 'E2E Luna Drop Earrings')
    expect(after.stock).toBe(product.stock - 1)
    const saved = await orderInDb(request, order.order_ref)
    expect(saved.payment_method).toBe('cod')
    expect(problems).toEqual([])
  })

  test('CO-03 coupon: valid code lowers the total, unknown and inactive codes are refused', async ({ page, request }) => {
    await addToBag(page, await productByName(request, 'E2E Aurelia Layered Necklace'))
    await page.goto('/checkout')
    const code = page.getByPlaceholder('Enter code')
    await code.fill('NOPE123')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    await code.fill('E2EOFF')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    await code.fill('E2E10')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.locator('main')).toContainText('Coupon E2E10')

    await fillCheckout(page)
    await choosePayment(page, 'cod')
    const order = await placeOrder(page)
    // 10% of ₹899 = ₹89.90 → ₹90 off; COD fee is on the discounted subtotal.
    const discounted = 899 - 90
    expect(order.grand_total).toBe(discounted + 50 + Math.round(discounted * 0.02))
  })

  test('CO-04 private tracking: the link works, a wrong token does not, customer can cancel', async ({ page, request }) => {
    const before = await productByName(request, 'E2E Saanvi Kada Bangle')
    await addToBag(page, before)
    await page.goto('/checkout')
    await fillCheckout(page)
    await choosePayment(page, 'cod')
    const order = await placeOrder(page)

    await page.goto(`/orders/${order.order_ref}?token=${order.access_token}`)
    await expect(page.locator('main')).toContainText(order.order_ref)
    await page.getByRole('button', { name: /^cancel order$/i }).click()
    await page.getByRole('button', { name: /yes, cancel order/i }).click()
    await expect(page.locator('main')).toContainText(/cancelled/i)
    expect((await orderInDb(request, order.order_ref)).order_status).toBe('cancelled')
    expect((await productByName(request, 'E2E Saanvi Kada Bangle')).stock).toBe(before.stock)

    const stranger = await page.context().browser().newContext()
    const other = await stranger.newPage()
    await other.goto(`/orders/${order.order_ref}?token=00000000-0000-0000-0000-000000000000`)
    await expect(other.locator('main')).not.toContainText('12 Test Lane')
    await stranger.close()
  })

  test('CO-05 the last unit can be bought once; afterwards it shows sold out', async ({ page, request }) => {
    const product = await productByName(request, 'E2E Last Piece Ring')
    expect(product.stock).toBe(1)
    await addToBag(page, product)
    await page.goto('/checkout')
    await fillCheckout(page)
    await choosePayment(page, 'cod')
    await placeOrder(page)
    expect((await productByName(request, 'E2E Last Piece Ring')).stock).toBe(0)
    await page.goto(`/product/${product.id}`)
    await expect(page.locator('main')).toContainText(/sold out/i)
  })

  test('CO-06 complimentary gift offer unlocks at ₹1,299', async ({ page, request }) => {
    await addToBag(page, await productByName(request, 'E2E Luna Drop Earrings'))
    await page.goto('/cart')
    await expect(page.getByLabel('Progress to complimentary gift')).toBeVisible()
    await addToBag(page, await productByName(request, 'E2E Celeste Pendant Necklace'))
    await page.goto('/cart')
    await expect(page.getByRole('region', { name: 'Choose your complimentary gift' })).toBeVisible()
  })

  test('CO-07 checkout validation: missing details never create an order', async ({ page, request }) => {
    await addToBag(page, await productByName(request, 'E2E Luna Drop Earrings'))
    await page.goto('/checkout')
    let posted = false
    page.on('request', (req) => {
      if (req.url().endsWith('/api/v1/orders') && req.method() === 'POST') posted = true
    })
    await choosePayment(page, 'cod')
    await page.getByRole('button', { name: /^place order/i }).click()
    await page.waitForTimeout(1000)
    expect(posted).toBe(false)
    await expect(page).toHaveURL(/\/checkout/)
  })
})

test.describe('Abandoned-checkout capture', () => {
  test('CO-08 the bag is sent to the server only after the shopper opts in', async ({ page, request }) => {
    await addToBag(page, await productByName(request, 'E2E Solace Stacking Ring'))
    const leads = []
    page.on('request', (req) => {
      if (req.url().endsWith('/checkout/lead') && req.method() === 'POST') leads.push(req.postDataJSON())
    })
    await page.goto('/checkout')
    const email = page.getByRole('textbox', { name: /^Email/ })
    await email.fill('shopper+lead@example.com')
    await page.waitForTimeout(2200)
    expect(leads).toEqual([]) // typed an email but never ticked the box

    const consent = page.getByRole('checkbox', { name: /personal 10% off code/i })
    await expect(consent).not.toBeChecked()
    await consent.check()
    await expect.poll(() => leads.length, { timeout: 8000 }).toBe(1)
    expect(leads[0]).toMatchObject({ email: 'shopper+lead@example.com', consent: true })
    expect(leads[0].items).toHaveLength(1)
    expect(leads[0].items[0].quantity).toBe(1)
  })

  test('CO-09 a recovery-email link (?coupon=) applies the code at checkout', async ({ page, request }) => {
    await addToBag(page, await productByName(request, 'E2E Aurelia Layered Necklace'))
    await page.goto('/checkout?coupon=e2e10')
    await expect(page.getByText('Coupon E2E10')).toBeVisible()
  })
})
