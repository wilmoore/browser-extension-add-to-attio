# Refactor: Add to Attio Sheet Diff-Based UI + Badge UX Fix

**Completed:** 2026-04-16  
**Branch:** `refactor/add-to-attio-sheet-diff-based-ui`  
**Version Bump:** 1.1.1 → 1.1.2 (patch)

## Summary

This branch combines two complementary improvements to the Add to Attio extension:

### 1. Diff-Based UI Refactor

**Objective:** Refactor the "Add to Attio" popup sheet to use field-level diffing instead of bulk actions.

**Changes:**
- Implemented three UI states: New, Existing+Diff, Existing+Clean
- Added field-level diffing logic (`computeFieldDiffs`) with per-field Update/Skip buttons
- Created background message handler (`updatePersonField`) for PATCH operations on individual fields
- Moved all user-facing copy to centralized `src/i18n/translations.ts`
- Replaced timing magic numbers with `TIMING` constants
- Added graceful degradation when content script unavailable

**Key Files:**
- `src/popup/popup.ts` — UI state management and diff rendering
- `src/lib/popup-diff.ts` — Field-level diff computation
- `src/lib/popup-diff.test.ts` — Diff logic tests (4 tests passing)
- `src/background.ts` — Per-field update handler
- `src/i18n/translations.ts` — Centralized i18n

**ADR:** [005. Person-First Popup Design](../../doc/decisions/005-person-first-popup-design.md)

### 2. Badge UX Improvements

**Objective:** Fix the "ugly" badge indicator for existing contacts and improve semantic design.

**Changes:**
- Changed EXISTS badge from green dot to **transparent** (no badge) — cleaner icon when person already in Attio
- Changed CAPTURABLE badge from orange dot to **`+` indicator in purple (#6366f1)** — actionable and clear
- Updated all badge state tests
- Fixed TypeScript error in `buildExistingPersonResponse`

**Semantic Benefits:**
- Badge only shows when user can take action (CAPTURABLE = +)
- Existing contacts don't clutter the icon
- Text indicator is more readable at small sizes than colored dots

**Related Files:**
- `src/constants/index.ts` — Badge state definitions
- `src/constants/index.test.ts` — Badge state tests (3 tests passing)
- `src/background.ts` — Badge update logic

**ADR:** [007. Semantic Badge Indicator for Existing Contacts](../../doc/decisions/007-semantic-badge-indicator-for-existing-contacts.md)

## Test Results

All 108 tests passing:
- ✓ popup-diff tests (4)
- ✓ constants tests (26)
- ✓ storage tests (12)
- ✓ attio-api tests (31)
- ✓ twitter content script tests (13)
- ✓ reddit content script tests (10)
- ✓ linkedin content script tests (12)

Build succeeds with no TypeScript errors.

## Related Planning Documents

- `doc/.plan/.done/refactor-add-to-attio-sheet-diff-based-ui/PLAN.md` — Original refactor plan
- `doc/.plan/.done/fix-existing-contact-badge-ux/PLAN.md` — Badge fix analysis
- `doc/.plan/.done/fix-existing-contact-badge-ux/errors.json` — Error tracking

## Version Bump Justification

**1.1.1 → 1.1.2 (patch)**

Rationale:
- Primarily a UX fix (badge improvements) — patch-level change
- Refactor includes both feature improvements (diff UI) and bug fixes (graceful degradation)
- No breaking changes to API or data structures
- Backward compatible

## Known Limitations & Future Work

1. **Phase 3 Deferred:** Graceful degradation in popup when content script fails
   - Current implementation shows "Refresh to see profile" message
   - Future work: Could show cached Attio data even without content script
   
2. **Badge icon edge case:** Very small icon sizes may render + indicator less clearly
   - Consider alternative indicators (e.g., outline vs. filled) if feedback warrants

3. **Diff UI polish:** Update button disabled state could show loading spinner
   - Current implementation disables buttons and shows success inline
   - Consider adding visual progress indicator

## Next Steps

After PR merge:
1. Create git tag `v1.1.2` with release notes
2. Build and test extension locally in Chrome
3. Monitor for user feedback on badge UX changes
4. Consider A/B testing the new badge design if metrics available
