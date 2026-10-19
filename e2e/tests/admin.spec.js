import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { API, addToBag, choosePayment, e2eConfig, fillCheckout, orderInDb, placeOrder, productByName, signInAdmin, signInCustomer, watch } from './helpers.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const image = (n) => path.join(here, '..', '..', 'frontend', 'public', 'images', `img${n}.webp`)

const ADMIN_PAGES = ['/admin/home', '/admin/orders', '/admin/payments', '/admin/returns', '/admin/panel', '/admin/bulk', '/admin/reviews', '/admin/coupons', '/admin/hero', '/admin/analytics']

test.describe('Admin console', () => {
  for (const [label, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
    test(`AD-01 every admin page renders without errors or sideways scroll (${label})`, async ({ page, request }) => {
      await page.setViewportSize({ width, height })
      const problems = watch(page)
      page.on('response', (res) => {
        if (res.url().includes('/api/v1/admin') && res.status() >= 400) problems.push(`${res.status()} ${res.url()}`)
      })
      await signInAdmin(page, request)
      await expect(page.locator('footer')).toHaveCount(0) // storefront chrome hidden
      for (const route of ADMIN_PAGES) {
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        expect((await page.locator('main').innerText()).trim().length, `${route} is blank`).toBeGreaterThan(40)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `${route} scrolls sideways`).toBeLessThanOrEqual(2)
      }
      if (label === 'phone') {
        await page.getByRole('button', { name: /^menu/i }).click()
        await expect(page.getByRole('dialog', { name: 'Admin menu' })).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog', { name: 'Admin menu' })).toHaveCount(0)
      }
      expect(problems).toEqual([])
    })
  }

  test('AD-02 dashboard: date-range presets reload the summary and count new orders', async ({ page, request }) => {
    await addToBag(page, await productByName(request, 'E2E Free Gift Studs'))
    await page.goto('/checkout')
    await fillCheckout(page)
    await choosePayment(page, 'cod')
    await placeOrder(page)

    await signInAdmin(page, request)
    for (const preset of ['7 days', '30 days', 'This month', 'Today']) {
      const summary = page.waitForResponse((res) => res.url().includes('/admin/dashboard/summary'))
      await page.getByRole('group', { name: 'Date range' }).getByRole('button', { name: preset, exact: true }).click()
      expect((await summary).status()).toBe(200)
    }
    const today = await (await page.waitForResponse((res) => res.url().includes('/admin/dashboard/summary'), { timeout: 2000 }).catch(() => null))
    void today
    await page.reload()
    const body = await (await page.waitForResponse((res) => res.url().includes('/admin/dashboard/summary'))).json()
    expect(body.data.orders).toBeGreaterThan(0)
  })

  test('AD-03 products: validation, edit price, delete — storefront follows', async ({ page, request }) => {
    await signInAdmin(page, request)
    await page.goto('/admin/panel')
    // Name and price filled, but no image: the console explains what is missing.
    await page.locator('label').filter({ hasText: /^Name/ }).locator('input').first().fill('E2E Draft Without Image')
    await page.getByRole('spinbutton', { name: 'Selling price (₹)' }).fill('199')
    await page.getByRole('button', { name: 'Add product' }).click()
    // Either the browser's required-field check or the console's own message stops it.
    await expect.poll(async () => (await page.locator('main form :invalid').count()) > 0 || /Please add at least one product image|Please choose|must be/.test(await page.locator('main').innerText())).toBe(true)
    expect(await productByName(request, 'E2E Draft Without Image')).toBeUndefined()

    const product = await productByName(request, 'E2E Admin Edit Pendant')
    await page.getByPlaceholder('Search products by name...').fill('Admin Edit Pendant')
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click()
    const price = page.getByRole('spinbutton', { name: 'Selling price (₹)' })
    await expect(price).toHaveValue(String(product.price))
    await price.fill('479')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect.poll(async () => (await productByName(request, product.name)).price).toBe(479)

    const doomed = await productByName(request, 'E2E Admin Delete Anklet')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByPlaceholder('Search products by name...').fill('Admin Delete Anklet')
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
    const confirm = page.getByRole('button', { name: /^delete/i }).last()
    if (await confirm.isVisible().catch(() => false)) await confirm.click()
    await expect.poll(async () => Boolean(await productByName(request, doomed.name))).toBe(false)
  })

  test('AD-04 bulk CSV import publishes valid rows and reports bad ones', async ({ page, request }) => {
    await signInAdmin(page, request)
    await page.goto('/admin/bulk')
    await page.getByRole('button', { name: /from spreadsheet/i }).click()
    const name = `E2E Bulk Studs ${Date.now()}`
    const csv = `name,price,mrp,category,stock,image_urls\n"${name}",399,599,Earrings,4,http://localhost:5199/images/img4.webp\n,0,,,,\n`
    await page.locator('input[type="file"][accept*=".csv"]').setInputFiles({ name: 'products.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
    await expect(page.locator('main')).toContainText('1 of 2 rows ready')
    await page.getByRole('button', { name: /publish 1 product/i }).click()
    await expect(page.locator('main')).toContainText('1 product published')
    expect((await productByName(request, name))?.price).toBe(399)
  })

  test('AD-05 coupons: create → works at checkout → switch off → refused', async ({ page, request, browser }) => {
    await signInAdmin(page, request)
    await page.goto('/admin/coupons')
    await page.getByPlaceholder('e.g. FESTIVE20').fill('ADMIN25')
    await page.locator('select').filter({ has: page.locator('option[value="fixed"]') }).selectOption('fixed')
    await page.getByPlaceholder('e.g. 10 or 150').fill('25')
    await page.getByPlaceholder('e.g. 999').fill('0')
    await page.getByRole('button', { name: 'Create Coupon' }).click()
    await expect(page.locator('main')).toContainText('ADMIN25')

    const shopper = await browser.newContext()
    const shop = await shopper.newPage()
    await addToBag(shop, await productByName(request, 'E2E Luna Drop Earrings'))
    await shop.goto('/checkout')
    await shop.getByPlaceholder('Enter code').fill('ADMIN25')
    await shop.getByRole('button', { name: 'Apply' }).click()
    await expect(shop.locator('main')).toContainText('Coupon ADMIN25')

    await page.getByRole('row', { name: /ADMIN25/ }).getByRole('button', { name: 'Active' }).click()
    await expect(page.getByRole('row', { name: /ADMIN25/ }).getByRole('button', { name: 'Inactive' })).toBeVisible()
    const res = await request.get(`${API}/coupons/ADMIN25`)
    expect(res.status()).toBe(404)
    await shopper.close()
  })

  test('AD-06 homepage banners: upload two, set rotation, homepage shows and rotates them', async ({ page, request, browser }) => {
    await signInAdmin(page, request)
    await page.goto('/admin/hero')
    for (const n of [3, 4]) {
      await page.getByRole('button', { name: '+ Add banner' }).click()
      const card = page.locator('section.admin-card').last()
      await card.locator('input[type="file"]').first().setInputFiles(image(n))
      await expect(card.locator('img[src*="/api/v1/media/site/"]').first()).toBeVisible({ timeout: 20_000 })
    }
    await page.getByLabel('Change banner every').selectOption('3')
    await page.getByRole('button', { name: /publish banners/i }).click()
    await expect(page.locator('main')).toContainText('Banners published')
    const saved = (await (await request.get(`${API}/settings/hero`)).json()).data
    expect(saved.slides).toHaveLength(2)
    expect(saved.intervalSeconds).toBe(3)

    const visitor = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const home = await visitor.newPage()
    const requested = []
    home.on('request', (req) => requested.push(req.url()))
    await home.goto('/')
    await expect(home.locator('section[aria-roledescription="carousel"] img').first()).toHaveAttribute('src', /\/api\/v1\/media\/site\//)
    await home.mouse.move(5, 5)
    await expect(home.getByRole('button', { name: /show banner 2/i })).toHaveAttribute('aria-current', 'true', { timeout: 12_000 })
    expect(requested.some((url) => /hero-banner-/.test(url)), 'built-in banners must not load').toBe(false)
    await visitor.close()
  })

  test('AD-07 order lifecycle: ship → delivered → customer review → approve → return → approve', async ({ page, request, browser }) => {
    test.setTimeout(180_000)
    // Customer places a COD order while signed in.
    const shopperCtx = await browser.newContext()
    const shopper = await shopperCtx.newPage()
    await signInCustomer(shopper, request)
    const product = await productByName(request, 'E2E Celeste Pendant Necklace')
    await addToBag(shopper, product)
    await shopper.goto('/checkout')
    await fillCheckout(shopper)
    await choosePayment(shopper, 'cod')
    const order = await placeOrder(shopper)

    // Admin ships it through NimbusPost (faked courier API).
    await signInAdmin(page, request)
    await page.goto('/admin/orders')
    const card = page.locator('article').filter({ hasText: order.order_ref })
    await card.getByRole('button', { name: 'Ship via NimbusPost' }).click()
    await page.getByRole('button', { name: 'Ship now' }).click()
    await expect(card).toContainText('Shipped via NimbusPost')
    const shipped = await orderInDb(request, order.order_ref)
    const awb = shipped.nimbuspost_awb
    expect(awb).toBeTruthy()
    await expect(card).toContainText(awb)

    // Courier reports delivery.
    const { nimbusWebhookSecret } = await e2eConfig(request)
    const hook = await request.post(`${API}/webhooks/nimbuspost`, {
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': nimbusWebhookSecret },
      data: JSON.stringify({ awb_number: awb, status: 'delivered', event_time: new Date().toISOString() }),
    })
    expect(hook.status()).toBe(200)
    await expect.poll(async () => (await orderInDb(request, order.order_ref)).order_status).toBe('delivered')

    // Verified buyer reviews the product; it waits for moderation.
    const title = `Lovely piece ${crypto.randomBytes(3).toString('hex')}`
    await shopper.goto(`/product/${product.id}`)
    await shopper.getByRole('radiogroup', { name: 'Rating' }).getByRole('radio', { name: '5 stars' }).click()
    await shopper.getByPlaceholder('Beautiful everyday piece').fill(title)
    await shopper.getByPlaceholder(/Tell other customers/).fill('Looks exactly like the photos and arrived quickly.')
    await shopper.getByRole('button', { name: 'Submit for review' }).click()
    await expect(shopper.locator('main')).toContainText('Your review was submitted')

    await page.goto('/admin/reviews')
    await page.locator('article, li, section').filter({ hasText: title }).getByRole('button', { name: 'Approve' }).first().click()
    await expect.poll(async () => (await productByName(request, product.name)).review_count).toBe(1)
    const visitor = await browser.newContext()
    const anyone = await visitor.newPage()
    await anyone.goto(`/product/${product.id}`)
    await expect(anyone.locator('main')).toContainText(title)
    await visitor.close()

    // Customer requests a return from My Orders; admin approves it.
    await shopper.goto('/account/orders')
    await shopper.getByRole('button', { name: 'Request return' }).first().click()
    await expect(shopper.locator('main')).toContainText(/return (request )?(submitted|received|requested)|pending/i)
    await page.goto('/admin/returns')
    await page.getByRole('button', { name: 'Approve' }).first().click()
    await expect(page.locator('main')).toContainText(/approved/i)
    await shopperCtx.close()
  })
})
