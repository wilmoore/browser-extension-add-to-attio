/**
 * Tests for Chrome storage wrapper
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  isAuthenticated,
  updateLastSync,
  getLastSync,
  STORAGE_KEYS,
} from './storage.js';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

beforeEach(() => {
  // Clear mock storage
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);

  // Mock chrome.storage.local
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn((keys: string | string[]) => {
          const keysArray = Array.isArray(keys) ? keys : [keys];
          const result: Record<string, unknown> = {};
          keysArray.forEach(key => {
            if (mockStorage[key] !== undefined) {
              result[key] = mockStorage[key];
            }
          });
          return Promise.resolve(result);
        }),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(mockStorage, items);
          return Promise.resolve();
        }),
        remove: vi.fn((keys: string | string[]) => {
          const keysArray = Array.isArray(keys) ? keys : [keys];
          keysArray.forEach(key => delete mockStorage[key]);
          return Promise.resolve();
        }),
      },
    },
  });
});

describe('STORAGE_KEYS', () => {
  it('has API_KEY defined', () => {
    expect(STORAGE_KEYS.API_KEY).toBe('attio_api_key');
  });

  it('has LAST_SYNC defined', () => {
    expect(STORAGE_KEYS.LAST_SYNC).toBe('last_sync_timestamp');
  });
});

describe('getApiKey', () => {
  it('returns null when no API key is stored', async () => {
    const result = await getApiKey();
    expect(result).toBeNull();
  });

  it('returns the stored API key', async () => {
    mockStorage[STORAGE_KEYS.API_KEY] = 'test-api-key';
    const result = await getApiKey();
    expect(result).toBe('test-api-key');
  });
});

describe('setApiKey', () => {
  it('stores the API key', async () => {
    await setApiKey('new-api-key');
    expect(mockStorage[STORAGE_KEYS.API_KEY]).toBe('new-api-key');
  });
});

describe('clearApiKey', () => {
  it('removes the stored API key', async () => {
    mockStorage[STORAGE_KEYS.API_KEY] = 'test-api-key';
    await clearApiKey();
    expect(mockStorage[STORAGE_KEYS.API_KEY]).toBeUndefined();
  });
});

describe('isAuthenticated', () => {
  it('returns false when no API key is stored', async () => {
    const result = await isAuthenticated();
    expect(result).toBe(false);
  });

  it('returns false when API key is empty string', async () => {
    mockStorage[STORAGE_KEYS.API_KEY] = '';
    const result = await isAuthenticated();
    expect(result).toBe(false);
  });

  it('returns true when API key is stored', async () => {
    mockStorage[STORAGE_KEYS.API_KEY] = 'valid-api-key';
    const result = await isAuthenticated();
    expect(result).toBe(true);
  });
});

describe('updateLastSync', () => {
  it('stores the current timestamp', async () => {
    const beforeTimestamp = Date.now();
    await updateLastSync();
    const afterTimestamp = Date.now();

    const storedTimestamp = mockStorage[STORAGE_KEYS.LAST_SYNC] as number;
    expect(storedTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    expect(storedTimestamp).toBeLessThanOrEqual(afterTimestamp);
  });
});

describe('getLastSync', () => {
  it('returns null when no timestamp is stored', async () => {
    const result = await getLastSync();
    expect(result).toBeNull();
  });

  it('returns the stored timestamp', async () => {
    const timestamp = 1234567890;
    mockStorage[STORAGE_KEYS.LAST_SYNC] = timestamp;
    const result = await getLastSync();
    expect(result).toBe(timestamp);
  });
});
