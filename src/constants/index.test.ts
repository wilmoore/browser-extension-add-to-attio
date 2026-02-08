/**
 * Tests for centralized constants
 */

import { describe, it, expect } from 'vitest';
import {
  ATTIO_API_BASE,
  PLATFORM_PATTERNS,
  MATCHING_ATTRIBUTES,
  BADGE_STATES,
  TWITTER_NON_PROFILE_PATHS,
  LINKEDIN_SELECTORS,
  TWITTER_SELECTORS,
  REDDIT_SELECTORS,
  TIMING,
  SUPPORTED_PLATFORMS,
} from './index.js';

describe('ATTIO_API_BASE', () => {
  it('is the correct Attio API URL', () => {
    expect(ATTIO_API_BASE).toBe('https://api.attio.com/v2');
  });
});

describe('PLATFORM_PATTERNS', () => {
  describe('linkedin', () => {
    it('matches LinkedIn profile URLs', () => {
      expect(PLATFORM_PATTERNS.linkedin.test('https://www.linkedin.com/in/john-doe')).toBe(true);
      expect(PLATFORM_PATTERNS.linkedin.test('https://linkedin.com/in/john-doe')).toBe(true);
      expect(PLATFORM_PATTERNS.linkedin.test('https://www.linkedin.com/in/john-doe-123abc')).toBe(true);
    });

    it('does not match non-profile LinkedIn URLs', () => {
      expect(PLATFORM_PATTERNS.linkedin.test('https://www.linkedin.com/company/attio')).toBe(false);
      expect(PLATFORM_PATTERNS.linkedin.test('https://www.linkedin.com/feed')).toBe(false);
    });
  });

  describe('twitter', () => {
    it('matches Twitter/X profile URLs', () => {
      expect(PLATFORM_PATTERNS.twitter.test('https://twitter.com/johndoe')).toBe(true);
      expect(PLATFORM_PATTERNS.twitter.test('https://www.twitter.com/johndoe')).toBe(true);
      expect(PLATFORM_PATTERNS.twitter.test('https://x.com/johndoe')).toBe(true);
      expect(PLATFORM_PATTERNS.twitter.test('https://x.com/johndoe/')).toBe(true);
    });

    it('does not match tweet URLs', () => {
      expect(PLATFORM_PATTERNS.twitter.test('https://twitter.com/johndoe/status/123')).toBe(false);
    });
  });

  describe('reddit', () => {
    it('matches Reddit user profile URLs', () => {
      expect(PLATFORM_PATTERNS.reddit.test('https://www.reddit.com/user/johndoe')).toBe(true);
      expect(PLATFORM_PATTERNS.reddit.test('https://reddit.com/user/johndoe')).toBe(true);
    });

    it('does not match subreddit URLs', () => {
      expect(PLATFORM_PATTERNS.reddit.test('https://www.reddit.com/r/programming')).toBe(false);
    });
  });
});

describe('MATCHING_ATTRIBUTES', () => {
  it('has linkedin attribute for linkedin platform', () => {
    expect(MATCHING_ATTRIBUTES.linkedin).toBe('linkedin');
  });

  it('has twitter attribute for twitter platform', () => {
    expect(MATCHING_ATTRIBUTES.twitter).toBe('twitter');
  });

  it('has name attribute for reddit platform (no dedicated field)', () => {
    expect(MATCHING_ATTRIBUTES.reddit).toBe('name');
  });
});

describe('BADGE_STATES', () => {
  it('has EXISTS state with green color', () => {
    expect(BADGE_STATES.EXISTS.color).toBe('#10b981');
  });

  it('has CAPTURABLE state with orange color', () => {
    expect(BADGE_STATES.CAPTURABLE.color).toBe('#f59e0b');
  });

  it('has NONE state with transparent color', () => {
    expect(BADGE_STATES.NONE.color).toEqual([0, 0, 0, 0]);
  });
});

describe('TWITTER_NON_PROFILE_PATHS', () => {
  it('includes common non-profile paths', () => {
    expect(TWITTER_NON_PROFILE_PATHS).toContain('home');
    expect(TWITTER_NON_PROFILE_PATHS).toContain('explore');
    expect(TWITTER_NON_PROFILE_PATHS).toContain('notifications');
    expect(TWITTER_NON_PROFILE_PATHS).toContain('messages');
    expect(TWITTER_NON_PROFILE_PATHS).toContain('settings');
    expect(TWITTER_NON_PROFILE_PATHS).toContain('search');
  });
});

describe('LINKEDIN_SELECTORS', () => {
  it('has name selectors defined', () => {
    expect(LINKEDIN_SELECTORS.name).toBeInstanceOf(Array);
    expect(LINKEDIN_SELECTORS.name.length).toBeGreaterThan(0);
    expect(LINKEDIN_SELECTORS.name[0]).toBe('h1.text-heading-xlarge');
  });

  it('has headline selectors defined', () => {
    expect(LINKEDIN_SELECTORS.headline).toBeInstanceOf(Array);
    expect(LINKEDIN_SELECTORS.headline.length).toBeGreaterThan(0);
  });
});

describe('TWITTER_SELECTORS', () => {
  it('has name selectors defined', () => {
    expect(TWITTER_SELECTORS.name).toBeInstanceOf(Array);
    expect(TWITTER_SELECTORS.name.length).toBeGreaterThan(0);
  });

  it('has bio selectors defined', () => {
    expect(TWITTER_SELECTORS.bio).toBeInstanceOf(Array);
    expect(TWITTER_SELECTORS.bio.length).toBeGreaterThan(0);
  });
});

describe('REDDIT_SELECTORS', () => {
  it('has displayName selectors defined', () => {
    expect(REDDIT_SELECTORS.displayName).toBeInstanceOf(Array);
    expect(REDDIT_SELECTORS.displayName.length).toBeGreaterThan(0);
  });

  it('has bio selectors defined', () => {
    expect(REDDIT_SELECTORS.bio).toBeInstanceOf(Array);
    expect(REDDIT_SELECTORS.bio.length).toBeGreaterThan(0);
  });
});

describe('TIMING', () => {
  it('has BADGE_CHECK_DELAY defined', () => {
    expect(TIMING.BADGE_CHECK_DELAY).toBe(500);
  });

  it('has TOAST_AUTO_DISMISS defined', () => {
    expect(TIMING.TOAST_AUTO_DISMISS).toBe(3000);
  });

  it('has TOAST_FADE_DURATION defined', () => {
    expect(TIMING.TOAST_FADE_DURATION).toBe(300);
  });
});

describe('SUPPORTED_PLATFORMS', () => {
  it('has linkedin with pattern and name', () => {
    expect(SUPPORTED_PLATFORMS.linkedin.name).toBe('LinkedIn');
    expect(SUPPORTED_PLATFORMS.linkedin.pattern).toBeInstanceOf(RegExp);
  });

  it('has twitter with pattern and name', () => {
    expect(SUPPORTED_PLATFORMS.twitter.name).toBe('X (Twitter)');
    expect(SUPPORTED_PLATFORMS.twitter.pattern).toBeInstanceOf(RegExp);
  });

  it('has reddit with pattern and name', () => {
    expect(SUPPORTED_PLATFORMS.reddit.name).toBe('Reddit');
    expect(SUPPORTED_PLATFORMS.reddit.pattern).toBeInstanceOf(RegExp);
  });
});
