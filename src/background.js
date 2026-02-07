/**
 * Background service worker for Add to Attio extension
 * Handles message passing, API calls, and badge management
 */

import { getApiKey, updateLastSync } from './lib/storage.js';
import { upsertPerson, findPersonByAttribute, getWorkspaceSlug, AttioApiError } from './lib/attio-api.js';

/**
 * Platform-specific matching attributes for deduplication
 * These are the Attio attribute slugs (not display names)
 */
const MATCHING_ATTRIBUTES = {
  linkedin: 'linkedin',  // Attio People attribute slug
  twitter: 'twitter',    // Attio People attribute slug
  reddit: 'name'         // Reddit doesn't have a dedicated field, use name
};

/**
 * URL patterns for supported platforms
 */
const PLATFORM_PATTERNS = {
  linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[^/]+/,
  twitter: /^https:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/?$/,
  reddit: /^https:\/\/(www\.)?reddit\.com\/user\/[^/]+/
};

/**
 * Badge states
 */
const BADGE_STATES = {
  EXISTS: { text: '', color: '#10b981' },      // Green - person in Attio
  CAPTURABLE: { text: '', color: '#f59e0b' },  // Orange - can capture
  NONE: { text: '', color: [0, 0, 0, 0] }      // No badge
};

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  if (!url) return null;

  // Skip non-profile Twitter/X pages
  const nonProfilePaths = ['home', 'explore', 'notifications', 'messages', 'settings', 'i', 'search'];

  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      // Additional check for Twitter to exclude non-profile pages
      if (platform === 'twitter') {
        const match = url.match(/(?:twitter|x)\.com\/([^/?]+)/);
        if (match && nonProfilePaths.includes(match[1].toLowerCase())) {
          return null;
        }
      }
      return platform;
    }
  }
  return null;
}

/**
 * Get the attribute value from profile data based on platform
 */
function getAttributeValue(platform, profileData) {
  switch (platform) {
    case 'linkedin':
      return profileData.linkedinUrl;
    case 'twitter':
      return profileData.twitterHandle;
    case 'reddit':
      return profileData.fullName;
    default:
      return null;
  }
}

/**
 * Update the extension badge for a tab
 */
async function updateBadge(tabId, state) {
  try {
    // Use a small dot character for the badge
    await chrome.action.setBadgeText({
      tabId,
      text: state === BADGE_STATES.NONE ? '' : '\u2022' // bullet point
    });

    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: state.color
    });
  } catch (error) {
    // Tab may no longer exist
    console.debug('Badge update failed:', error.message);
  }
}

/**
 * Check badge state for a tab and update accordingly
 */
async function checkAndUpdateBadge(tabId, url) {
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
      action: 'extractProfile'
    });

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
    console.debug('Badge check error:', error.message);
    await updateBadge(tabId, BADGE_STATES.CAPTURABLE);
  }
}

/**
 * Check if a person exists in Attio based on the current page
 */
