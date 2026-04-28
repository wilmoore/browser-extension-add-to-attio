/**
 * Popup script for Add to Attio extension
 * Handles authentication, profile capture, and diff-based update UI.
 */

import { setApiKey, clearApiKey, isAuthenticated } from '../lib/storage.js';
import { validateApiKey } from '../lib/attio-api.js';
import { log } from '../lib/logger.js';
import { TIMING } from '../constants/index.js';
import { t } from '../i18n/translations.js';
import { computeFieldDiffs, extractLinkedInHandle, normalizeTwitterHandle } from '../lib/popup-diff.js';
import { detectPlatformFromUrl } from '../lib/platform.js';
import type {
  Platform,
  ProfileData,
  CheckPersonResponse,
  CaptureResponse,
  AttioPersonValues,
  PersonFieldKey,
  UpdatePersonFieldResponse,
} from '../types/index.js';

// DOM Elements - Auth Section
const authSection = document.getElementById('auth-section') as HTMLElement;
const connectedSection = document.getElementById('connected-section') as HTMLElement;
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const messageEl = document.getElementById('message') as HTMLElement;

// DOM Elements - Static text nodes
const popupTitle = document.getElementById('popup-title') as HTMLElement;
const authDescription = document.getElementById('auth-description') as HTMLElement;
const apiKeyLabel = document.getElementById('api-key-label') as HTMLElement;
const apiKeyHelp = document.getElementById('api-key-help') as HTMLElement;
const loadingText = document.getElementById('loading-text') as HTMLElement;
const noProfileDescription = document.getElementById('no-profile-description') as HTMLElement;

// DOM Elements - State containers
const loadingState = document.getElementById('loading-state') as HTMLElement;
const noProfileState = document.getElementById('no-profile-state') as HTMLElement;
const profileState = document.getElementById('profile-state') as HTMLElement;

// DOM Elements - Header
const personLink = document.getElementById('person-link') as HTMLAnchorElement;
const personName = document.getElementById('person-name') as HTMLElement;
const statusBadge = document.getElementById('status-badge') as HTMLElement;
const attioLinkIcon = document.getElementById('attio-link-icon') as HTMLElement;

// DOM Elements - Core fields
const coreFields = document.getElementById('core-fields') as HTMLElement;
const coreLabelName = document.getElementById('core-label-name') as HTMLElement;
const coreLabelLinkedIn = document.getElementById('core-label-linkedin') as HTMLElement;
const coreValueName = document.getElementById('core-value-name') as HTMLElement;
const coreValueLinkedIn = document.getElementById('core-value-linkedin') as HTMLElement;

// DOM Elements - Sheet states
const stateNew = document.getElementById('state-new') as HTMLElement;
const stateDiff = document.getElementById('state-diff') as HTMLElement;
const stateClean = document.getElementById('state-clean') as HTMLElement;
const upToDate = document.getElementById('up-to-date') as HTMLElement;

// DOM Elements - Contact summary
const contactSummary = document.getElementById('contact-summary') as HTMLElement;
const summaryEmailRow = document.getElementById('summary-email-row') as HTMLElement;
const summaryEmailValue = document.getElementById('summary-email-value') as HTMLElement;
const summaryEmailMore = document.getElementById('summary-email-more') as HTMLElement;
const summaryWebsiteRow = document.getElementById('summary-website-row') as HTMLElement;
const summaryWebsiteValue = document.getElementById('summary-website-value') as HTMLElement;
const summaryWebsiteMore = document.getElementById('summary-website-more') as HTMLElement;
const summaryLocationRow = document.getElementById('summary-location-row') as HTMLElement;
const summaryLocationValue = document.getElementById('summary-location-value') as HTMLElement;

