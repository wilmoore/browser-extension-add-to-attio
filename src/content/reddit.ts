/**
 * Reddit content script for profile extraction
 */

import { REDDIT_SELECTORS } from '../constants/index.js';
import { log } from '../lib/logger.js';
import { showFeedback } from './shared/feedback.js';
import type { ProfileData, ExtractProfileMessage, ShowFeedbackMessage } from '../types/index.js';

/**
 * Extract profile data from Reddit user page
 */
export function extractRedditProfile(): ProfileData {
  try {
    const url = window.location.href;

    // Extract username from URL
    const urlMatch = url.match(/reddit\.com\/user\/([^/?]+)/);
    if (!urlMatch) {
      return {
        fullName: null,
        error: 'Could not identify user. Make sure you are on a Reddit user profile page.',
      };
    }

    const username = urlMatch[1];

    // Skip special pages
    if (username === 'me') {
      return {
        fullName: null,
        error: 'Please navigate to a specific user profile page.',
      };
    }

    // Construct profile URL
    const profileUrl = `https://www.reddit.com/user/${username}`;

    // Try to get display name if available (Reddit doesn't always show this)
    let displayName: string | null = null;
    for (const selector of REDDIT_SELECTORS.displayName) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text) {
        displayName = text;
        log.reddit('Found display name with selector: %s', selector);
        break;
      }
    }

    // Try to get user bio/description
    let bio: string | null = null;
    for (const selector of REDDIT_SELECTORS.bio) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text) {
        bio = text;
        log.reddit('Found bio with selector: %s', selector);
        break;
      }
    }

    log.reddit('Extracted profile data: %O', {
      displayName,
      username,
      profileUrl,
      bio: bio?.substring(0, 50) + (bio && bio.length > 50 ? '...' : ''),
    });

    return {
      fullName: displayName || `u/${username}`,
      redditUsername: username,
      description: bio,
      profileUrl,
    };
  } catch (error) {
    log.reddit('Extraction error: %O', error);
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
      const profileData = extractRedditProfile();
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
log.reddit('Content script loaded');