async function handleCheckPerson(platform, tabId) {
  console.log('[Add to Attio] handleCheckPerson called:', { platform, tabId });

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.log('[Add to Attio] No API key found');
      return { exists: false, error: 'Not authenticated.' };
    }

    // Extract profile data from page
    console.log('[Add to Attio] Extracting profile data from tab:', tabId);
    let profileData;
    try {
      profileData = await chrome.tabs.sendMessage(tabId, {
        action: 'extractProfile'
      });
    } catch (msgError) {
      console.error('[Add to Attio] Failed to message content script:', msgError);
      return { exists: false, error: 'Content script not ready. Please refresh the page.' };
    }

    console.log('[Add to Attio] Profile data:', profileData);

    if (!profileData || profileData.error) {
      return { exists: false, error: profileData?.error || 'Failed to extract profile' };
    }

    const attribute = MATCHING_ATTRIBUTES[platform];
    const value = getAttributeValue(platform, profileData);

    console.log('[Add to Attio] Querying Attio:', { attribute, value });

    if (!value) {
      return { exists: false, profileData };
    }

    // Search for existing person
    const existingPerson = await findPersonByAttribute(apiKey, attribute, value);

    console.log('[Add to Attio] Search result:', existingPerson ? 'Found' : 'Not found');

    if (existingPerson) {
      // Get workspace slug for URL construction
      const workspaceSlug = await getWorkspaceSlug(apiKey);
      const recordId = existingPerson.id?.record_id;

      console.log('[Add to Attio] Building Attio URL:', {
        workspaceSlug,
        recordId,
        existingPersonId: existingPerson.id
      });

      let attioUrl = null;
      if (workspaceSlug && recordId) {
        attioUrl = `https://app.attio.com/${workspaceSlug}/person/${recordId}`;
      } else {
        console.warn('[Add to Attio] Missing workspaceSlug or recordId for URL construction');
      }

      // Extract name from existing record, falling back to scraped data
      const existingName = existingPerson.values?.name?.[0]?.full_name ||
                          existingPerson.values?.name?.[0]?.first_name ||
                          profileData.fullName ||
                          'Unknown';

      console.log('[Add to Attio] Resolved person name:', {
        fromAttioFullName: existingPerson.values?.name?.[0]?.full_name,
        fromAttioFirstName: existingPerson.values?.name?.[0]?.first_name,
        fromProfileData: profileData.fullName,
        resolved: existingName
      });

      // Update badge to show exists
      await updateBadge(tabId, BADGE_STATES.EXISTS);

      return {
        exists: true,
        person: {
          id: recordId,
          name: existingName,
          attioUrl
        },
        profileData
      };
    }

    // Update badge to show capturable
    await updateBadge(tabId, BADGE_STATES.CAPTURABLE);

    return { exists: false, profileData };
  } catch (error) {
    console.error('[Add to Attio] Check person error:', error);
    return { exists: false, error: error.message };
  }
}

/**
 * Handle profile capture request
 */
async function handleCaptureProfile(platform, tabId, isUpdate = false) {
  try {
    // Get API key
    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, error: 'Not authenticated. Please connect your Attio account.' };
    }

    // Send message to content script to extract profile data
    const profileData = await chrome.tabs.sendMessage(tabId, {
      action: 'extractProfile'
    });

    if (!profileData || profileData.error) {
      return {
        success: false,
        error: profileData?.error || 'Failed to extract profile data.'
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
    let attioUrl = null;
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
      message
    });

    return { success: true, data: result, attioUrl };
  } catch (error) {
    console.error('Capture error:', error);

    let errorMessage = 'An unexpected error occurred.';

    if (error instanceof AttioApiError) {
      errorMessage = error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Notify content script of error
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'showFeedback',
        success: false,
        message: errorMessage
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
      checkAndUpdateBadge(tabId, tab.url);
    }, 500);
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
    console.debug('Tab activation error:', error.message);
  }
});

/**
 * Message listener for popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkPerson') {
    handleCheckPerson(message.platform, message.tabId)
      .then(sendResponse)
      .catch((error) => {
        console.error('Check person error:', error);
        sendResponse({ exists: false, error: 'Failed to check.' });
      });
    return true;
  }

  if (message.action === 'captureProfile') {
    handleCaptureProfile(message.platform, message.tabId, message.isUpdate)
      .then((result) => {
        // Badge is updated inside handleCaptureProfile
        sendResponse(result);
      })
      .catch((error) => {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: 'Internal error.' });
      });
    return true;
  }

  // Allow content scripts to trigger badge refresh
  if (message.action === 'refreshBadge' && sender.tab) {
    checkAndUpdateBadge(sender.tab.id, sender.tab.url);
    sendResponse({ success: true });
    return true;
  }
});

// Log when service worker starts
console.log('Add to Attio: Background service worker started');