// DOM Elements - Actions
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const diffList = document.getElementById('diff-list') as HTMLElement;
const updateAllBtn = document.getElementById('update-all-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const disconnectBtnNoProfile = document.getElementById('disconnect-btn-no-profile') as HTMLButtonElement;

// Current context
let currentPlatform: Platform | null = null;
let currentTabId: number | null = null;
let currentProfileData: ProfileData | null = null;
let currentAttioRecordId: string | null = null;
let currentAttioUrl: string | null = null;
let currentAttioValues: AttioPersonValues | null = null;

const skippedFields = new Set<PersonFieldKey>();

function applyTranslations(): void {
  document.title = t('popup.title');
  popupTitle.textContent = t('popup.title');
  authDescription.textContent = t('popup.auth.description');
  apiKeyLabel.textContent = t('popup.auth.apiKeyLabel');
  apiKeyInput.placeholder = t('popup.auth.apiKeyPlaceholder');
  connectBtn.textContent = t('popup.auth.connect');
  apiKeyHelp.textContent = t('popup.auth.helpLink');
  loadingText.textContent = t('popup.connected.checking');
  noProfileDescription.textContent = t('popup.noProfile.description');
  disconnectBtn.textContent = t('popup.disconnect');
  disconnectBtnNoProfile.textContent = t('popup.disconnect');
  coreLabelName.textContent = t('popup.core.nameLabel');
  coreLabelLinkedIn.textContent = t('popup.core.linkedinLabel');
  saveBtn.textContent = t('popup.cta.save');
  updateAllBtn.textContent = t('popup.cta.updateAll');
  upToDate.textContent = t('popup.state.upToDate');
}

function isDev(): boolean {
  // Vite injects import.meta.env; keep tolerant for non-Vite contexts.
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
  return !!env?.DEV;
}

function showMessage(text: string, type: 'info' | 'success' | 'error' = 'info', debug?: unknown): void {
  if (debug && isDev()) {
    log.popup('UI debug: %O', debug);
  }

  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');

  if (type === 'success') {
    setTimeout(() => {
      messageEl.classList.add('hidden');
    }, TIMING.TOAST_AUTO_DISMISS);
  }
}

function hideMessage(): void {
  messageEl.classList.add('hidden');
}

function hideAllStates(): void {
  loadingState.classList.add('hidden');
  noProfileState.classList.add('hidden');
  profileState.classList.add('hidden');
}

function showState(stateEl: HTMLElement): void {
  hideAllStates();
  stateEl.classList.remove('hidden');
}

function hideAllSheetStates(): void {
  stateNew.classList.add('hidden');
  stateDiff.classList.add('hidden');
  stateClean.classList.add('hidden');
}

function setStatusBadge(isExisting: boolean): void {
  if (isExisting) {
    statusBadge.textContent = t('popup.status.existing');
    statusBadge.className = 'status-badge existing';
  } else {
    statusBadge.textContent = t('popup.status.new');
    statusBadge.className = 'status-badge new';
  }
}

function setAttioPersonLink(attioUrl: string | null, enabled: boolean): void {
  if (enabled && attioUrl) {
    personLink.href = attioUrl;
    personLink.target = '_blank';
    personLink.rel = 'noopener';
    attioLinkIcon.classList.remove('hidden');
    return;
  }

  personLink.removeAttribute('href');
  personLink.removeAttribute('target');
  personLink.removeAttribute('rel');
  attioLinkIcon.classList.add('hidden');
}

function renderHeader(profileData: ProfileData, isExisting: boolean): void {
  const name = profileData.fullName || t('popup.core.unknown');
  personName.textContent = name;
  setStatusBadge(isExisting);
}

function renderCoreFields(profileData: ProfileData): void {
  coreFields.classList.remove('hidden');

  coreValueName.textContent = profileData.fullName || t('popup.core.unknown');

  const handle = extractLinkedInHandle(profileData.linkedinUrl);
  const connection = profileData.connectionDegree
    ? ` (${profileData.connectionDegree}${t('popup.core.connection')})`
    : '';

  if (handle) {
    coreValueLinkedIn.textContent = `${handle}${connection}`;
  } else {
    coreValueLinkedIn.textContent = t('popup.core.empty');
  }
}

/**
 * Render contact summary for existing contacts
 * Shows email, website, and location from Attio data or profile data
 */
function renderContactSummary(
  attioValues: AttioPersonValues | null,
  profileData: ProfileData | null
): void {
  // Get email from Attio or profile
  const primaryEmail = attioValues?.email ?? profileData?.emails?.[0] ?? null;
  const emailCount = (attioValues?.emails?.length ?? 0) || (profileData?.emails?.length ?? 0);

  // Get website from profile (Attio People doesn't have website)
  const primaryWebsite = profileData?.websites?.[0]?.url ?? null;
  const websiteCount = profileData?.websites?.length ?? 0;

  // Get location from Attio or profile
  const location = attioValues?.location ?? profileData?.location ?? null;

  // Render email row
  if (primaryEmail) {
    summaryEmailValue.textContent = primaryEmail;
    summaryEmailValue.classList.remove('empty');
    if (emailCount > 1) {
      summaryEmailMore.textContent = t('popup.summary.moreEmails').replace('{n}', String(emailCount - 1));
      summaryEmailMore.classList.remove('hidden');
    } else {
      summaryEmailMore.classList.add('hidden');
    }
    summaryEmailRow.classList.remove('hidden');
  } else {
    summaryEmailValue.textContent = t('popup.summary.noEmail');
    summaryEmailValue.classList.add('empty');
    summaryEmailMore.classList.add('hidden');
    summaryEmailRow.classList.remove('hidden');
  }

  // Render website row
  if (primaryWebsite) {
    // Display domain only for cleaner look
    try {
      const url = new URL(primaryWebsite);
      summaryWebsiteValue.textContent = url.hostname.replace('www.', '');
    } catch {
      summaryWebsiteValue.textContent = primaryWebsite;
    }
    summaryWebsiteValue.classList.remove('empty');
    if (websiteCount > 1) {
      summaryWebsiteMore.textContent = t('popup.summary.moreWebsites').replace('{n}', String(websiteCount - 1));
      summaryWebsiteMore.classList.remove('hidden');
    } else {
      summaryWebsiteMore.classList.add('hidden');
    }
    summaryWebsiteRow.classList.remove('hidden');
  } else {
    summaryWebsiteValue.textContent = t('popup.summary.noWebsite');
    summaryWebsiteValue.classList.add('empty');
    summaryWebsiteMore.classList.add('hidden');
    summaryWebsiteRow.classList.remove('hidden');
  }

  // Render location row
  if (location) {
    summaryLocationValue.textContent = location;
    summaryLocationValue.classList.remove('empty');
    summaryLocationRow.classList.remove('hidden');
  } else {
    summaryLocationValue.textContent = t('popup.summary.noLocation');
    summaryLocationValue.classList.add('empty');
    summaryLocationRow.classList.remove('hidden');
  }

  contactSummary.classList.remove('hidden');
}

function fieldLabel(field: PersonFieldKey): string {
  switch (field) {
    case 'linkedin':
      return t('popup.core.linkedinLabel');
    case 'twitter':
      return t('popup.field.twitter');
    case 'description':
      return t('popup.field.description');
    case 'name':
      return t('popup.core.nameLabel');
    case 'email':
      return t('popup.field.email');
    case 'website':
      return t('popup.field.website');
    default:
      return field;
  }
}

function displayValue(field: PersonFieldKey, value: string | null): string {
  if (!value) return t('popup.core.empty');
  if (field === 'linkedin') return extractLinkedInHandle(value) ?? t('popup.core.empty');
  if (field === 'twitter') {
    const h = normalizeTwitterHandle(value);
    return h ? `@${h}` : t('popup.core.empty');
  }
  return value;
}

async function updateField(field: PersonFieldKey): Promise<void> {
  if (!currentAttioRecordId || !currentProfileData) return;

  const valueByField: Record<PersonFieldKey, string | null> = {
    name: currentProfileData.fullName ?? null,
    linkedin: currentProfileData.linkedinUrl ?? null,
    twitter: currentProfileData.twitterHandle ?? null,
    description: currentProfileData.description ?? null,
    email: currentProfileData.emails?.[0] ?? null,
    website: currentProfileData.websites?.[0]?.url ?? null,
  };

  const value = valueByField[field];
  if (!value) return;

  const row = diffList.querySelector(`[data-field="${field}"]`) as HTMLElement | null;
  const updateBtn = row?.querySelector('[data-action="update"]') as HTMLButtonElement | null;
  const skipBtn = row?.querySelector('[data-action="skip"]') as HTMLButtonElement | null;

  updateBtn?.setAttribute('disabled', 'true');
  skipBtn?.setAttribute('disabled', 'true');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updatePersonField',
      recordId: currentAttioRecordId,
      field,
      value,
    }) as UpdatePersonFieldResponse;

    if (!response?.success) {
      showMessage(response?.error || t('popup.msg.updateFailed'), 'error', response);
      updateBtn?.removeAttribute('disabled');
      skipBtn?.removeAttribute('disabled');
      return;
    }

    // Update local state and convert row to a success indicator.
    if (currentAttioValues) {
      currentAttioValues = { ...currentAttioValues, [field]: value };
    }

    if (row) {
      row.innerHTML = `<div class="diff-updated">${t('popup.inline.updated')}</div>`;
    }

    // If all remaining diffs are resolved, switch to clean state.
    if (currentAttioValues && currentProfileData) {
      const remaining = computeFieldDiffs(currentAttioValues, currentProfileData)
        .filter((d) => !skippedFields.has(d.field));
      if (remaining.length === 0) {
        renderExistingClean();
      }
    }
  } catch (error) {
    log.popup('Update field error: %O', error);
    showMessage(t('popup.msg.updateFailed'), 'error', error);
    updateBtn?.removeAttribute('disabled');
    skipBtn?.removeAttribute('disabled');
  }
}

