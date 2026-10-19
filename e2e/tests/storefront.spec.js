import { expect, test } from '@playwright/test'
import { addToBag, productByName, watch } from './helpers.js'

test.describe('Storefront browsing', () => {
  test('SF-01 home page loads the catalogue from the API and shows the built-in hero', async ({ page }) => {
    const problems = watch(page)
    await page.goto('/')
    await expect(page.locator('section[aria-roledescription="carousel"] img').first()).toBeVisible()
    await expect(page.locator('body')).toContainText('E2E Aurelia Layered Necklace')
    expect(problems).toEqual([])
  })

  test('SF-02 shop-all lists every in-catalogue product with price and MRP', async ({ page }) => {
    const problems = watch(page)
    await page.goto('/collections')
    for (const name of ['E2E Luna Drop Earrings', 'E2E Solace Stacking Ring', 'E2E Saanvi Kada Bangle']) {
      await expect(page.locator('body')).toContainText(name)
    }
    await expect(page.locator('body')).toContainText('₹349')
    expect(problems).toEqual([])
  })

  test('SF-03 category page shows only that category', async ({ page }) => {
    await page.goto('/collections/rings')
    await expect(page.locator('body')).toContainText('E2E Solace Stacking Ring')
    await expect(page.locator('main')).not.toContainText('E2E Luna Drop Earrings')
  })

  test('SF-04 search finds products by name and shows an empty state for nonsense', async ({ page }) => {
    await page.goto('/search?q=Celeste')
    await expect(page.locator('main')).toContainText('E2E Celeste Pendant Necklace')
    await expect(page.locator('main')).not.toContainText('E2E Saanvi Kada Bangle')
    await page.goto('/search?q=zzqqxx-nothing')
    await expect(page.locator('main')).not.toContainText('E2E ')
  })

  test('SF-05 product page shows name, price, discount and adds to the bag', async ({ page, request }) => {
    const product = await productByName(request, 'E2E Luna Drop Earrings')
    await addToBag(page, product)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luna Drop Earrings')
    await expect(page.locator('main')).toContainText('₹349')
    await page.goto('/cart')
    await expect(page.locator('main')).toContainText('Luna Drop Earrings')
  })

  test('SF-06 sold-out products cannot be added to the bag', async ({ page, request }) => {
    const product = await productByName(request, 'E2E Sold Out Earrings')
    await page.goto(`/product/${product.id}`)
    await expect(page.locator('main')).toContainText(/sold out/i)
    const add = page.getByRole('button', { name: /^add to bag$/i })
    if (await add.count()) await expect(add.first()).toBeDisabled()
  })

  test('SF-07 wishlist: save from the product page, see it on /wishlist, remove it', async ({ page, request }) => {
    const product = await productByName(request, 'E2E Iris Chain Bracelet')
    await page.goto(`/product/${product.id}`)
    await page.getByRole('button', { name: `Save ${product.name} to wishlist` }).first().click()
    await page.goto('/wishlist')
    await expect(page.locator('main')).toContainText('Iris Chain Bracelet')
    await page.getByRole('button', { name: `Remove ${product.name} from wishlist` }).first().click()
    await expect(page.locator('main')).not.toContainText('Iris Chain Bracelet')
  })

  test('SF-08 unknown pages show the not-found page, info pages render', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-123')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('This page has moved on')
    for (const path of ['/about', '/faq', '/contact', '/shipping-delivery', '/refund-cancellation', '/privacy', '/terms']) {
      const problems = watch(page)
      await page.goto(path)
      await expect(page.locator('main')).not.toBeEmpty()
      expect(problems, path).toEqual([])
    }
  })
})
