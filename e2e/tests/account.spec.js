import { expect, test } from '@playwright/test'
import { addToBag, choosePayment, e2eConfig, fillCheckout, placeOrder, productByName, signInCustomer, watch } from './helpers.js'

test.describe('Customer accounts', () => {
  test('AC-01 sign up, sign in, session survives reload, sign out', async ({ page }) => {
    const problems = watch(page)
    const email = `new-${Date.now()}@e2e.test`
    await page.goto('/login')
    await page.getByRole('button', { name: /create an account/i }).click()
    await page.locator('#login-name').fill('New Customer')
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill('new-pass-12345')
    await page.getByRole('button', { name: /sign up with email/i }).click()
    await expect(page.locator('body')).toContainText('Account created. You can sign in now.')

    await page.locator('#login-password').fill('new-pass-12345')
    await page.getByRole('button', { name: /sign in with email/i }).click()
    await expect(page).not.toHaveURL(/\/login/)

    await page.goto('/account/orders')
    await page.reload()
    await expect(page).toHaveURL(/\/account\/orders/)

    await page.getByRole('button', { name: 'Account menu' }).first().click()
    await page.getByRole('menuitem', { name: /sign out/i }).first().click()
    await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0)
    await page.goto('/account/orders')
    await expect(page).not.toHaveURL(/\/account\/orders$/)
    expect(problems).toEqual([])
  })

  test('AC-02 wrong password and duplicate sign-up are refused with a message', async ({ page, request }) => {
    const { customer } = await e2eConfig(request)
    await page.goto('/login')
    await page.locator('#login-email').fill(customer.email)
    await page.locator('#login-password').fill('definitely-wrong-1')
    await page.getByRole('button', { name: /sign in with email/i }).click()
    await expect(page.locator('main')).toContainText(/invalid|incorrect/i)
    await expect(page).toHaveURL(/\/login/)

    await page.getByRole('button', { name: /create an account/i }).click()
    await page.locator('#login-name').fill('Dup')
    await page.locator('#login-email').fill(customer.email)
    await page.locator('#login-password').fill('another-pass-123')
    await page.getByRole('button', { name: /sign up with email/i }).click()
    await expect(page.locator('main')).toContainText(/already|exists|registered/i)
  })

  test('AC-03 orders placed while signed in appear in My Orders', async ({ page, request }) => {
    await signInCustomer(page, request)
    await addToBag(page, await productByName(request, 'E2E Free Gift Studs'))
    await page.goto('/checkout')
    await fillCheckout(page)
    await choosePayment(page, 'cod')
    const order = await placeOrder(page)
    await page.goto('/account/orders')
    await expect(page.locator('main')).toContainText(order.order_ref)
  })

  test('AC-04 customers cannot open the admin console or admin APIs', async ({ page, request }) => {
    await signInCustomer(page, request)
    const status = await page.evaluate(async () => (await fetch('/api/v1/admin/inbox', { credentials: 'include' })).status)
    expect(status).toBe(403)
    const { customer } = await e2eConfig(request)
    await page.goto('/admin')
    await page.getByPlaceholder('Admin email').fill(customer.email)
    await page.getByPlaceholder('Password').fill(customer.password)
    await page.getByRole('button', { name: /enter dashboard/i }).click()
    await expect(page).not.toHaveURL(/\/admin\/home/)
  })

  test('AC-05 password reset: request link never reveals accounts; a bad link is refused', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/reset-password/)
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
    await page.locator('main').getByPlaceholder('Email', { exact: true }).fill(`nobody-${Date.now()}@e2e.test`)
    await page.locator('main form button[type="submit"]').click()
    await expect(page.locator('main')).toContainText('If an account exists for that email')

    await page.goto('/reset-password?token=not-a-real-token-123')
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
    await page.getByPlaceholder('New password').fill('brand-new-pass-1')
    await page.locator('main form button[type="submit"]').click()
    await expect(page.locator('main')).not.toContainText('Password updated')
  })
})