function renderExistingClean(): void {
  hideAllSheetStates();
  coreFields.classList.add('hidden');
  stateClean.classList.remove('hidden');

  // Render contact summary with available data
  renderContactSummary(currentAttioValues, currentProfileData);
}

function renderExistingDiff(): void {
  hideAllSheetStates();
  coreFields.classList.remove('hidden');
  stateDiff.classList.remove('hidden');
}

function renderNew(): void {
  hideAllSheetStates();
  coreFields.classList.remove('hidden');
  stateNew.classList.remove('hidden');
}

function getSourceLabel(): string {
  if (!currentPlatform) return 'Source:';
  const key = `popup.diff.source.${currentPlatform}` as const;
  return t(key);
}

function renderDiffRows(attioValues: AttioPersonValues, profileData: ProfileData): void {
  diffList.innerHTML = '';
  skippedFields.clear();

  const diffs = computeFieldDiffs(attioValues, profileData);

  if (diffs.length === 0) {
    updateAllBtn.classList.add('hidden');
    renderExistingClean();
    return;
  }

  renderExistingDiff();

  // Optional subtle secondary action.
  if (diffs.length > 1) {
    updateAllBtn.classList.remove('hidden');
  } else {
    updateAllBtn.classList.add('hidden');
  }

  for (const diff of diffs) {
    const row = document.createElement('div');
    row.className = 'diff-row';
    row.dataset.field = diff.field;

    row.innerHTML = `
      <div class="diff-field">${fieldLabel(diff.field)}</div>
      <div class="diff-values">
        <div class="diff-side">${t('popup.diff.attio')}</div>
        <div class="diff-value" title="${displayValue(diff.field, diff.attioValue)}">${displayValue(diff.field, diff.attioValue)}</div>
        <div class="diff-side">${getSourceLabel()}</div>
        <div class="diff-value" title="${displayValue(diff.field, diff.sourceValue)}">${displayValue(diff.field, diff.sourceValue)}</div>
      </div>
      <div class="diff-actions">
        <button class="btn btn-primary" data-action="update" type="button">${t('popup.cta.update')}</button>
        <button class="btn btn-secondary" data-action="skip" type="button">${t('popup.cta.skip')}</button>
      </div>
    `;

    const updateBtn = row.querySelector('[data-action="update"]') as HTMLButtonElement;
    const skipBtn = row.querySelector('[data-action="skip"]') as HTMLButtonElement;

    updateBtn.addEventListener('click', () => {
      void updateField(diff.field);
    });

    skipBtn.addEventListener('click', () => {
      skippedFields.add(diff.field);
      row.remove();
      if (diffList.children.length === 0) {
        updateAllBtn.classList.add('hidden');
      }
    });

    diffList.appendChild(row);
  }
}

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

