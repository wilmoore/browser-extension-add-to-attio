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
export const LINKEDIN_SELECTORS = {
  name: [
    'h1.text-heading-xlarge',                    // Current main profile (2024+)
    '.pv-text-details__left-panel h1',           // Profile details panel
    '[data-generated-suggestion-target] h1',     // Suggested profile variant
    'h1[data-anonymize="person-name"]',          // Data attribute variant
    '.ph5 h1',                                   // Mobile/compact view
    '.pv-top-card h1',                           // Top card variant
    '.scaffold-layout__main h1',                 // Layout variant
    'section.pv-top-card h1',                    // Section variant
    '.artdeco-card h1',                          // Card container variant
    'main h1',                                   // Main content h1
    'h1',                                        // Last resort: first h1
  ],
  headline: [
    '.text-body-medium.break-words',
    '[data-anonymize="headline"]',
    '.pv-top-card--list .text-body-medium',
    '.pv-top-card .pv-top-card--photo-resize + div + div',
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
