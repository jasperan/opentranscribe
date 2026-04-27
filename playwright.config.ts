import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_PORT = Number.parseInt(
  process.env.PLAYWRIGHT_PORT ?? '3100',
  10
);
const PLAYWRIGHT_BASE_URL = `http://localhost:${PLAYWRIGHT_PORT}`;

/**
 * Playwright configuration for Verbatim Next.js application.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  expect: {
    timeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PLAYWRIGHT_PORT}`,
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      NEXT_PUBLIC_DISABLE_DEV_SHORTCUTS: 'true',
      DISABLE_DEV_SHORTCUTS: 'true',
      VERBATIM_URL: PLAYWRIGHT_BASE_URL,
      NODE_OPTIONS: '',
    },
  },
});
