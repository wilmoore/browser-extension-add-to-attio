/**
 * Popup script for Add to Attio extension
 * Handles authentication and profile capture initiation
 */

import { setApiKey, clearApiKey, isAuthenticated } from '../lib/storage.js';
import { validateApiKey } from '../lib/attio-api.js';
import { log } from '../lib/logger.js';
import { SUPPORTED_PLATFORMS } from '../constants/index.js';
import type { Platform, CheckPersonResponse, CaptureResponse } from '../types/index.js';

// DOM Elements
const authSection = document.getElementById('auth-section') as HTMLElement;
const connectedSection = document.getElementById('connected-section') as HTMLElement;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const messageEl = document.getElementById('message') as HTMLElement;

// Capture section states
const loadingState = document.getElementById('loading-state') as HTMLElement;
const noProfileState = document.getElementById('no-profile-state') as HTMLElement;
const existsState = document.getElementById('exists-state') as HTMLElement;
const newState = document.getElementById('new-state') as HTMLElement;

// Exists state elements
const personName = document.getElementById('person-name') as HTMLElement;
const viewBtn = document.getElementById('view-btn') as HTMLAnchorElement;
const updateBtn = document.getElementById('update-btn') as HTMLButtonElement;

// New state elements
const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
const pageStatus = document.getElementById('page-status') as HTMLElement;

// Current context
let currentPlatform: Platform | null = null;
let currentTabId: number | null = null;

interface DetectedPlatform {
  key: Platform;
  pattern: RegExp;
  name: string;
}

/**
 * Hide all capture states
 */
function hideAllStates(): void {
  loadingState.classList.add('hidden');
  noProfileState.classList.add('hidden');
  existsState.classList.add('hidden');
  newState.classList.add('hidden');
}

/**
 * Show a specific state
 */
function showState(stateEl: HTMLElement): void {
  hideAllStates();
  stateEl.classList.remove('hidden');
}

/**
 * Show a message to the user
 */
function showMessage(text: string, type: 'info' | 'success' | 'error' = 'info'): void {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');

  if (type === 'success') {
    setTimeout(() => {
      messageEl.classList.add('hidden');
    }, 3000);
  }
}

/**
 * Hide the message
 */
function hideMessage(): void {
  messageEl.classList.add('hidden');
}

/**
 * Update UI based on authentication state
 */
async function updateAuthState(): Promise<void> {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    authSection.classList.add('hidden');
    connectedSection.classList.remove('hidden');
    await checkCurrentPage();
  } else {
    authSection.classList.remove('hidden');
    connectedSection.classList.add('hidden');
  }
}

/**
 * Detect which platform the current tab is on
 */
function detectPlatform(url: string): DetectedPlatform | null {
  for (const [key, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (platform.pattern.test(url)) {
      return { key: key as Platform, ...platform };
    }
  }
  return null;
}

/**
 * Check if current page is a supported profile page and if person exists
 */
async function checkCurrentPage(): Promise<void> {
  showState(loadingState);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    log.popup('Current tab: %O', tab);

    if (!tab?.url) {
      log.popup('No tab URL');
      showState(noProfileState);
      return;
    }

    const platform = detectPlatform(tab.url);
    log.popup('Detected platform: %O', platform);

    if (!platform) {
      showState(noProfileState);
      return;
    }

    currentPlatform = platform.key;
    currentTabId = tab.id ?? null;

    // Check if person exists in Attio
    log.popup('Sending checkPerson message');
    const response = await chrome.runtime.sendMessage({
      action: 'checkPerson',
      platform: platform.key,
      tabId: tab.id,
    }) as CheckPersonResponse;

    log.popup('Response: %O', response);

    // Handle case where response is missing or malformed
    if (!response) {
      log.popup('No response from background');
      showMessage('Failed to check profile status.', 'error');
      showState(noProfileState);
      return;
    }

    // Handle error response - show error and stop processing
    if (response.error) {
      log.popup('Error from background: %s', response.error);
      showMessage(response.error, 'error');
      showState(noProfileState);
      return;
    }

    log.popup('Check result: %O', {
      exists: response.exists,
      hasPerson: !!response.person,
      personName: response.person?.name,
    });

    if (response.exists && response.person) {
      // Person already in Attio
      personName.textContent = response.person.name || 'Unknown';

      if (response.person.attioUrl) {
        viewBtn.href = response.person.attioUrl;
        viewBtn.classList.remove('hidden');
      } else {
        viewBtn.classList.add('hidden');
      }

      showState(existsState);
    } else if (response.exists && !response.person) {
      // Person exists but we couldn't get their details - still show exists state
      log.popup('Person exists but person data missing');
      personName.textContent = 'Unknown';
      viewBtn.classList.add('hidden');
      showState(existsState);
    } else {
      // Person not in Attio
      pageStatus.textContent = `Ready to capture ${platform.name} profile.`;
      showState(newState);
    }
  } catch (error) {
    log.popup('Error checking page: %O', error);
    showMessage('Failed to check profile status.', 'error');
    showState(noProfileState);
  }
}

