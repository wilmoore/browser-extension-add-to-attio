/**
 * Background service worker for Add to Attio extension
 * Handles message passing, API calls, and badge management
 */

import { getApiKey, updateLastSync } from './lib/storage.js';
import {
  upsertPerson,
  findPersonByAttribute,
  getWorkspaceSlug,
  AttioApiError,
  patchPersonValues,
  parseName,
} from './lib/attio-api.js';
import { log } from './lib/logger.js';
import { t } from './i18n/translations.js';
import {
  MATCHING_ATTRIBUTES,
  BADGE_STATES,
  TIMING,
} from './constants/index.js';
import { detectPlatformFromUrl, extractMatchingValueFromUrl } from './lib/platform.js';
import type {
  Platform,
  ProfileData,
  BadgeState,
  CheckPersonResponse,
  CaptureResponse,
  AttioPersonValues,
  PersonFieldKey,
  AttioValuesInput,
  UpdatePersonFieldResponse,
} from './types/index.js';

function toPersonValues(values: unknown): AttioPersonValues {
  const v = values as {
    name?: Array<{ full_name?: string; first_name?: string }>;
    linkedin?: Array<{ value: string }>;
    twitter?: Array<{ value: string }>;
    description?: Array<{ value: string }>;
    email_addresses?: Array<{ email_address: string }>;
    primary_location?: Array<{
      locality?: string;
      region?: string;
      original_formatted_address?: string;
    }>;
  } | undefined;

  // Extract all emails for multi-value display
  const emails = v?.email_addresses?.map(e => e.email_address).filter(Boolean) ?? [];

  // Build location string from primary_location
  let location: string | null = null;
  const loc = v?.primary_location?.[0];
  if (loc) {
    // Prefer formatted address, fall back to locality + region
    location = loc.original_formatted_address
      || [loc.locality, loc.region].filter(Boolean).join(', ')
      || null;
  }

  return {
    name: v?.name?.[0]?.full_name ?? v?.name?.[0]?.first_name ?? null,
    linkedin: v?.linkedin?.[0]?.value ?? null,
    twitter: v?.twitter?.[0]?.value ?? null,
    description: v?.description?.[0]?.value ?? null,
    email: emails[0] ?? null,
    emails: emails.length > 0 ? emails : undefined,
    website: null, // Attio People object doesn't have a standard website attribute
    websites: undefined,
    location,
  };
}

/**
 * Get the attribute value from profile data based on platform
 */
function getAttributeValue(platform: Platform, profileData: ProfileData): string | null {
  switch (platform) {
    case 'linkedin':
      return profileData.linkedinUrl || null;
    case 'twitter':
      return profileData.twitterHandle || null;
    case 'reddit':
      return profileData.fullName;
    default:
      return null;
  }
}

/**
 * Update the extension badge for a tab
 */
async function updateBadge(tabId: number, state: BadgeState): Promise<void> {
  try {
    // Use a small dot character for the badge
    await chrome.action.setBadgeText({
      tabId,
      text: state === BADGE_STATES.NONE ? '' : '\u2022', // bullet point
    });

    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: state.color,
    });
  } catch (error) {
    // Tab may no longer exist
    log.background('Badge update failed: %s', (error as Error).message);
  }
}

/**
 * Check badge state for a tab and update accordingly
 */
async function checkAndUpdateBadge(tabId: number, url: string): Promise<void> {
  const platform = detectPlatformFromUrl(url);

  if (!platform) {
    await updateBadge(tabId, BADGE_STATES.NONE);
    return;
  }

  // Check if authenticated
  const apiKey = await getApiKey();
  if (!apiKey) {
    // Show capturable indicator even if not authenticated
    await updateBadge(tabId, BADGE_STATES.CAPTURABLE);
    return;
  }

  try {
    // Try to extract profile data and check if person exists
    const profileData = await chrome.tabs.sendMessage(tabId, {
      action: 'extractProfile',
    }) as ProfileData;

    if (!profileData || profileData.error) {
      await updateBadge(tabId, BADGE_STATES.CAPTURABLE);
      return;
    }

    const attribute = MATCHING_ATTRIBUTES[platform];
    const value = getAttributeValue(platform, profileData);

    if (!value) {
      await updateBadge(tabId, BADGE_STATES.CAPTURABLE);
      return;
    }

    // Check if person exists in Attio
    const existingPerson = await findPersonByAttribute(apiKey, attribute, value);

    if (existingPerson) {
      await updateBadge(tabId, BADGE_STATES.EXISTS);
    } else {
      await updateBadge(tabId, BADGE_STATES.CAPTURABLE);
    }
  } catch (error) {
    // Content script may not be ready, show capturable state
    log.background('Badge check error: %s', (error as Error).message);
    await updateBadge(tabId, BADGE_STATES.CAPTURABLE);
  }
}

/**
 * Build a response for an existing person found in Attio
 */
