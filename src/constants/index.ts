/**
 * Centralized constants for Add to Attio extension
 */

import type { Platform, BadgeState } from '../types/index.js';

// Attio API base URL
export const ATTIO_API_BASE = 'https://api.attio.com/v2';

// Platform URL patterns for detection
export const PLATFORM_PATTERNS: Record<Platform, RegExp> = {
  linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[^/]+/,
  twitter: /^https:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/?$/,
  reddit: /^https:\/\/(www\.)?reddit\.com\/user\/[^/]+/,
};

// Attio matching attributes for deduplication (these are Attio People attribute slugs)
export const MATCHING_ATTRIBUTES: Record<Platform, string> = {
  linkedin: 'linkedin',
  twitter: 'twitter',
  reddit: 'name', // Reddit doesn't have a dedicated field, use name
};

// Badge states for extension icon (all use icon-based indication, no text badges)
export const BADGE_STATES: Record<string, BadgeState> = {
  EXISTS: { text: '', color: [0, 0, 0, 0] as [number, number, number, number] },              // Person + green checkmark
  EXISTS_WITH_UPDATES: { text: '', color: [0, 0, 0, 0] as [number, number, number, number] }, // Person + orange dot
  CAPTURABLE: { text: '', color: [0, 0, 0, 0] as [number, number, number, number] },          // Person + purple plus
  NONE: { text: '', color: [0, 0, 0, 0] as [number, number, number, number] },                // Default icon (no badge)
  LOADING: { text: '', color: [0, 0, 0, 0] as [number, number, number, number] },             // Person icon (no indicator) - loading state
};

// Extension icon paths for different states
// All states use person silhouette with different badge indicators
export const EXTENSION_ICONS = {
  // Default icon (original + in square) - for NONE state (non-profile pages)
  DEFAULT: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  // CAPTURABLE icon (person + purple plus) - new contact can be added
  CAPTURABLE: {
    16: 'icons/icon-capturable-16.png',
    48: 'icons/icon-capturable-48.png',
    128: 'icons/icon-capturable-128.png',
  },
  // EXISTS icon (person + green checkmark) - contact in Attio, up to date
  EXISTS: {
    16: 'icons/icon-exists-16.png',
    48: 'icons/icon-exists-48.png',
    128: 'icons/icon-exists-128.png',
  },
  // EXISTS_WITH_UPDATES icon (person + orange dot) - contact has available updates
  EXISTS_WITH_UPDATES: {
    16: 'icons/icon-updates-16.png',
    48: 'icons/icon-updates-48.png',
    128: 'icons/icon-updates-128.png',
  },
  // LOADING icon (person silhouette, no indicator) - shown while checking state
  LOADING: {
    16: 'icons/icon-loading-16.png',
    48: 'icons/icon-loading-48.png',
    128: 'icons/icon-loading-128.png',
  },
};

// Non-profile paths to skip on Twitter/X
export const TWITTER_NON_PROFILE_PATHS = [
  'home',
  'explore',
  'notifications',
  'messages',
  'settings',
  'i',
  'search',
];

// LinkedIn profile selectors (ordered by stability/reliability)
// Note: LinkedIn uses both h1 and h2 for profile names depending on layout version
export const LINKEDIN_SELECTORS = {
  name: [
    // Semantic selectors - name inside profile link is most stable
    'a[href*="/in/"] h1',                        // h1 inside profile link
    'a[href*="/in/"] h2',                        // h2 inside profile link (2026+ SDUI)
    // Fallback to main content headings
    'main h1',
    'main h2',
    // Last resort
    'h1',
    'h2',
  ],
  headline: [
    '.text-body-medium.break-words',
    '[data-anonymize="headline"]',
    '.pv-top-card--list .text-body-medium',
    '.pv-top-card .pv-top-card--photo-resize + div + div',
  ],
  // Profile avatar selectors
  avatar: [
    'img.pv-top-card-profile-picture__image--show',
    'img.pv-top-card__photo',
    '.pv-top-card__photo-wrapper img',
    'img[data-anonymous="profile-photo"]',
    '.presence-entity__image',
    'img.profile-photo-edit__preview',
  ],
  // Location selectors (e.g., "Denver Metropolitan Area")
  location: [
    '.text-body-small.inline.t-black--light.break-words',
    '[data-anonymize="location"]',
    '.pv-top-card--list-bullet .text-body-small',
    '.pv-top-card__location',
  ],
  // Contact info link (to detect if visible for 1st degree connections)
  contactInfoLink: [
    // Modern LinkedIn - about section contact info
    'a[href*="contact-info"]',
    // Legacy
    'a[href="#"][data-control-name="contact_see_more"]',
    'a#top-card-text-details-contact-info',
    'a[href*="overlay/contact-info"]',
    // Fallback - any link/button in about section
    '[data-test-id="about-section"] a',
    '.pv-about-section a',
  ],
};

