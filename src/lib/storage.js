/**
 * Chrome storage wrapper for managing extension state
 */

const STORAGE_KEYS = {
  API_KEY: 'attio_api_key',
  LAST_SYNC: 'last_sync_timestamp'
};

/**
 * Get the stored Attio API key
 * @returns {Promise<string|null>}
 */
export async function getApiKey() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
  return result[STORAGE_KEYS.API_KEY] || null;
}

/**
 * Save the Attio API key
 * @param {string} apiKey
 * @returns {Promise<void>}
 */
export async function setApiKey(apiKey) {
  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: apiKey });
}

/**
 * Clear the stored API key (disconnect)
 * @returns {Promise<void>}
 */
export async function clearApiKey() {
  await chrome.storage.local.remove(STORAGE_KEYS.API_KEY);
}

/**
 * Check if the extension is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const apiKey = await getApiKey();
  return apiKey !== null && apiKey.length > 0;
}

/**
 * Update the last sync timestamp
 * @returns {Promise<void>}
 */
export async function updateLastSync() {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: Date.now() });
}

/**
 * Get the last sync timestamp
 * @returns {Promise<number|null>}
 */
export async function getLastSync() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC);
  return result[STORAGE_KEYS.LAST_SYNC] || null;
}

export { STORAGE_KEYS };
