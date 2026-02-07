import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for browser extension E2E testing.
 *
 * Note: Chrome extensions require headed mode (headless: false).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Extensions need sequential tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for extension testing
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        browserName: 'chromium',
        headless: false, // Extensions require headed mode
      },
    },
  ],
});
