# Bug Fix: Name Extraction Returns Username Instead of Display Name

**Branch:** `fix/name-attribute-invalid-value`
**Status:** Complete
**Created:** 2026-04-01
**Completed:** 2026-04-01

## Bug Summary

Adding a new LinkedIn contact fails with "Invalid request: An invalid value was passed to attribute with slug 'name'". The popup shows "Kimmloy" (username from URL) instead of "Kim Loy" (actual display name).

## Reproduction Steps

1. Navigate to linkedin.com/in/kimmloy/
2. Click extension icon
3. Click 'Add Person'
4. Error appears: Invalid value for name attribute

## Root Cause Analysis

### Problem Chain:

1. **DOM Selector Failure**: None of the selectors in `LINKEDIN_SELECTORS.name` match the current LinkedIn DOM structure for this profile
2. **Username Fallback**: Code falls back to formatting the URL username "kimmloy"
3. **Single Word Issue**: Username has no dashes, so it becomes "Kimmloy" (not "Kim Loy")
4. **API Rejection**: Attio rejects the name because:
   - Single-word name parses to `{ first_name: "Kimmloy", last_name: "" }`
   - Attio may require a non-empty last_name OR
   - The format is otherwise invalid

### Evidence:

- Screenshot shows "Kimmloy" in popup instead of "Kim Loy"
- The actual LinkedIn page shows "Kim Loy" with "She/Her" pronouns badge
- This indicates the h1 selector is not matching

### Code Locations:

- `src/content/linkedin.ts:22-33` - Name extraction with selector loop
- `src/content/linkedin.ts:126-134` - Username fallback formatting
- `src/constants/index.ts:43-56` - LINKEDIN_SELECTORS.name array
- `src/lib/attio-api.ts:39-59` - parseName function

## Root Cause (Confirmed)

**LinkedIn changed the profile name element from `h1` to `h2` in their 2026 SDUI layout.**

DOM inspection revealed:
```html
<h2 class="_67568f67 d16ef7a9 _314dc60b ...">Kim Loy</h2>
```

All existing selectors targeted `h1` elements, so none matched, triggering the username fallback which produced "Kimmloy" (single word with no spaces to split into first/last name).

## Fix Applied

Added `h2` selectors to `LINKEDIN_SELECTORS.name` array:
- `'main section h2:first-of-type'` - catches the h2 in the main section
- `'.scaffold-layout__main h2'` - layout variant with h2
- `'h2'` - last resort fallback

## Fix Strategy

### Option A: Fix Selectors (Preferred)
Add/update selectors to match current LinkedIn DOM structure

### Option B: Improve Fallback
Better handle single-word usernames by:
- Treating as first name only with explicit validation
- Or rejecting and showing error to user

### Option C: API Validation
Add validation before API call to prevent invalid name formats

## Files to Modify

1. `src/constants/index.ts` - Update LINKEDIN_SELECTORS.name
2. `src/content/linkedin.ts` - Improve fallback logic
3. `src/lib/attio-api.ts` - Add name validation (if needed)
4. `src/content/linkedin.test.ts` - Add test for this scenario

## Acceptance Criteria

- [x] Name extraction correctly returns "Kim Loy" from DOM
- [x] LinkedIn username displays without trailing slash
- [x] Existing tests continue to pass (102 tests)
- [x] New tests cover h2 selector and anchor pattern
- [x] Build succeeds
- [x] Person successfully added to Attio