async function buildExistingPersonResponse(
  apiKey: string,
  tabId: number,
  existingPerson: { id?: { record_id?: string }; values?: unknown },
  profileData: ProfileData | null,
  contentScriptAvailable: boolean
): Promise<CheckPersonResponse> {
  const workspaceSlug = await getWorkspaceSlug(apiKey);
  const recordId = existingPerson.id?.record_id;

  log.background('Building Attio URL: %O', {
    workspaceSlug,
    recordId,
    existingPersonId: existingPerson.id,
  });

  let attioUrl: string | null = null;
  if (workspaceSlug && recordId) {
    attioUrl = `https://app.attio.com/${workspaceSlug}/person/${recordId}`;
  } else {
    log.background('Missing workspaceSlug or recordId for URL construction');
  }

  // Extract name from existing record, preferring scraped data if Attio has username-like name
  const values = existingPerson.values as {
    name?: Array<{ full_name?: string; first_name?: string }>;
  } | undefined;
  const attioName = values?.name?.[0]?.full_name || values?.name?.[0]?.first_name;
  const scrapedName = profileData?.fullName;

  // Prefer scraped name if Attio name looks like a username (no spaces)
  const isAttioNameValid = attioName && attioName.includes(' ');
  const existingName = isAttioNameValid ? attioName : (scrapedName || attioName || 'Unknown');

  log.background('Resolved person name: %O', {
    fromAttioFullName: values?.name?.[0]?.full_name,
    fromAttioFirstName: values?.name?.[0]?.first_name,
    fromProfileData: scrapedName,
    isAttioNameValid,
    resolved: existingName,
  });

  // Update badge to show exists
  await updateBadge(tabId, BADGE_STATES.EXISTS);

  return {
    exists: true,
    person: recordId ? {
      id: recordId,
      name: existingName,
      attioUrl,
    } : undefined,
    personValues: toPersonValues(existingPerson.values),
    profileData: profileData ?? undefined,
    contentScriptAvailable,
  };
}

/**
 * Check if a person exists in Attio based on the current page
 */
async function handleCheckPerson(platform: Platform, tabId: number, tabUrl?: string): Promise<CheckPersonResponse> {
  log.background('handleCheckPerson called: %O', { platform, tabId, tabUrl });

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      log.background('No API key found');
      return { exists: false, error: t('error.notAuthenticated') };
    }

    // Extract profile data from page
    log.background('Extracting profile data from tab: %d', tabId);
    let profileData: ProfileData | null = null;
    let contentScriptAvailable = true;

    try {
      profileData = await chrome.tabs.sendMessage(tabId, {
        action: 'extractProfile',
      }) as ProfileData;

      if (profileData?.error) {
        log.background('Content script returned error: %s', profileData.error);
        profileData = null;
        contentScriptAvailable = false;
      }
    } catch (msgError) {
      log.background('Failed to message content script: %O', msgError);
      contentScriptAvailable = false;
    }

    log.background('Profile data: %O, contentScriptAvailable: %s', profileData, contentScriptAvailable);

    const attribute = MATCHING_ATTRIBUTES[platform];

    // Try to get matching value from profile data first, then fall back to URL
    let value = profileData ? getAttributeValue(platform, profileData) : null;

    // URL-based fallback when content script is unavailable
    if (!value && tabUrl) {
      value = extractMatchingValueFromUrl(platform, tabUrl);
      log.background('Using URL-based fallback value: %s', value);
    }

    log.background('Querying Attio: %O', { attribute, value });

    if (!value) {
      // No value to search with - show no-profile state if no content script
      if (!contentScriptAvailable) {
        return { exists: false, error: t('popup.msg.refreshToSeeProfile'), contentScriptAvailable: false };
      }
      return { exists: false, profileData: profileData ?? undefined };
    }

    // Search for existing person
    const existingPerson = await findPersonByAttribute(apiKey, attribute, value);

    log.background('Search result: %s', existingPerson ? 'Found' : 'Not found');

    if (existingPerson) {
      return buildExistingPersonResponse(apiKey, tabId, existingPerson, profileData, contentScriptAvailable);
    }

    // Person doesn't exist - show capturable state
    await updateBadge(tabId, BADGE_STATES.CAPTURABLE);

    // If content script unavailable, we can't capture - show helpful message
    if (!contentScriptAvailable) {
      return { exists: false, error: t('popup.msg.refreshToCapture'), contentScriptAvailable: false };
    }

    return { exists: false, profileData: profileData ?? undefined };
  } catch (error) {
    log.background('Check person error: %O', error);
    return { exists: false, error: t('popup.msg.checkFailed') };
  }
}

