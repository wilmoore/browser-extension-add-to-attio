/**
 * Popup script for Add to Attio extension
 * Handles authentication and profile capture initiation
 */

import { getApiKey, setApiKey, clearApiKey, isAuthenticated } from '../lib/storage.js';
import { validateApiKey } from '../lib/attio-api.js';

// DOM Elements
const authSection = document.getElementById('auth-section');
const connectedSection = document.getElementById('connected-section');
const authForm = document.getElementById('auth-form');
const apiKeyInput = document.getElementById('api-key');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const messageEl = document.getElementById('message');

// Capture section states
const loadingState = document.getElementById('loading-state');
const noProfileState = document.getElementById('no-profile-state');
const existsState = document.getElementById('exists-state');
const newState = document.getElementById('new-state');

// Exists state elements
const personName = document.getElementById('person-name');
const viewBtn = document.getElementById('view-btn');
const updateBtn = document.getElementById('update-btn');

// New state elements
const captureBtn = document.getElementById('capture-btn');
const pageStatus = document.getElementById('page-status');

// Current context
let currentPlatform = null;
let currentTabId = null;

// Supported platforms
const SUPPORTED_PLATFORMS = {
  linkedin: {
    pattern: /^https:\/\/(www\.)?linkedin\.com\/in\//,
    name: 'LinkedIn'
  },
  twitter: {
    pattern: /^https:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/?$/,
    name: 'X (Twitter)'
  },
  reddit: {
    pattern: /^https:\/\/(www\.)?reddit\.com\/user\//,
    name: 'Reddit'
  }
};

/**
 * Hide all capture states
 */
function hideAllStates() {
  loadingState.classList.add('hidden');
  noProfileState.classList.add('hidden');
  existsState.classList.add('hidden');
  newState.classList.add('hidden');
}

/**
 * Show a specific state
 */
function showState(stateEl) {
  hideAllStates();
  stateEl.classList.remove('hidden');
}

/**
 * Show a message to the user
 */
function showMessage(text, type = 'info') {
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
function hideMessage() {
  messageEl.classList.add('hidden');
}

/**
 * Update UI based on authentication state
 */
async function updateAuthState() {
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
function detectPlatform(url) {
  for (const [key, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (platform.pattern.test(url)) {
      return { key, ...platform };
    }
  }
  return null;
}

/**
 * Check if current page is a supported profile page and if person exists
 */
async function checkCurrentPage() {
  showState(loadingState);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[Add to Attio Popup] Current tab:', tab);

    if (!tab?.url) {
      console.log('[Add to Attio Popup] No tab URL');
      showState(noProfileState);
      return;
    }

    const platform = detectPlatform(tab.url);
    console.log('[Add to Attio Popup] Detected platform:', platform);

    if (!platform) {
      showState(noProfileState);
      return;
    }

    currentPlatform = platform.key;
    currentTabId = tab.id;

    // Check if person exists in Attio
    console.log('[Add to Attio Popup] Sending checkPerson message');
    const response = await chrome.runtime.sendMessage({
      action: 'checkPerson',
      platform: platform.key,
      tabId: tab.id
    });

    console.log('[Add to Attio Popup] Response:', response);

    // Handle case where response is missing or malformed
    if (!response) {
      console.error('[Add to Attio Popup] No response from background');
      showMessage('Failed to check profile status.', 'error');
      showState(noProfileState);
      return;
    }

    // Handle error response - show error and stop processing
    if (response.error) {
      console.error('[Add to Attio Popup] Error from background:', response.error);
      showMessage(response.error, 'error');
      showState(noProfileState);
      return;
    }

    console.log('[Add to Attio Popup] Check result:', {
      exists: response.exists,
      hasPerson: !!response.person,
      personName: response.person?.name
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
      console.warn('[Add to Attio Popup] Person exists but person data missing');
      personName.textContent = 'Unknown';
      viewBtn.classList.add('hidden');
      showState(existsState);
    } else {
      // Person not in Attio
      pageStatus.textContent = `Ready to capture ${platform.name} profile.`;
      showState(newState);
    }
  } catch (error) {
    console.error('[Add to Attio Popup] Error checking page:', error);
    showMessage('Failed to check profile status.', 'error');
    showState(noProfileState);
  }
}

/**
 * Handle connect form submission
 */
async function handleConnect(event) {
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
    console.error('Connection error:', error);
    showMessage('Connection failed. Please try again.', 'error');
  } finally {
    connectBtn.disabled = false;
    connectBtn.classList.remove('loading');
  }
}

/**
 * Handle disconnect
 */
async function handleDisconnect() {
  await clearApiKey();
  apiKeyInput.value = '';
  hideMessage();
  await updateAuthState();
}

/**
 * Handle capture button click (new person)
 */
async function handleCapture() {
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
      isUpdate: false
    });

    if (response.success) {
      showMessage('Profile added to Attio!', 'success');
      // Refresh to show the "exists" state
      await checkCurrentPage();
    } else {
      showMessage(response.error || 'Failed to capture profile.', 'error');
    }
  } catch (error) {
    console.error('Capture error:', error);
    showMessage('Failed to capture profile. Please try again.', 'error');
  } finally {
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
}

/**
 * Handle update button click (existing person)
 */
async function handleUpdate() {
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
      isUpdate: true
    });

    if (response.success) {
      showMessage('Profile updated in Attio!', 'success');
    } else {
      showMessage(response.error || 'Failed to update profile.', 'error');
    }
  } catch (error) {
    console.error('Update error:', error);
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