async function checkCurrentPage(): Promise<void> {
  showState(loadingState);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    log.popup('Current tab: %O', tab);

    if (!tab?.url) {
      showState(noProfileState);
      return;
    }

    const platform = detectPlatformFromUrl(tab.url);
    if (!platform) {
      showState(noProfileState);
      return;
    }

    currentPlatform = platform;
    currentTabId = tab.id ?? null;

    const response = await chrome.runtime.sendMessage({
      action: 'checkPerson',
      platform,
      tabId: tab.id,
      tabUrl: tab.url,
    }) as CheckPersonResponse;

    if (!response) {
      showMessage(t('popup.msg.checkFailed'), 'error');
      showState(noProfileState);
      return;
    }

    // Handle case where person exists but content script unavailable
    // This is a graceful degradation - show what we know from Attio
    if (response.exists && response.person) {
      currentAttioRecordId = response.person.id ?? null;
      currentAttioUrl = response.person.attioUrl ?? null;
      currentAttioValues = response.personValues ?? null;
      currentProfileData = response.profileData ?? null;

      showState(profileState);

      // Use Attio name when profile data unavailable
      const displayName = response.profileData?.fullName ?? response.person.name ?? t('popup.core.unknown');
      personName.textContent = displayName;
      setStatusBadge(true);
      setAttioPersonLink(currentAttioUrl, true);

      // If we have profile data, render full UI
      if (response.profileData) {
        renderCoreFields(response.profileData);
        if (currentAttioValues) {
          renderDiffRows(currentAttioValues, response.profileData);
          return;
        }
      } else {
        // No profile data - hide core fields, show clean state with hint
        coreFields.classList.add('hidden');
      }

      // Show clean state (existing, up to date)
      renderExistingClean();

      // If content script unavailable, show a subtle hint
      if (response.contentScriptAvailable === false) {
        showMessage(t('popup.msg.refreshToSeeProfile'), 'info');
      }
      return;
    }

    // If there's an error and person doesn't exist, show error state
    if (response.error) {
      showMessage(response.error, 'error');
      showState(noProfileState);
      return;
    }

    if (!response.profileData) {
      showState(noProfileState);
      return;
    }

    currentProfileData = response.profileData;
    currentAttioRecordId = response.person?.id ?? null;
    currentAttioUrl = response.person?.attioUrl ?? null;
    currentAttioValues = response.personValues ?? null;

    showState(profileState);

    renderHeader(response.profileData, response.exists);
    renderCoreFields(response.profileData);

    // Link the header name row only if the record exists.
    setAttioPersonLink(currentAttioUrl, response.exists);

    if (!response.exists) {
      renderNew();
      return;
    }

    if (response.exists && currentAttioValues) {
      renderDiffRows(currentAttioValues, response.profileData);
      return;
    }

    // Existing but we couldn't load values for diffing: fall back to clean state.
    renderExistingClean();
  } catch (error) {
    log.popup('Error checking page: %O', error);
    showMessage(t('popup.msg.checkFailed'), 'error', error);
    showState(noProfileState);
  }
}

