/**
 * Tests for Reddit profile extraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractRedditProfile } from './reddit.js';

describe('extractRedditProfile', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', { href: 'https://www.reddit.com/user/johndoe' });
  });

  it('extracts username from URL', () => {
    const result = extractRedditProfile();

    expect(result.redditUsername).toBe('johndoe');
    expect(result.profileUrl).toBe('https://www.reddit.com/user/johndoe');
  });

  it('extracts display name from profile header testid', () => {
    document.body.innerHTML = `
      <div data-testid="profile-header-display-name">John Doe</div>
    `;

    const result = extractRedditProfile();

    expect(result.fullName).toBe('John Doe');
  });

  it('extracts bio from profile header about testid', () => {
    document.body.innerHTML = `
      <div data-testid="profile-header-about">I love programming</div>
    `;

    const result = extractRedditProfile();

    expect(result.description).toBe('I love programming');
  });

  it('falls back to u/username format when display name not found', () => {
    document.body.innerHTML = '';

    const result = extractRedditProfile();

    expect(result.fullName).toBe('u/johndoe');
  });

  it('returns error for /user/me page', () => {
    vi.stubGlobal('location', { href: 'https://www.reddit.com/user/me' });

    const result = extractRedditProfile();

    expect(result.error).toBe('Please navigate to a specific user profile page.');
  });

  it('returns error when URL pattern does not match', () => {
    vi.stubGlobal('location', { href: 'https://www.reddit.com/r/programming' });

    const result = extractRedditProfile();

    expect(result.error).toBe('Could not identify user. Make sure you are on a Reddit user profile page.');
  });

  it('extracts from h1 as fallback for display name', () => {
    document.body.innerHTML = `
      <h1>Reddit User Display Name</h1>
    `;

    const result = extractRedditProfile();

    expect(result.fullName).toBe('Reddit User Display Name');
  });

  it('extracts bio from Profile__description class as fallback', () => {
    document.body.innerHTML = `
      <div class="Profile__description">My cool bio</div>
    `;

    const result = extractRedditProfile();

    expect(result.description).toBe('My cool bio');
  });

  it('handles URL without www', () => {
    vi.stubGlobal('location', { href: 'https://reddit.com/user/janedoe' });

    const result = extractRedditProfile();

    expect(result.redditUsername).toBe('janedoe');
    expect(result.profileUrl).toBe('https://www.reddit.com/user/janedoe');
  });

  it('handles extraction errors gracefully', () => {
    const originalQuerySelector = document.querySelector.bind(document);
    vi.spyOn(document, 'querySelector').mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = extractRedditProfile();

    expect(result.error).toBe('Failed to extract profile data. Please try again.');

    vi.spyOn(document, 'querySelector').mockImplementation(originalQuerySelector);
  });
});
