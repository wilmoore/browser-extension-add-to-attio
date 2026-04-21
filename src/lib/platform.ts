import { PLATFORM_PATTERNS, TWITTER_NON_PROFILE_PATHS } from '../constants/index.js';
import type { Platform } from '../types/index.js';

export function detectPlatformFromUrl(url: string): Platform | null {
  if (!url) return null;

  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (!pattern.test(url)) continue;

    if (platform === 'twitter') {
      const match = url.match(/(?:twitter|x)\.com\/([^/?]+)/);
      if (match && TWITTER_NON_PROFILE_PATHS.includes(match[1].toLowerCase())) {
        return null;
      }
    }

    return platform as Platform;
  }

  return null;
}

/**
 * Extract LinkedIn profile URL from a page URL.
 * Returns the canonical LinkedIn profile URL (https://linkedin.com/in/{handle})
 */
export function extractLinkedInUrlFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match) return null;
  return `https://linkedin.com/in/${match[1]}`;
}

/**
 * Extract Twitter/X handle from a page URL.
 * Returns the handle without @ prefix.
 */
export function extractTwitterHandleFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:twitter|x)\.com\/([^/?#]+)/i);
  if (!match) return null;
  const handle = match[1].toLowerCase();
  // Skip non-profile paths
  if (TWITTER_NON_PROFILE_PATHS.includes(handle)) return null;
  return handle;
}

/**
 * Extract Reddit username from a page URL.
 * Returns the username.
 */
export function extractRedditUsernameFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/reddit\.com\/user\/([^/?#]+)/i);
  return match ? match[1] : null;
}

/**
 * Extract the matching attribute value from a URL based on platform.
 * This allows looking up contacts in Attio without needing the content script.
 */
export function extractMatchingValueFromUrl(platform: Platform, url: string): string | null {
  switch (platform) {
    case 'linkedin':
      return extractLinkedInUrlFromUrl(url);
    case 'twitter':
      return extractTwitterHandleFromUrl(url);
    case 'reddit':
      return extractRedditUsernameFromUrl(url);
    default:
      return null;
  }
}
