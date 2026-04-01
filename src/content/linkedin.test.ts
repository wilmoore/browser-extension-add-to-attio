/**
 * Tests for LinkedIn profile extraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractLinkedInProfile } from './linkedin.js';

describe('extractLinkedInProfile', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', { href: 'https://www.linkedin.com/in/john-doe-123' });
  });

  it('extracts name from h1.text-heading-xlarge', () => {
    document.body.innerHTML = '<h1 class="text-heading-xlarge">John Doe</h1>';

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('John Doe');
    expect(result.error).toBeUndefined();
  });

  it('extracts name from pv-text-details panel', () => {
    document.body.innerHTML = `
      <div class="pv-text-details__left-panel">
        <h1>Jane Smith</h1>
      </div>
    `;

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('Jane Smith');
  });

  it('extracts name from h2 inside profile link (2026 SDUI layout)', () => {
    document.body.innerHTML = `
      <a href="https://www.linkedin.com/in/kimmloy/">
        <h2>Kim Loy</h2>
      </a>
    `;

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('Kim Loy');
  });

  it('extracts name from h2 in main section as fallback', () => {
    document.body.innerHTML = `
      <main>
        <h2>Sarah Connor</h2>
      </main>
    `;

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('Sarah Connor');
  });

  it('extracts headline from text-body-medium', () => {
    document.body.innerHTML = `
      <h1 class="text-heading-xlarge">John Doe</h1>
      <div class="text-body-medium break-words">Software Engineer at Acme Corp</div>
    `;

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('John Doe');
    expect(result.description).toBe('Software Engineer at Acme Corp');
  });

  it('formats username as display name when name element not found', () => {
    vi.stubGlobal('location', { href: 'https://www.linkedin.com/in/john-doe-123' });
    document.body.innerHTML = '';

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('John Doe');
    expect(result.username).toBe('john-doe-123');
  });

  it('removes trailing ID numbers from username', () => {
    vi.stubGlobal('location', { href: 'https://www.linkedin.com/in/jane-smith-456' });
    document.body.innerHTML = '';

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('Jane Smith');
  });

  it('extracts LinkedIn URL without query params', () => {
    vi.stubGlobal('location', { href: 'https://www.linkedin.com/in/john-doe?param=value' });
    document.body.innerHTML = '<h1 class="text-heading-xlarge">John Doe</h1>';

    const result = extractLinkedInProfile();

    expect(result.linkedinUrl).toBe('https://www.linkedin.com/in/john-doe');
  });

  it('returns error when neither name nor username can be extracted', () => {
    vi.stubGlobal('location', { href: 'https://www.linkedin.com/' });
    document.body.innerHTML = '';

    const result = extractLinkedInProfile();

    expect(result.error).toBeDefined();
    expect(result.fullName).toBeNull();
  });

  it('skips elements with text containing LinkedIn', () => {
    document.body.innerHTML = `
      <h1>LinkedIn</h1>
      <main>
        <h1>Real Name</h1>
      </main>
    `;

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('Real Name');
  });

  it('skips elements with very short text', () => {
    document.body.innerHTML = `
      <h1>A</h1>
      <main>
        <h1>John Doe</h1>
      </main>
    `;

    const result = extractLinkedInProfile();

    expect(result.fullName).toBe('John Doe');
  });

  it('handles extraction errors gracefully', () => {
    // Force an error by making document.querySelector throw
    const originalQuerySelector = document.querySelector.bind(document);
    vi.spyOn(document, 'querySelector').mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = extractLinkedInProfile();

    expect(result.error).toBe('Failed to extract profile data. Please try again.');

    // Restore original
    vi.spyOn(document, 'querySelector').mockImplementation(originalQuerySelector);
  });
});