async function handleUpdatePersonField(
  recordId: string,
  field: PersonFieldKey,
  value: string
): Promise<UpdatePersonFieldResponse> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, error: t('error.notAuthenticated') };
    }

    const values: AttioValuesInput = {};

    switch (field) {
      case 'linkedin':
        values.linkedin = [{ value }];
        break;
      case 'twitter':
        values.twitter = [{ value }];
        break;
      case 'description':
        values.description = [{ value }];
        break;
      case 'name': {
        const { firstName, lastName } = parseName(value);
        values.name = [{
          first_name: firstName,
          last_name: lastName,
          full_name: value,
        }];
        break;
      }
      case 'email':
        values.email_addresses = [{ email_address: value }];
        break;
      case 'website':
        // Attio People object doesn't have a standard website attribute
        // Skip for now - would need custom attribute
        return { success: false, error: t('error.unsupportedField') };
      default:
        return { success: false, error: t('error.unsupportedField') };
    }

    await patchPersonValues(apiKey, recordId, values);
    return { success: true };
  } catch (error) {
    log.background('Update field error: %O', error);

    let errorMessage = 'An unexpected error occurred.';
    if (error instanceof AttioApiError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Handle profile capture request
 */
async function handleCaptureProfile(
  platform: Platform,
  tabId: number,
  isUpdate = false
): Promise<CaptureResponse> {
  try {
    // Get API key
    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, error: t('error.notAuthenticated') };
    }

    // Send message to content script to extract profile data
    const profileData = await chrome.tabs.sendMessage(tabId, {
      action: 'extractProfile',
    }) as ProfileData;

    if (!profileData || profileData.error) {
      return {
        success: false,
        error: profileData?.error || 'Failed to extract profile data.',
      };
    }

    // Determine matching attribute for deduplication
    const matchingAttribute = MATCHING_ATTRIBUTES[platform] || 'name';

    // Create/update person in Attio using query-then-create/update pattern
    const result = await upsertPerson(apiKey, profileData, matchingAttribute, platform);

    // Update last sync timestamp
    await updateLastSync();

    // Get workspace slug and record ID for the URL
    const workspaceSlug = await getWorkspaceSlug(apiKey);
    const recordId = result.data?.id?.record_id;
    let attioUrl: string | undefined;
    if (workspaceSlug && recordId) {
      attioUrl = `https://app.attio.com/${workspaceSlug}/person/${recordId}`;
    }

    // Update badge to show person now exists
    await updateBadge(tabId, BADGE_STATES.EXISTS);

    // Notify content script of success
    const message = isUpdate ? 'Updated in Attio!' : 'Added to Attio!';
    await chrome.tabs.sendMessage(tabId, {
      action: 'showFeedback',
      success: true,
      message,
    });

    return { success: true, data: result, attioUrl };
  } catch (error) {
    log.background('Capture error: %O', error);

    let errorMessage = 'An unexpected error occurred.';

    if (error instanceof AttioApiError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Notify content script of error
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'showFeedback',
        success: false,
        message: errorMessage,
      });
    } catch {
      // Content script may not be available
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Tab update listener - update badge when URL changes
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act on completed navigation with a URL
  if (changeInfo.status === 'complete' && tab.url) {
    // Small delay to let content script initialize
    setTimeout(() => {
      checkAndUpdateBadge(tabId, tab.url!);
    }, TIMING.BADGE_CHECK_DELAY);
  }
});

/**
 * Tab activation listener - update badge when switching tabs
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      checkAndUpdateBadge(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    log.background('Tab activation error: %s', (error as Error).message);
  }
});

interface MessageWithAction {
  action: string;
  platform?: Platform;
  tabId?: number;
  tabUrl?: string;
  isUpdate?: boolean;
  recordId?: string;
  field?: PersonFieldKey;
  value?: string;
}

/**
 * Message listener for popup and content scripts
 */
chrome.runtime.onMessage.addListener(
  (
    message: MessageWithAction,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: CheckPersonResponse | CaptureResponse | UpdatePersonFieldResponse | { success: boolean }) => void
  ) => {
    if (message.action === 'checkPerson' && message.platform && message.tabId !== undefined) {
      handleCheckPerson(message.platform, message.tabId, message.tabUrl)
        .then(sendResponse)
        .catch((error: Error) => {
          log.background('Check person error: %O', error);
          sendResponse({ exists: false, error: t('popup.msg.checkFailed') });
        });
      return true;
    }

    if (message.action === 'captureProfile' && message.platform && message.tabId !== undefined) {
      handleCaptureProfile(message.platform, message.tabId, message.isUpdate)
        .then((result) => {
          // Badge is updated inside handleCaptureProfile
          sendResponse(result);
        })
        .catch((error: Error) => {
          log.background('Message handler error: %O', error);
          sendResponse({ success: false, error: t('error.internal') });
        });
      return true;
    }

    if (message.action === 'updatePersonField' && message.recordId && message.field && typeof message.value === 'string') {
      handleUpdatePersonField(message.recordId, message.field, message.value)
        .then(sendResponse)
        .catch((error: Error) => {
          log.background('Update field handler error: %O', error);
          sendResponse({ success: false, error: t('error.internal') });
        });
      return true;
    }

    // Allow content scripts to trigger badge refresh
    if (message.action === 'refreshBadge' && sender.tab) {
      checkAndUpdateBadge(sender.tab.id!, sender.tab.url!);
      sendResponse({ success: true });
      return true;
    }

    return false;
  }
);

// Log when service worker starts
log.background('Service worker started');
