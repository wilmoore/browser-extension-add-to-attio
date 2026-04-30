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

// In-flight guards to prevent concurrent modal open/close loops.
let inflightBasicExtract: Promise<ProfileData> | null = null;
let inflightFullExtract: Promise<ProfileData> | null = null;

export function decodeLinkedInRedirectUrl(href: string): string {
  try {
    const url = new URL(href);

    // LinkedIn commonly wraps external URLs like:
    // https://www.linkedin.com/redir/redirect?url=<encoded>
    if (url.hostname.endsWith('linkedin.com') && url.pathname.includes('/redir/redirect')) {
      const encoded = url.searchParams.get('url');
      if (encoded) return decodeURIComponent(encoded);
    }

    // Some variants use `url=` but not the /redir path.
    const encoded = url.searchParams.get('url');
    if (encoded && url.hostname.endsWith('linkedin.com')) {
      const decoded = decodeURIComponent(encoded);
      // Only treat it as redirect if it looks like a URL.
      if (/^https?:\/\//i.test(decoded)) return decoded;
    }
  } catch {
    // Ignore URL parse issues, fall back.
  }

  return href;
}

function safeQuerySelector(root: ParentNode, selector: string): Element | null {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function safeQuerySelectorAll(root: ParentNode, selector: string): Element[] {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function findOpenContactInfoModal(): Element | null {
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.modal) {
    const el = safeQuerySelector(document, selector);
    if (el) return el;
  }
  return null;
}

/**
 * Wait for an element to appear in the DOM
 */
function waitForElement(selectors: string[], timeout = TIMING.MODAL_WAIT_TIMEOUT): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if already exists
    for (const selector of selectors) {
      const element = safeQuerySelector(document, selector);
      if (element) {
        resolve(element);
        return;
      }
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      for (const selector of selectors) {
        const element = safeQuerySelector(document, selector);
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
    const link = safeQuerySelector(document, selector) as HTMLElement | null;
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
    const closeBtn = safeQuerySelector(document, selector) as HTMLElement | null;
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
function extractContactInfoFromModal(modalRoot: Element): ContactInfo {
  const emails: string[] = [];
  const websites: WebsiteEntry[] = [];
  let connectedSince: string | null = null;

  // Extract emails from mailto: links
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.email) {
    const emailLinks = safeQuerySelectorAll(modalRoot, selector);
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

  function extractLabeledValue(label: string): string | null {
    const normalizedLabel = label.trim().toLowerCase();
    const candidates = safeQuerySelectorAll(modalRoot, 'h3, h2, span, dt, strong');
    for (const el of candidates) {
      const text = el.textContent?.trim().toLowerCase() ?? '';
      if (text !== normalizedLabel) continue;

      const container = el.closest('section, li, div') ?? el.parentElement;
      if (!container) continue;

      // Prefer a sibling/time element first.
      const siblingText = el.nextElementSibling?.textContent?.trim();
      if (siblingText) return siblingText;

      const timeEl = safeQuerySelector(container, 'time');
      const timeText = timeEl?.textContent?.trim();
      if (timeText) return timeText;

      // Fall back: find first meaningful text in container that isn't the label.
      const leafs = safeQuerySelectorAll(container, 'span, a, time');
      for (const leaf of leafs) {
        const v = leaf.textContent?.trim();
        if (!v) continue;
        if (v.toLowerCase() === normalizedLabel) continue;
        return v;
      }
    }
    return null;
  }

  // Extract websites
  for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.website) {
    const websiteLinks = safeQuerySelectorAll(modalRoot, selector);
    websiteLinks.forEach((link) => {
      const rawHref = (link as HTMLAnchorElement).href;
      if (rawHref) {
        const href = decodeLinkedInRedirectUrl(rawHref);

        // Filter out LinkedIn internal URLs after decoding.
        if (href.includes('linkedin.com')) return;
        if (!/^https?:\/\//i.test(href)) return;

        // Try to find a label near this link
        const parent = link.closest('section, li, div.pv-contact-info__ci-container');
        let label: string | undefined;
        if (parent) {
          for (const labelSelector of LINKEDIN_CONTACT_INFO_SELECTORS.websiteLabel) {
            const labelEl = safeQuerySelector(parent, labelSelector);
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
  const connectedSinceValue = extractLabeledValue('Connected since');
  if (connectedSinceValue && /\d{4}/.test(connectedSinceValue)) {
    connectedSince = connectedSinceValue;
    log.linkedin('Found connected since: %s', connectedSince);
  }

  return { emails, websites, connectedSince };
}

/**
 * Auto-open contact info modal, extract data, and close it
 */
async function extractContactInfo(): Promise<ContactInfo | null> {
  // If modal is already open, avoid clicking/closing (prevents flashing loops).
  const existingModal = findOpenContactInfoModal();
  const alreadyOpen = Boolean(existingModal);

  try {
    let modal: Element | null = existingModal;

    if (!modal) {
      // Check if contact info link exists
      let hasLink = false;
      for (const selector of LINKEDIN_CONTACT_INFO_SELECTORS.triggerLink) {
        if (safeQuerySelector(document, selector)) {
          hasLink = true;
          break;
        }
      }

      if (!hasLink) {
        log.linkedin('Contact info link not available (likely not a 1st degree connection)');
        return null;
      }

      // Click to open modal
      if (!clickContactInfoLink()) {
        return null;
      }

      // Wait for modal to appear
      modal = await waitForElement(LINKEDIN_CONTACT_INFO_SELECTORS.modal);
    }

    if (!modal) {
      log.linkedin('Modal did not appear within timeout');
      return null;
    }

    // Small delay to let content load
    await new Promise(resolve => setTimeout(resolve, 200));

    // Extract data
    const contactInfo = extractContactInfoFromModal(modal);

    // Close modal only if we opened it.
    if (!alreadyOpen) {
      await new Promise(resolve => setTimeout(resolve, TIMING.MODAL_CLOSE_DELAY));
      closeContactInfoModal();
    }

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

async function extractLinkedInProfileWithOptions(includeContactInfo: boolean): Promise<ProfileData> {
  if (!includeContactInfo) {
    return extractLinkedInProfile();
  }
  return extractLinkedInProfileWithContactInfo();
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
      const includeContactInfo = (message as ExtractProfileMessage).includeContactInfo !== false;

      const getOrStart = (include: boolean): Promise<ProfileData> => {
        const existing = include ? inflightFullExtract : inflightBasicExtract;
        if (existing) return existing;

        const p = (async () => extractLinkedInProfileWithOptions(include))();
        if (include) inflightFullExtract = p;
        else inflightBasicExtract = p;

        void p.finally(() => {
          // Only clear if we haven't been replaced by a newer in-flight promise.
          if (include) {
            if (inflightFullExtract === p) inflightFullExtract = null;
          } else {
            if (inflightBasicExtract === p) inflightBasicExtract = null;
          }
        });

        return p;
      };

      getOrStart(includeContactInfo).then(sendResponse).catch((error) => {
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