async function handleConnect(event: Event): Promise<void> {
  event.preventDefault();
  hideMessage();

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showMessage(t('popup.msg.enterApiKey'), 'error');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.classList.add('loading');

  try {
    const valid = await validateApiKey(apiKey);
    if (valid) {
      await setApiKey(apiKey);
      showMessage(t('popup.msg.connected'), 'success');
      await updateAuthState();
    } else {
      showMessage(t('popup.msg.invalidApiKey'), 'error');
    }
  } catch (error) {
    log.popup('Connection error: %O', error);
    showMessage(t('popup.msg.connectionFailed'), 'error', error);
  } finally {
    connectBtn.disabled = false;
    connectBtn.classList.remove('loading');
  }
}

async function handleDisconnect(): Promise<void> {
  await clearApiKey();
  apiKeyInput.value = '';
  hideMessage();
  await updateAuthState();
}

async function handleSave(): Promise<void> {
  if (!currentPlatform || !currentTabId) {
    showMessage(t('popup.msg.unableRefresh'), 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.classList.add('loading');
  hideMessage();

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'captureProfile',
      platform: currentPlatform,
      tabId: currentTabId,
      isUpdate: false,
    }) as CaptureResponse;

    if (response.success) {
      showMessage(t('popup.msg.added'), 'success');
      await checkCurrentPage();
    } else {
      showMessage(response.error || t('popup.msg.captureFailed'), 'error', response);
    }
  } catch (error) {
    log.popup('Save error: %O', error);
    showMessage(t('popup.msg.captureFailed'), 'error', error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
  }
}

async function handleUpdateAll(): Promise<void> {
  if (!currentPlatform || !currentTabId) {
    showMessage(t('popup.msg.unableRefresh'), 'error');
    return;
  }

  updateAllBtn.disabled = true;
  updateAllBtn.classList.add('loading');
  hideMessage();

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'captureProfile',
      platform: currentPlatform,
      tabId: currentTabId,
      isUpdate: true,
    }) as CaptureResponse;

    if (response.success) {
      showMessage(t('popup.msg.updated'), 'success');
      await checkCurrentPage();
    } else {
      showMessage(response.error || t('popup.msg.updateFailed'), 'error', response);
    }
  } catch (error) {
    log.popup('Update all error: %O', error);
    showMessage(t('popup.msg.updateFailed'), 'error', error);
  } finally {
    updateAllBtn.disabled = false;
    updateAllBtn.classList.remove('loading');
  }
}

// Event Listeners
authForm.addEventListener('submit', handleConnect);
disconnectBtn.addEventListener('click', handleDisconnect);
disconnectBtnNoProfile.addEventListener('click', handleDisconnect);
saveBtn.addEventListener('click', () => void handleSave());
updateAllBtn.addEventListener('click', () => void handleUpdateAll());

// Initialize
applyTranslations();
void updateAuthState();
