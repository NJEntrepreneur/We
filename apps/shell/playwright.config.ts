import { defineConfig, devices } from '@playwright/test';

// Base URL for the shell app — set PLAYWRIGHT_BASE_URL in CI or .env.e2e
const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  // Run all tests in each file sequentially by default; collab.spec.ts
  // overrides to serial at the describe level.
  fullyParallel: false,

  // Retry once on CI to reduce flake impact
  retries: process.env['CI'] ? 1 : 0,

  // Keep workers=1 so the two-context collab test does not race with itself
  workers: process.env['CI'] ? 1 : 1,

  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
