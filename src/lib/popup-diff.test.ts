import { describe, it, expect } from 'vitest';
import { computeFieldDiffs, extractLinkedInHandle, normalizeTwitterHandle } from './popup-diff.js';
import type { AttioPersonValues, ProfileData } from '../types/index.js';

describe('popup-diff', () => {
  it('extractLinkedInHandle extracts handle from URL', () => {
    expect(extractLinkedInHandle('https://www.linkedin.com/in/kimmloy/')).toBe('kimmloy');
    expect(extractLinkedInHandle('linkedin.com/in/kimmloy')).toBe('kimmloy');
    expect(extractLinkedInHandle('kimmloy')).toBe('kimmloy');
  });

  it('normalizeTwitterHandle strips @', () => {
    expect(normalizeTwitterHandle('@alice')).toBe('alice');
    expect(normalizeTwitterHandle('alice')).toBe('alice');
  });

  it('computeFieldDiffs hides null-to-null and ignores equivalent LinkedIn URL variants', () => {
    const attio: AttioPersonValues = {
      name: 'Kim Loy',
      linkedin: 'https://www.linkedin.com/in/kimmloy',
      twitter: null,
      description: null,
      email: null,
      website: null,
    };

    const source: ProfileData = {
      fullName: 'Kim Loy',
      linkedinUrl: 'https://linkedin.com/in/kimmloy/',
      twitterHandle: undefined,
      description: null,
    };

    const diffs = computeFieldDiffs(attio, source);
    expect(diffs).toEqual([]);
  });

  it('computeFieldDiffs detects differences by normalized value', () => {
    const attio: AttioPersonValues = {
      name: 'Kim Loy',
      linkedin: null,
      twitter: '@kim',
      description: 'Old',
      email: null,
      website: null,
    };

    const source: ProfileData = {
      fullName: 'Kim Loy',
      linkedinUrl: 'https://www.linkedin.com/in/kimmloy/',
      twitterHandle: 'kim',
      description: 'New',
    };

    const diffs = computeFieldDiffs(attio, source);
    expect(diffs.map((d) => d.field).sort()).toEqual(['description', 'linkedin']);
  });

  it('computeFieldDiffs detects new email and website values', () => {
    const attio: AttioPersonValues = {
      name: 'Kim Loy',
      linkedin: 'https://www.linkedin.com/in/kimmloy',
      twitter: null,
      description: null,
      email: null,
      website: null,
    };

    const source: ProfileData = {
      fullName: 'Kim Loy',
      linkedinUrl: 'https://linkedin.com/in/kimmloy/',
      emails: ['kim@example.com'],
      websites: [{ url: 'https://example.com', label: 'Company' }],
    };

    const diffs = computeFieldDiffs(attio, source);
    expect(diffs.map((d) => d.field).sort()).toEqual(['email', 'website']);
    expect(diffs.find(d => d.field === 'email')?.sourceValue).toBe('kim@example.com');
    expect(diffs.find(d => d.field === 'website')?.sourceValue).toBe('https://example.com');
  });

  it('computeFieldDiffs ignores email/website when already in sync', () => {
    const attio: AttioPersonValues = {
      name: 'Kim Loy',
      linkedin: 'https://www.linkedin.com/in/kimmloy',
      twitter: null,
      description: null,
      email: 'kim@example.com',
      website: null,
    };

    const source: ProfileData = {
      fullName: 'Kim Loy',
      linkedinUrl: 'https://linkedin.com/in/kimmloy/',
      emails: ['kim@example.com'],
    };

    const diffs = computeFieldDiffs(attio, source);
    expect(diffs).toEqual([]);
  });
});
