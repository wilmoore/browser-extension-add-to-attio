/**
 * Chrome storage wrapper for managing extension state
 */

import type { StorageKeys } from '../types/index.js';

export const STORAGE_KEYS: StorageKeys = {
  API_KEY: 'attio_api_key',
  LAST_SYNC: 'last_sync_timestamp',
};

/**
 * Get the stored Attio API key
 */
export async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
  return result[STORAGE_KEYS.API_KEY] || null;
}

/**
 * Save the Attio API key
 */
export async function setApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: apiKey });
}

/**
 * Clear the stored API key (disconnect)
 */
export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.API_KEY);
}

/**
 * Check if the extension is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const apiKey = await getApiKey();
  return apiKey !== null && apiKey.length > 0;
}

/**
 * Update the last sync timestamp
 */
export async function updateLastSync(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: Date.now() });
}

/**
 * Get the last sync timestamp
 */
export async function getLastSync(): Promise<number | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC);
  return result[STORAGE_KEYS.LAST_SYNC] || null;
}
