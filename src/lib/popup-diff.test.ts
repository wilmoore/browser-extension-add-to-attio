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
});
