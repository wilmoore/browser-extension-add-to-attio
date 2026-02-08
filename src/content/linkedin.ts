/**
 * LinkedIn content script for profile extraction
 */

import { LINKEDIN_SELECTORS } from '../constants/index.js';
import { log } from '../lib/logger.js';
import { showFeedback } from './shared/feedback.js';
import type { ProfileData, ExtractProfileMessage, ShowFeedbackMessage } from '../types/index.js';

/**
 * Extract profile data from LinkedIn profile page
 */
export function extractLinkedInProfile(): ProfileData {
  try {
    // Get the profile URL (canonical)
    const profileUrl = window.location.href.split('?')[0];

    // Extract username from URL
    const usernameMatch = profileUrl.match(/linkedin\.com\/in\/([^/]+)/);
    const username = usernameMatch ? usernameMatch[1] : null;

    // Get name - try multiple selectors as LinkedIn changes their HTML
    let fullName: string | null = null;
    for (const selector of LINKEDIN_SELECTORS.name) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      // Skip if text is too short or looks like a navigation element
      if (text && text.length > 1 && !text.includes('LinkedIn')) {
        fullName = text;
        log.linkedin('Found name with selector: %s -> %s', selector, fullName);
        break;
      }
    }

    // Get headline (usually in a div below the name)
    let headline: string | null = null;
    for (const selector of LINKEDIN_SELECTORS.headline) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text && text.length > 1) {
        headline = text;
        log.linkedin('Found headline with selector: %s', selector);
        break;
      }
    }

    log.linkedin('Extracted profile data: %O', {
      fullName,
      username,
      profileUrl,
      headline: headline?.substring(0, 50) + (headline && headline.length > 50 ? '...' : ''),
    });

    // Validate we have minimum required data
    if (!fullName && !username) {
      log.linkedin('Could not extract name or username');
      return {
        fullName: null,
        error: 'Could not find profile information. Make sure you are on a LinkedIn profile page.',
      };
    }

    // If we couldn't extract the name but have a username, use a formatted version of it
    // e.g., "john-doe-123" becomes "John Doe"
    let displayName = fullName;
    if (!displayName && username) {
      // Remove trailing numbers/IDs and convert dashes to spaces
      displayName = username
        .replace(/-\d+$/, '')           // Remove trailing -123 style IDs
        .replace(/-/g, ' ')             // Replace dashes with spaces
        .replace(/\b\w/g, c => c.toUpperCase());  // Capitalize each word
      log.linkedin('Using formatted username as name: %s', displayName);
    }

    return {
      fullName: displayName,
      linkedinUrl: profileUrl,
      username: username ?? undefined,
      description: headline ?? undefined,
    };
  } catch (error) {
    log.linkedin('Extraction error: %O', error);
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
      const profileData = extractLinkedInProfile();
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
log.linkedin('Content script loaded');
