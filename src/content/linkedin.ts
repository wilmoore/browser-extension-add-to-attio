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

    // Get avatar URL from profile image
    let avatarUrl: string | null = null;
    for (const selector of LINKEDIN_SELECTORS.avatar) {
      const element = document.querySelector(selector) as HTMLImageElement | null;
      if (element?.src && !element.src.includes('ghost')) {
        avatarUrl = element.src;
        log.linkedin('Found avatar with selector: %s', selector);
        break;
      }
    }

    // Get location from profile header
    let location: string | null = null;
    for (const selector of LINKEDIN_SELECTORS.location) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text && text.length > 1) {
        location = text;
        log.linkedin('Found location with selector: %s -> %s', selector, location);
        break;
      }
    }

    // Extract company from headline (typically "Title at Company")
    let company: string | null = null;
    if (headline) {
      // Common patterns: "Title at Company", "Role @ Company", "Title | Company"
      const companyMatch = headline.match(/(?:at|@|\|)\s+(.+?)(?:\s*[·•|]|$)/i);
      if (companyMatch) {
        company = companyMatch[1].trim();
        log.linkedin('Extracted company from headline: %s', company);
      }
    }

    // Detect connection degree from profile badges
    let connectionDegree: string | null = null;
    const connectionBadge = document.querySelector('.dist-value, .distance-badge, [class*="connection-degree"]');
    if (connectionBadge) {
      const badgeText = connectionBadge.textContent?.trim();
      if (badgeText?.match(/^(1st|2nd|3rd)$/i)) {
        connectionDegree = badgeText;
        log.linkedin('Found connection degree: %s', connectionDegree);
      }
    }

    // Detect if Contact Info link is visible (available for 1st degree connections)
    let hasContactInfo = false;
    for (const selector of LINKEDIN_SELECTORS.contactInfoLink) {
      const element = document.querySelector(selector);
      if (element) {
        hasContactInfo = true;
        log.linkedin('Contact info link found with selector: %s', selector);
        break;
      }
    }

    log.linkedin('Extracted profile data: %O', {
      fullName,
      username,
      profileUrl,
      headline: headline?.substring(0, 50) + (headline && headline.length > 50 ? '...' : ''),
      avatarUrl: avatarUrl ? '[present]' : null,
      location,
      company,
      connectionDegree,
      hasContactInfo,
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
      avatarUrl: avatarUrl ?? undefined,
      company: company ?? undefined,
      location: location ?? undefined,
      connectionDegree: connectionDegree ?? undefined,
      hasContactInfo,
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
