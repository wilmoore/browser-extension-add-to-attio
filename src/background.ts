/**
 * Background service worker for Add to Attio extension
 * Handles message passing, API calls, and badge management
 */

import { getApiKey, updateLastSync } from './lib/storage.js';
import { upsertPerson, findPersonByAttribute, getWorkspaceSlug, AttioApiError } from './lib/attio-api.js';
import { log } from './lib/logger.js';
import {
  MATCHING_ATTRIBUTES,
  PLATFORM_PATTERNS,
  BADGE_STATES,
  TWITTER_NON_PROFILE_PATHS,
  TIMING,
} from './constants/index.js';
import type {
  Platform,
  ProfileData,
  BadgeState,
  CheckPersonResponse,
  CaptureResponse,
} from './types/index.js';

/**
 * Detect platform from URL
 */
function detectPlatform(url: string): Platform | null {
  if (!url) return null;

  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      // Additional check for Twitter to exclude non-profile pages
      if (platform === 'twitter') {
        const match = url.match(/(?:twitter|x)\.com\/([^/?]+)/);
        if (match && TWITTER_NON_PROFILE_PATHS.includes(match[1].toLowerCase())) {
          return null;
        }
      }
      return platform as Platform;
    }
  }
  return null;
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
  const platform = detectPlatform(url);

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
 * Check if a person exists in Attio based on the current page
 */
async function handleCheckPerson(platform: Platform, tabId: number): Promise<CheckPersonResponse> {
  log.background('handleCheckPerson called: %O', { platform, tabId });

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      log.background('No API key found');
      return { exists: false, error: 'Not authenticated.' };
    }

    // Extract profile data from page
    log.background('Extracting profile data from tab: %d', tabId);
    let profileData: ProfileData;
    try {
      profileData = await chrome.tabs.sendMessage(tabId, {
        action: 'extractProfile',
      }) as ProfileData;
    } catch (msgError) {
      log.background('Failed to message content script: %O', msgError);
      return { exists: false, error: 'Content script not ready. Please refresh the page.' };
    }

    log.background('Profile data: %O', profileData);

    if (!profileData || profileData.error) {
      return { exists: false, error: profileData?.error || 'Failed to extract profile' };
    }

    const attribute = MATCHING_ATTRIBUTES[platform];
    const value = getAttributeValue(platform, profileData);

    log.background('Querying Attio: %O', { attribute, value });

    if (!value) {
      return { exists: false, profileData };
    }

    // Search for existing person
    const existingPerson = await findPersonByAttribute(apiKey, attribute, value);

    log.background('Search result: %s', existingPerson ? 'Found' : 'Not found');

    if (existingPerson) {
      // Get workspace slug for URL construction
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
      const attioName = existingPerson.values?.name?.[0]?.full_name ||
                        existingPerson.values?.name?.[0]?.first_name;
      const scrapedName = profileData.fullName;

      // Prefer scraped name if Attio name looks like a username (no spaces)
      const isAttioNameValid = attioName && attioName.includes(' ');
      const existingName = isAttioNameValid ? attioName : (scrapedName || attioName || 'Unknown');

      log.background('Resolved person name: %O', {
        fromAttioFullName: existingPerson.values?.name?.[0]?.full_name,
        fromAttioFirstName: existingPerson.values?.name?.[0]?.first_name,
        fromProfileData: scrapedName,
        isAttioNameValid,
        resolved: existingName,
      });

      // Update badge to show exists
      await updateBadge(tabId, BADGE_STATES.EXISTS);

      return {
        exists: true,
        person: {
          id: recordId,
          name: existingName,
          attioUrl,
        },
        profileData,
      };
    }

    // Update badge to show capturable
    await updateBadge(tabId, BADGE_STATES.CAPTURABLE);

    return { exists: false, profileData };
  } catch (error) {
    log.background('Check person error: %O', error);
    return { exists: false, error: (error as Error).message };
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
      return { success: false, error: 'Not authenticated. Please connect your Attio account.' };
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
  isUpdate?: boolean;
}

/**
 * Message listener for popup and content scripts
 */
chrome.runtime.onMessage.addListener(
  (
    message: MessageWithAction,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: CheckPersonResponse | CaptureResponse | { success: boolean }) => void
  ) => {
    if (message.action === 'checkPerson' && message.platform && message.tabId !== undefined) {
      handleCheckPerson(message.platform, message.tabId)
        .then(sendResponse)
        .catch((error: Error) => {
          log.background('Check person error: %O', error);
          sendResponse({ exists: false, error: 'Failed to check.' });
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
          sendResponse({ success: false, error: 'Internal error.' });
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
