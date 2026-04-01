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

// Badge states for extension icon
export const BADGE_STATES: Record<string, BadgeState> = {
  EXISTS: { text: '', color: '#10b981' },      // Green - person in Attio
  CAPTURABLE: { text: '', color: '#f59e0b' },  // Orange - can capture
  NONE: { text: '', color: [0, 0, 0, 0] as [number, number, number, number] },      // No badge
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
    'a[href="#"][data-control-name="contact_see_more"]',
    'a#top-card-text-details-contact-info',
    'a[href*="overlay/contact-info"]',
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
  TOAST_AUTO_DISMISS: 3000,
  TOAST_FADE_DURATION: 300,
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