/**
 * Handle connect form submission
 */
async function handleConnect(event: Event): Promise<void> {
  event.preventDefault();
  hideMessage();

  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showMessage('Please enter your API key.', 'error');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.classList.add('loading');

  try {
    const isValid = await validateApiKey(apiKey);

    if (isValid) {
      await setApiKey(apiKey);
      showMessage('Connected successfully!', 'success');
      await updateAuthState();
    } else {
      showMessage('Invalid API key. Please check and try again.', 'error');
    }
  } catch (error) {
    log.popup('Connection error: %O', error);
    showMessage('Connection failed. Please try again.', 'error');
  } finally {
    connectBtn.disabled = false;
    connectBtn.classList.remove('loading');
  }
}

/**
 * Handle disconnect
 */
async function handleDisconnect(): Promise<void> {
  await clearApiKey();
  apiKeyInput.value = '';
  hideMessage();
  await updateAuthState();
}

/**
 * Handle capture button click (new person)
 */
async function handleCapture(): Promise<void> {
  if (!currentPlatform || !currentTabId) {
    showMessage('Unable to capture. Please refresh and try again.', 'error');
    return;
  }

  captureBtn.disabled = true;
  captureBtn.classList.add('loading');
  hideMessage();

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'captureProfile',
      platform: currentPlatform,
      tabId: currentTabId,
      isUpdate: false,
    }) as CaptureResponse;

    if (response.success) {
      showMessage('Profile added to Attio!', 'success');
      // Refresh to show the "exists" state
      await checkCurrentPage();
    } else {
      showMessage(response.error || 'Failed to capture profile.', 'error');
    }
  } catch (error) {
    log.popup('Capture error: %O', error);
    showMessage('Failed to capture profile. Please try again.', 'error');
  } finally {
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
}

/**
 * Handle update button click (existing person)
 */
async function handleUpdate(): Promise<void> {
  if (!currentPlatform || !currentTabId) {
    showMessage('Unable to update. Please refresh and try again.', 'error');
    return;
  }

  updateBtn.disabled = true;
  updateBtn.classList.add('loading');
  hideMessage();

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'captureProfile',
      platform: currentPlatform,
      tabId: currentTabId,
      isUpdate: true,
    }) as CaptureResponse;

    if (response.success) {
      showMessage('Profile updated in Attio!', 'success');
    } else {
      showMessage(response.error || 'Failed to update profile.', 'error');
    }
  } catch (error) {
    log.popup('Update error: %O', error);
    showMessage('Failed to update profile. Please try again.', 'error');
  } finally {
    updateBtn.disabled = false;
    updateBtn.classList.remove('loading');
  }
}

// Event Listeners
authForm.addEventListener('submit', handleConnect);
disconnectBtn.addEventListener('click', handleDisconnect);
captureBtn.addEventListener('click', handleCapture);
updateBtn.addEventListener('click', handleUpdate);

// Initialize
updateAuthState();
