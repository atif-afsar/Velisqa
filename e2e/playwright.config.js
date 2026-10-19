import { defineConfig } from '@playwright/test'

/**
 * Browser tests against a self-contained stack — no database or keys needed:
 *   - API: ../backend/scripts/e2e-server.mjs on :5198 (in-memory MongoDB, seeded fixtures,
 *     Razorpay/NimbusPost HTTP faked; signatures still verified for real)
 *   - storefront: Vite dev server on :5199, proxying /api to :5198
 * Both are started (and stopped) by Playwright. Your normal dev servers on :5000/:5173 are untouched.
 *
 *   npm test                      # all suites
 *   npx playwright test checkout  # one file
 */
const API_PORT = 5198
const WEB_PORT = 5199

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node ../backend/scripts/e2e-server.mjs',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      env: { E2E_API_PORT: String(API_PORT), E2E_WEB_PORT: String(WEB_PORT) },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm --prefix ../frontend run dev',
      url: `http://localhost:${WEB_PORT}`,
      env: { VELISQA_DEV_PORT: String(WEB_PORT), VELISQA_DEV_API: `http://localhost:${API_PORT}`, VITE_API_BASE_URL: '/api/v1' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
