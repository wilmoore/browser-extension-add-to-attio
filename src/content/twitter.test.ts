/**
 * Tests for Twitter/X profile extraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractTwitterProfile } from './twitter.js';

describe('extractTwitterProfile', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', { href: 'https://x.com/johndoe' });
  });

  it('extracts username from URL', () => {
    const result = extractTwitterProfile();

    expect(result.twitterHandle).toBe('johndoe');
    expect(result.profileUrl).toBe('https://x.com/johndoe');
  });

  it('extracts display name from UserName testid', () => {
    document.body.innerHTML = `
      <div data-testid="UserName">
        <span><span>John Doe</span></span>
      </div>
    `;

    const result = extractTwitterProfile();

    expect(result.fullName).toBe('John Doe');
  });

  it('extracts bio from UserDescription testid', () => {
    document.body.innerHTML = `
      <div data-testid="UserDescription">Building things with code</div>
    `;

    const result = extractTwitterProfile();

    expect(result.description).toBe('Building things with code');
  });

  it('falls back to username when display name not found', () => {
    document.body.innerHTML = '';

    const result = extractTwitterProfile();

    expect(result.fullName).toBe('johndoe');
  });

  it('returns error for home page', () => {
    vi.stubGlobal('location', { href: 'https://x.com/home' });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Please navigate to a user profile page.');
  });

  it('returns error for explore page', () => {
    vi.stubGlobal('location', { href: 'https://x.com/explore' });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Please navigate to a user profile page.');
  });

  it('returns error for notifications page', () => {
    vi.stubGlobal('location', { href: 'https://x.com/notifications' });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Please navigate to a user profile page.');
  });

  it('returns error for messages page', () => {
    vi.stubGlobal('location', { href: 'https://x.com/messages' });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Please navigate to a user profile page.');
  });

  it('returns error for settings page', () => {
    vi.stubGlobal('location', { href: 'https://x.com/settings' });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Please navigate to a user profile page.');
  });

  it('returns error for search page', () => {
    vi.stubGlobal('location', { href: 'https://x.com/search' });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Please navigate to a user profile page.');
  });

  it('handles twitter.com URLs', () => {
    vi.stubGlobal('location', { href: 'https://twitter.com/johndoe' });

    const result = extractTwitterProfile();

    expect(result.twitterHandle).toBe('johndoe');
    expect(result.profileUrl).toBe('https://x.com/johndoe');
  });

  it('returns error when URL pattern does not match', () => {
    vi.stubGlobal('location', { href: 'https://example.com/johndoe' });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Could not identify profile. Make sure you are on an X profile page.');
  });

  it('handles extraction errors gracefully', () => {
    const originalQuerySelector = document.querySelector.bind(document);
    vi.spyOn(document, 'querySelector').mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = extractTwitterProfile();

    expect(result.error).toBe('Failed to extract profile data. Please try again.');

    vi.spyOn(document, 'querySelector').mockImplementation(originalQuerySelector);
  });
});
