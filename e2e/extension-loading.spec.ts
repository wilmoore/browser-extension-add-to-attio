import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * E2E tests for Add to Attio Chrome extension.
 *
 * These tests verify that the extension loads correctly in Chrome.
 * Chrome extensions require headed mode (headless: false).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let context: BrowserContext;

test.beforeAll(async () => {
  const pathToExtension = path.join(__dirname, '../dist');

  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
});

test.afterAll(async () => {
  await context.close();
});

test('extension loads successfully', async () => {
  // Get the extension ID from the service worker
  let extensionId: string | undefined;

  // Wait for service worker to be available
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length > 0) {
    const url = serviceWorkers[0].url();
    extensionId = url.split('/')[2];
  }

  expect(extensionId).toBeDefined();
  expect(extensionId).not.toBe('');
});

test('content script injects on LinkedIn profile', async () => {
  const page = await context.newPage();

  // Navigate to a LinkedIn profile page
  await page.goto('https://www.linkedin.com/in/example');

  // TODO: Add assertions for content script behavior
  // Example: check for injected UI elements

  await page.close();
});
