import type { AttioPersonValues, PersonFieldKey, ProfileData } from '../types/index.js';

export interface FieldDiff {
  field: PersonFieldKey;
  attioValue: string | null;
  sourceValue: string | null;
  // User-facing label is handled by i18n/callsite.
}

function toNullIfEmpty(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function extractLinkedInHandle(value: string | null | undefined): string | null {
  const v = toNullIfEmpty(value);
  if (!v) return null;

  // Accept either full URL or already-a-handle.
  const match = v.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1] : v;
}

export function normalizeTwitterHandle(value: string | null | undefined): string | null {
  const v = toNullIfEmpty(value);
  if (!v) return null;
  return v.startsWith('@') ? v.slice(1) : v;
}

function normalizedForField(field: PersonFieldKey, value: string | null): string | null {
  if (value == null) return null;

  switch (field) {
    case 'linkedin':
      return extractLinkedInHandle(value);
    case 'twitter':
      return normalizeTwitterHandle(value);
    case 'name':
    case 'description':
      return toNullIfEmpty(value);
    default:
      return toNullIfEmpty(value);
  }
}

function valuesDiffer(field: PersonFieldKey, attioValue: string | null, sourceValue: string | null): boolean {
  const a = normalizedForField(field, attioValue);
  const b = normalizedForField(field, sourceValue);
  return a !== b;
}

export function computeFieldDiffs(attio: AttioPersonValues, source: ProfileData): FieldDiff[] {
  // Get primary email and website from source arrays
  const primaryEmail = source.emails?.[0] ?? null;
  const primaryWebsite = source.websites?.[0]?.url ?? null;

  const sourceValues: Record<PersonFieldKey, string | null> = {
    name: source.fullName ?? null,
    linkedin: source.linkedinUrl ?? null,
    twitter: source.twitterHandle ?? null,
    description: source.description ?? null,
    email: primaryEmail,
    website: primaryWebsite,
  };

  const diffs: FieldDiff[] = [];
  const fields: PersonFieldKey[] = ['linkedin', 'twitter', 'description', 'name', 'email', 'website'];

  for (const field of fields) {
    const attioValue = attio[field];
    const sourceValue = sourceValues[field];

    // Hide null-to-null.
    if (attioValue == null && sourceValue == null) continue;

    if (valuesDiffer(field, attioValue, sourceValue)) {
      diffs.push({ field, attioValue, sourceValue });
    }
  }

  return diffs;
}
