/**
 * Test setup file for Vitest
 * Mocks Chrome extension APIs before tests run
 */

import { vi } from 'vitest';

// Mock chrome global before any tests run
vi.stubGlobal('chrome', {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    get: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
    },
    onActivated: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
  },
});
