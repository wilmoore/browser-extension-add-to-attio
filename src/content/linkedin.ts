/**
 * LinkedIn content script for profile extraction
 */

import { LINKEDIN_SELECTORS, LINKEDIN_CONTACT_INFO_SELECTORS, TIMING } from '../constants/index.js';
import { log } from '../lib/logger.js';
import { showFeedback } from './shared/feedback.js';
import type { ProfileData, ExtractProfileMessage, ShowFeedbackMessage, WebsiteEntry } from '../types/index.js';

/**
 * Contact info extracted from LinkedIn modal
 */
interface ContactInfo {
  emails: string[];
  websites: WebsiteEntry[];
  connectedSince: string | null;
}

/**
 * Wait for an element to appear in the DOM
 */
function waitForElement(selectors: string[], timeout = TIMING.MODAL_WAIT_TIMEOUT): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if already exists
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(interval);
          resolve(element);
          return;
        }
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, TIMING.MODAL_POLL_INTERVAL);
  });
}

/**
 * Find and click the contact info link to open the modal
 */
function clickContactInfoLink(): boolean {
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.triggerLink) {
    const link = document.querySelector(selector) as HTMLElement | null;
    if (link) {
      log.linkedin('Clicking contact info link: %s', selector);
      link.click();
      return true;
    }
  }
  log.linkedin('Contact info link not found');
  return false;
}

/**
 * Close the contact info modal
 */
function closeContactInfoModal(): void {
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.closeButton) {
    const closeBtn = document.querySelector(selector) as HTMLElement | null;
    if (closeBtn) {
      log.linkedin('Closing modal with: %s', selector);
      closeBtn.click();
      return;
    }
  }
  // Fallback: press Escape key
  log.linkedin('Close button not found, pressing Escape');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

/**
 * Extract contact info from the open modal
 */
function extractContactInfoFromModal(): ContactInfo {
  const emails: string[] = [];
  const websites: WebsiteEntry[] = [];
  let connectedSince: string | null = null;

  // Extract emails from mailto: links
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.email) {
    const emailLinks = document.querySelectorAll(selector);
    emailLinks.forEach((link) => {
      const href = (link as HTMLAnchorElement).href;
      if (href?.startsWith('mailto:')) {
        const email = href.replace('mailto:', '').split('?')[0];
        if (email && !emails.includes(email)) {
          emails.push(email);
          log.linkedin('Found email: %s', email);
        }
      }
    });
  }

  // Extract websites
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.website) {
    const websiteLinks = document.querySelectorAll(selector);
    websiteLinks.forEach((link) => {
      const href = (link as HTMLAnchorElement).href;
      if (href && !href.includes('linkedin.com')) {
        // Try to find a label near this link
        const parent = link.closest('section, li, div.pv-contact-info__ci-container');
        let label: string | undefined;
        if (parent) {
          for (const labelSelector of LINKEDIN_CONTACT_INFO_SELECTORS.websiteLabel) {
            const labelEl = parent.querySelector(labelSelector);
            if (labelEl) {
              const labelText = labelEl.textContent?.trim();
              // Filter out generic labels
              if (labelText && !labelText.includes('http') && labelText.length < 30) {
                label = labelText;
                break;
              }
            }
          }
        }

        // Check if we already have this URL
        if (!websites.some(w => w.url === href)) {
          websites.push({ url: href, label });
          log.linkedin('Found website: %s (%s)', href, label ?? 'no label');
        }
      }
    });
  }

  // Extract connected since date
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.connectedSince) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      // Look for date patterns like "Apr 4, 2026" or "Connected since Apr 2026"
      if (text && /\d{4}/.test(text)) {
        connectedSince = text;
        log.linkedin('Found connected since: %s', connectedSince);
        break;
      }
    }
  }

  return { emails, websites, connectedSince };
}

/**
 * Auto-open contact info modal, extract data, and close it
 */
async function extractContactInfo(): Promise<ContactInfo | null> {
  // Check if contact info link exists
  let hasLink = false;
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.triggerLink) {
    if (document.querySelector(selector)) {
      hasLink = true;
      break;
    }
  }

  if (!hasLink) {
    log.linkedin('Contact info link not available (likely not a 1st degree connection)');
    return null;
  }

  try {
    // Click to open modal
    if (!clickContactInfoLink()) {
      return null;
    }

    // Wait for modal to appear
    const modal = await waitForElement(LINKEDIN_CONTACT_INFO_SELECTORS.modal);
    if (!modal) {
      log.linkedin('Modal did not appear within timeout');
      return null;
    }

    // Small delay to let content load
    await new Promise(resolve => setTimeout(resolve, 200));

    // Extract data
    const contactInfo = extractContactInfoFromModal();

    // Close modal
    await new Promise(resolve => setTimeout(resolve, TIMING.MODAL_CLOSE_DELAY));
    closeContactInfoModal();

    log.linkedin('Extracted contact info: %O', {
      emailCount: contactInfo.emails.length,
      websiteCount: contactInfo.websites.length,
      connectedSince: contactInfo.connectedSince,
    });

    return contactInfo;
  } catch (error) {
    log.linkedin('Error extracting contact info: %O', error);
    // Try to close modal if it's open
    closeContactInfoModal();
    return null;
  }
}

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
 * Extract profile data with contact info (async)
 * Opens contact info modal if available, extracts data, and merges with profile
 */
async function extractLinkedInProfileWithContactInfo(): Promise<ProfileData> {
  // First get basic profile data
  const profileData = extractLinkedInProfile();

  // If basic extraction failed, return error
  if (profileData.error || !profileData.fullName) {
    return profileData;
  }

  // If contact info is available, try to extract it
  if (profileData.hasContactInfo) {
    log.linkedin('Contact info available, attempting extraction...');
    const contactInfo = await extractContactInfo();

    if (contactInfo) {
      // Merge contact info into profile data
      if (contactInfo.emails.length > 0) {
        profileData.emails = contactInfo.emails;
      }
      if (contactInfo.websites.length > 0) {
        profileData.websites = contactInfo.websites;
      }
      if (contactInfo.connectedSince) {
        profileData.connectedSince = contactInfo.connectedSince;
      }

      log.linkedin('Profile data with contact info: %O', {
        ...profileData,
        emails: profileData.emails?.length ?? 0,
        websites: profileData.websites?.length ?? 0,
      });
    }
  }

  return profileData;
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
      // Use async extraction with contact info
      extractLinkedInProfileWithContactInfo()
        .then(sendResponse)
        .catch((error) => {
          log.linkedin('Async extraction error: %O', error);
          // Fall back to sync extraction
          sendResponse(extractLinkedInProfile());
        });
      return true; // Keep message channel open for async response
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
