/**
 * Popup script for Add to Attio extension
 * Handles authentication and profile capture initiation
 */

import { setApiKey, clearApiKey, isAuthenticated } from '../lib/storage.js';
import { validateApiKey } from '../lib/attio-api.js';
import { log } from '../lib/logger.js';
import { SUPPORTED_PLATFORMS } from '../constants/index.js';
import type { Platform, ProfileData, CheckPersonResponse, CaptureResponse } from '../types/index.js';

// DOM Elements - Auth Section
const authSection = document.getElementById('auth-section') as HTMLElement;
const connectedSection = document.getElementById('connected-section') as HTMLElement;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const messageEl = document.getElementById('message') as HTMLElement;

// DOM Elements - State containers
const loadingState = document.getElementById('loading-state') as HTMLElement;
const noProfileState = document.getElementById('no-profile-state') as HTMLElement;
const profileState = document.getElementById('profile-state') as HTMLElement;

// DOM Elements - Person Header
const personName = document.getElementById('person-name') as HTMLElement;
const personRole = document.getElementById('person-role') as HTMLElement;
const personCompany = document.getElementById('person-company') as HTMLElement;
const statusBadge = document.getElementById('status-badge') as HTMLElement;
const avatarImage = document.getElementById('avatar-image') as HTMLImageElement;
const avatarPlaceholder = document.querySelector('.avatar-placeholder') as HTMLElement;

// DOM Elements - CTAs
const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
const viewBtn = document.getElementById('view-btn') as HTMLAnchorElement;
const updateBtn = document.getElementById('update-btn') as HTMLButtonElement;

// DOM Elements - Data Preview
const dataList = document.getElementById('data-list') as HTMLUListElement;

// DOM Elements - Disconnect buttons (multiple locations)
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const disconnectBtnNoProfile = document.getElementById('disconnect-btn-no-profile') as HTMLButtonElement;

// Current context
let currentPlatform: Platform | null = null;
let currentTabId: number | null = null;
let currentProfileData: ProfileData | null = null;
let currentAttioUrl: string | null = null;

interface DetectedPlatform {
  key: Platform;
  pattern: RegExp;
  name: string;
}

/**
 * Hide all state containers
 */
function hideAllStates(): void {
  loadingState.classList.add('hidden');
  noProfileState.classList.add('hidden');
  profileState.classList.add('hidden');
}

/**
 * Show a specific state container
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
 * Count available fields from profile data that can be updated
 */
function countUpdatableFields(profileData: ProfileData | undefined): number {
  if (!profileData) return 0;

  let count = 0;
  if (profileData.fullName) count++;
  if (profileData.linkedinUrl) count++;
  if (profileData.twitterHandle) count++;
  if (profileData.description) count++;

  return count;
}

/**
 * Update the "Update Info" button text to show what will be updated
 */
function updateButtonText(profileData: ProfileData | undefined): void {
  const fieldCount = countUpdatableFields(profileData);

  if (fieldCount > 0) {
    updateBtn.textContent = `Update ${fieldCount} field${fieldCount > 1 ? 's' : ''}`;
    updateBtn.disabled = false;
  } else {
    updateBtn.textContent = 'No updates available';
    updateBtn.disabled = true;
  }
}

/**
 * Data field configuration for the data preview list
 */
interface DataField {
  key: keyof ProfileData;
  icon: string;
  label: string;
  format?: (value: string) => string;
}

const DATA_FIELDS: DataField[] = [
  { key: 'fullName', icon: '👤', label: 'Name' },
  { key: 'description', icon: '💼', label: 'Role' },
  { key: 'company', icon: '🏢', label: 'Company' },
  { key: 'location', icon: '📍', label: 'Location' },
  { key: 'linkedinUrl', icon: '🔗', label: 'LinkedIn', format: (v) => v.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '') },
  { key: 'twitterHandle', icon: '🐦', label: 'Twitter', format: (v) => `@${v.replace('@', '')}` },
];

/**
 * Populate the data preview list with available fields
 */
function populateDataPreview(profileData: ProfileData | null): void {
  dataList.innerHTML = '';

  if (!profileData) {
    return;
  }

  for (const field of DATA_FIELDS) {
    const value = profileData[field.key];
    if (value && typeof value === 'string') {
      const displayValue = field.format ? field.format(value) : value;
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="data-icon">${field.icon}</span>
        <span class="data-label">${field.label}</span>
        <span class="data-value" title="${displayValue}">${displayValue}</span>
      `;
      dataList.appendChild(li);
    }
  }

  // Add Contact Info indicator if available
  if (profileData.hasContactInfo) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="data-icon">📋</span>
      <span class="data-label">Contact</span>
      <span class="data-value">Available (1st connection)</span>
    `;
    dataList.appendChild(li);
  }
}

/**
 * Update the person header with profile data
 */
function updatePersonHeader(profileData: ProfileData, isExisting: boolean): void {
  // Set name
  personName.textContent = profileData.fullName || 'Unknown';

  // Set role (description/headline)
  if (profileData.description) {
    personRole.textContent = profileData.description;
    personRole.classList.remove('hidden');
  } else {
    personRole.classList.add('hidden');
  }

  // Set company
  if (profileData.company) {
    personCompany.textContent = profileData.company;
    personCompany.classList.remove('hidden');
  } else {
    personCompany.classList.add('hidden');
  }

  // Set status badge
  if (isExisting) {
    statusBadge.textContent = 'Existing';
    statusBadge.className = 'status-badge existing';
  } else {
    statusBadge.textContent = 'New';
    statusBadge.className = 'status-badge new';
  }

  // Set avatar
  if (profileData.avatarUrl) {
    avatarImage.src = profileData.avatarUrl;
    avatarImage.classList.remove('hidden');
    avatarPlaceholder.classList.add('hidden');
  } else {
    avatarImage.classList.add('hidden');
    avatarPlaceholder.classList.remove('hidden');
  }
}

/**
 * Show the profile state with appropriate CTAs
 */
function showProfileState(isExisting: boolean, attioUrl: string | null): void {
  showState(profileState);

  // Reset all CTAs
  captureBtn.classList.add('hidden');
  viewBtn.classList.add('hidden');
  updateBtn.classList.add('hidden');

  if (isExisting) {
    // Existing person - show View and Update buttons
    if (attioUrl) {
      viewBtn.href = attioUrl;
      viewBtn.classList.remove('hidden');
    }
    updateBtn.classList.remove('hidden');
    updateButtonText(currentProfileData ?? undefined);
  } else {
    // New person - show Add button
    captureBtn.classList.remove('hidden');
  }
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

    // Store profile data and Attio URL for updates
    currentProfileData = response.profileData || null;
    currentAttioUrl = response.person?.attioUrl || null;

    // Update person header with extracted profile data
    if (response.profileData) {
      updatePersonHeader(response.profileData, response.exists);
      populateDataPreview(response.profileData);
      showProfileState(response.exists, currentAttioUrl);
    } else {
      // No profile data extracted - show no profile state
      showState(noProfileState);
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

  log.popup('Updating with profile data: %O', {
    name: currentProfileData?.fullName,
    fieldsCount: countUpdatableFields(currentProfileData ?? undefined),
  });

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
disconnectBtnNoProfile.addEventListener('click', handleDisconnect);
captureBtn.addEventListener('click', handleCapture);
updateBtn.addEventListener('click', handleUpdate);

// Initialize
updateAuthState();
