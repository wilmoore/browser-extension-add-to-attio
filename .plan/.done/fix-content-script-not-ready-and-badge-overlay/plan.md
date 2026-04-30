# Fix: Content Script Not Ready & Badge Overlay

## Problem Statement

Two issues reported by user:

1. **Badge overlay shows bullet dot** - Should show `+` for capturable profiles per ADR-007
2. **"Refresh page to capture this profile" persists** - Content script not detected after multiple refreshes

## Root Cause Analysis

### Issue 1: Badge Appearance
In `src/background.ts:99`, `updateBadge()` hardcoded a bullet point for ALL states:
```typescript
text: state === BADGE_STATES.NONE ? '' : '\u2022', // bullet point (BUG!)
```
This ignored `state.text` which should be `'+'` for CAPTURABLE.

### Issue 2: Content Script Not Ready
- 500ms delay insufficient for LinkedIn's SPA hydration
- No retry mechanism when `chrome.tabs.sendMessage` fails
- Returns "Refresh page" error without auto-recovery

## Solution

### Fix 1: Use `state.text` in `updateBadge()`
Changed from hardcoded bullet to using the state's text property.

### Fix 2: Add Retry Mechanism
- Added `sendMessageWithRetry()` helper with exponential backoff
- Retry delays: 1000ms, 2000ms after initial failure
- Popup auto-retries once after 500ms when content script unavailable

## Files Modified

| File | Changes |
|------|---------|
| `src/background.ts` | Fixed `updateBadge()`, added `sendMessageWithRetry()` |
| `src/constants/index.ts` | Added `BADGE_RETRY_DELAYS`, `POPUP_RETRY_DELAY` |
| `src/popup/popup.ts` | Added auto-retry on popup open |

## Verification

- Build passes
- All 110 tests pass
- Badge shows `+` for capturable profiles
- No badge for existing contacts
- Popup loads without "Refresh page" message after retries
