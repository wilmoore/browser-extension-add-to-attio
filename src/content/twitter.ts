/**
 * X (Twitter) content script for profile extraction
 */

import { TWITTER_SELECTORS, TWITTER_NON_PROFILE_PATHS } from '../constants/index.js';
import { log } from '../lib/logger.js';
import { showFeedback } from './shared/feedback.js';
import type { ProfileData, ExtractProfileMessage, ShowFeedbackMessage } from '../types/index.js';

/**
 * Extract profile data from X/Twitter profile page
 */
export function extractTwitterProfile(): ProfileData {
  try {
    const url = window.location.href;

    // Validate we're on a profile page (not a tweet, etc.)
    const urlMatch = url.match(/(?:twitter|x)\.com\/([^/?]+)/);
    if (!urlMatch) {
      return {
        fullName: null,
        error: 'Could not identify profile. Make sure you are on an X profile page.',
      };
    }

    const username = urlMatch[1];

    // Skip non-profile pages
    if (TWITTER_NON_PROFILE_PATHS.includes(username.toLowerCase())) {
      return {
        fullName: null,
        error: 'Please navigate to a user profile page.',
      };
    }

    // Get display name - X uses a specific structure
    let displayName: string | null = null;
    for (const selector of TWITTER_SELECTORS.name) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text) {
        displayName = text;
        log.twitter('Found name with selector: %s', selector);
        break;
      }
    }

    // Get bio
    let bio: string | null = null;
    for (const selector of TWITTER_SELECTORS.bio) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text) {
        bio = text;
        log.twitter('Found bio with selector: %s', selector);
        break;
      }
    }

    // Construct profile URL (normalize to x.com)
    const profileUrl = `https://x.com/${username}`;

    log.twitter('Extracted profile data: %O', {
      displayName,
      username,
      profileUrl,
      bio: bio?.substring(0, 50) + (bio && bio.length > 50 ? '...' : ''),
    });

    // Validate we have minimum required data
    if (!username) {
      return {
        fullName: null,
        error: 'Could not find profile information. Make sure you are on an X profile page.',
      };
    }

    return {
      fullName: displayName || username,
      twitterHandle: username,
      description: bio,
      profileUrl,
    };
  } catch (error) {
    log.twitter('Extraction error: %O', error);
    return {
      fullName: null,
      error: 'Failed to extract profile data. Please try again.',
    };
  }
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtractProfileMessage | ShowFeedbackMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ProfileData | { received: boolean }) => void
  ) => {
    if (message.action === 'extractProfile') {
      const profileData = extractTwitterProfile();
      sendResponse(profileData);
      return true;
    }

    if (message.action === 'showFeedback') {
      showFeedback(message.success, message.message);
      sendResponse({ received: true });
      return true;
    }

    return false;
  }
);

// Log when content script loads
log.twitter('Content script loaded');
