# Plan: Person-First Dropdown (v1)

**Branch:** `feat/person-first-dropdown-v1`
**Status:** Complete
**Created:** 2026-02-07
**Completed:** 2026-02-16

## Summary

Redesign the popup dropdown to present a person-first, high-signal, minimal UI that increases user confidence before adding a person to Attio. This is a structural UI change with extended data extraction - no enrichment logic or new API calls.

## Relevant ADRs

- **ADR-004 (TypeScript Test-Driven Architecture):** Strict TypeScript, unit tests with Vitest, debug package for logging. All new code must follow this pattern.
- **ADR-005 (Person-First Popup Design):** Created for this feature - documents the UI redesign and name parsing fix.
- **Product Principles:** Binary state clarity (New vs Existing), page-visible data is free, resolve before write.

## Clarified Scope

Based on user feedback:

| Feature | Decision | Notes |
|---------|----------|-------|
| Avatar | Extract from DOM | Add to content scripts |
| Company | Extract as separate field | Add to content scripts |
| Role/Headline | Use existing `description` | Already extracted |
| Contact Info values | **Backlog** | Requires modal click - separate feature |
| Contact Info presence | Show badge | Use existing detection |
| Settings icon | Omit | Not applicable for free app |
| Credits footer | Omit | Not applicable for free app |

## New Data Model

Extend `ProfileData` type:

```typescript
interface ProfileData {
  fullName: string | null;
  linkedinUrl?: string;
  twitterHandle?: string;
  redditUsername?: string;
  username?: string;
  description?: string | null;  // Role/headline
  profileUrl?: string;
  error?: string;
  // NEW FIELDS
  avatarUrl?: string;          // Profile photo URL
  company?: string;            // Current company name
  location?: string;           // Location text (visible on page)
  connectionDegree?: string;   // "1st", "2nd", "3rd" or null
  hasContactInfo?: boolean;    // Whether Contact Info link is visible
}
```

## UI Layout (Refined)

```
┌──────────────────────────────┐
│ Add to Attio                 │
├──────────────────────────────┤
│ [Avatar]  Name               │  ● New | Existing
│           Role / Headline    │
│           Company            │
├──────────────────────────────┤
│ ▶ Add Person                 │  Primary CTA
├──────────────────────────────┤
│ Data Available               │
│ ──────────────────────────   │
│ 👤 Name                      │
│ 💼 Role                      │
│ 🏢 Company                   │
│ 📍 Location                  │
│ 🔗 LinkedIn                  │
│ 📋 Contact Info (if 1st)    │
├──────────────────────────────┤
│ Attio Mapping                │
│ ──────────────────────────   │
│ Person  → People             │
│ Company → Companies          │
└──────────────────────────────┘
```

## Implementation Steps

### Phase 0: Fix Existing Bugs

0a. **Fix name attribute update bug** in `src/lib/attio-api.ts`
   - Investigate Attio API PATCH requirements for name attribute
   - Split `full_name` into `first_name` and `last_name` for updates
   - Add validation before API call
   - Add unit test for update scenario

0b. **Add update diff display** to popup
   - Track what fields have changed
   - Show "Update X fields" subtext on button
   - Only show update button when there are actual changes

### Phase 1: Extend Data Extraction (Content Scripts)

1. **Update `ProfileData` type** in `src/types/index.ts`
   - Add `avatarUrl`, `company`, `location`, `connectionDegree`, `hasContactInfo`

2. **Add LinkedIn selectors** in `src/constants/index.ts`
   - Avatar: `img.pv-top-card-profile-picture__image--show` or similar
   - Company: Text near headline containing company name
   - Location: Text in profile header area

3. **Update `extractLinkedInProfile()`** in `src/content/linkedin.ts`
   - Extract avatar URL from profile image
   - Extract company from visible text
   - Extract location from profile header
   - Extract connection degree (existing pattern)
   - Detect Contact Info link presence

4. **Add unit tests** for new extraction logic

### Phase 2: Update Popup HTML Structure

5. **Restructure `popup.html`** with new layout
   - Person header section (avatar, name, role, company, status)
   - Primary CTA section (Add Person button)
   - Data preview section (list of available fields)
   - Object mapping section (static display)

### Phase 3: Update Popup CSS

6. **Add new CSS components** in `popup.css`
   - `.person-header` with avatar, info stack
   - `.status-badge` for New/Existing indicator
   - `.data-preview` vertical list with icons
   - `.object-mapping` static label pairs
   - Keep existing button/message styles

### Phase 4: Update Popup Logic

7. **Update `popup.ts`** state management
   - Populate new fields from `CheckPersonResponse.profileData`
   - Handle missing fields gracefully
   - Single CTA logic based on `exists` state

8. **Add unit tests** for popup display logic

### Phase 5: Verification

9. **E2E test** for visual regression
10. **Manual testing** on LinkedIn, Twitter, Reddit profiles

## Bugs to Fix in This Feature

### Bug 1: Update throws "Invalid value was passed to attribute with slug 'name'"

**Symptom:** Clicking "Update Info" for an existing person throws an API error.

**Root cause analysis:**
1. Attio's PATCH endpoint for person records may require specific name format
2. Current `buildValuesObject()` sends `{ name: [{ full_name: "..." }] }`
3. Attio may expect `first_name` and `last_name` to be split for updates
4. Or there's a data validation issue with the extracted name

**Fix approach:**
1. Investigate Attio API docs for PATCH name requirements
2. Split `full_name` into `first_name`/`last_name` before sending
3. Add validation before API call
4. Improve error handling to show what went wrong

### Bug 2: Popup doesn't show what data will be updated

**Symptom:** "Update Info" button exists but there's no indication of what fields will change.

**Fix approach:**
1. Compare existing Attio data with newly extracted data
2. Show diff or list of fields that will be updated
3. Only enable "Update Info" if there are actual changes

## Deferred to Backlog

- Contact Info modal extraction (emails, phones from modal)
- Twitter avatar/company extraction
- Reddit avatar extraction

## Acceptance Criteria

- [x] **Bug fix:** "Update Info" works without throwing name attribute error
- [x] **Bug fix:** Popup shows what fields will be updated before clicking
- [x] Dropdown renders with all sections present
- [x] Avatar displays (or placeholder if unavailable)
- [x] Name, role, company show when available
- [x] Status indicator shows New or Existing correctly
- [x] Data preview shows available fields
- [x] Object mapping displays static values
- [x] Works with static/mock data
- [x] No regressions to existing add behavior
- [x] No runtime errors without optional data
- [x] Unit tests pass (100 tests)
- [x] Build succeeds

## Files to Modify

1. `src/lib/attio-api.ts` - Fix name update bug, improve PATCH handling
2. `src/lib/attio-api.test.ts` - Add tests for update scenarios
3. `src/types/index.ts` - Extend ProfileData with new fields
4. `src/constants/index.ts` - Add new LinkedIn selectors
5. `src/content/linkedin.ts` - Extend extraction
6. `src/content/linkedin.test.ts` - Add tests for new extraction
7. `src/popup/popup.html` - New UI structure
8. `src/popup/popup.css` - New component styles
9. `src/popup/popup.ts` - New display logic with update diff
10. `src/popup/popup.test.ts` - Add tests (may need to create)