// LinkedIn Contact Info Modal selectors
// Used to extract email, website, and connected since from the modal
export const LINKEDIN_CONTACT_INFO_SELECTORS = {
  // Link that opens the contact info modal
  triggerLink: [
    // Modern LinkedIn - Contact info in About section
    'a[href*="contact-info"]',
    'button[aria-label*="Contact"]',
    // Legacy selectors
    'a[href*="overlay/contact-info"]',
    'a#top-card-text-details-contact-info',
    '[data-control-name="contact_see_more"]',
  ],
  // Modal container detection
  modal: [
    // Modern LinkedIn modal
    '[role="dialog"][aria-label*="Contact"]',
    '.artdeco-modal',
    '[data-test-modal]', 
    // Legacy
    '[role="dialog"]',
    '.pv-contact-info',
  ],
  // Close button for modal
  closeButton: [
    'button[aria-label="Dismiss"]',
    'button[aria-label="Close"]',
    'button.artdeco-modal__dismiss',
    '[data-test-modal-close-btn]',
    'button[data-test-modal-close-btn]',
  ],
  // Email addresses - look for mailto: links or labeled email elements
  email: [
    // Modern - any link with mailto
    'a[href^="mailto:"]',
    // Legacy
    'section.ci-email a',
    '.pv-contact-info__ci-container a[href^="mailto:"]',
    // Fallback - look in any section that might contain email
    '.contact-info-section a[href^="mailto:"]',
  ],
  // Websites - look for external links (not LinkedIn)
  website: [
    // Modern LinkedIn - includes linkedin.com redir links; decode later.
    'a[href^="http"]',
    // Legacy
    'section.ci-websites a[href^="http"]',
    '.pv-contact-info__ci-container a[href^="http"]:not([href*="linkedin.com"])',
    '.ci-vanity-url a[href^="http"]:not([href*="linkedin.com"])',
  ],
  // Website label (e.g., "Company", "Personal")
  websiteLabel: [
    // Legacy
    '.pv-contact-info__ci-container .t-black--light',
    '.t-12.t-black--light',
  ],
  // Connected since date
  connectedSince: [
    // Modern LinkedIn
    'time[datetime]',
    'span[title*="Connected"]',
    // Legacy
    '.pv-contact-info__ci-container time',
    'section.ci-connected .t-black',
    '.pv-contact-info__contact-item time',
  ],
};

// Twitter/X profile selectors
export const TWITTER_SELECTORS = {
  name: [
    '[data-testid="UserName"] span span',
    'h2[role="heading"] span span',
  ],
  bio: [
    '[data-testid="UserDescription"]',
  ],
};

// Reddit profile selectors
export const REDDIT_SELECTORS = {
  displayName: [
    '[data-testid="profile-header-display-name"]',
    'h1',
  ],
  bio: [
    '[data-testid="profile-header-about"]',
    '.Profile__description',
  ],
};

// Timing constants
export const TIMING = {
  BADGE_CHECK_DELAY: 500,
  BADGE_RETRY_DELAYS: [1000, 2000],  // Retry at 1s, 2s after initial failure
  POPUP_RETRY_DELAY: 500,            // Popup auto-retry delay
  TOAST_AUTO_DISMISS: 3000,
  TOAST_FADE_DURATION: 300,
  // Contact info modal interaction timing
  MODAL_WAIT_TIMEOUT: 3000,     // Max time to wait for modal to appear
  MODAL_POLL_INTERVAL: 100,     // Polling interval for modal detection
  MODAL_CLOSE_DELAY: 100,       // Delay before closing modal
};

// Supported platforms configuration for popup
export const SUPPORTED_PLATFORMS: Record<Platform, { pattern: RegExp; name: string }> = {
  linkedin: {
    pattern: /^https:\/\/(www\.)?linkedin\.com\/in\//,
    name: 'LinkedIn',
  },
  twitter: {
    pattern: /^https:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/?$/,
    name: 'X (Twitter)',
  },
  reddit: {
    pattern: /^https:\/\/(www\.)?reddit\.com\/user\//,
    name: 'Reddit',
  },
};
