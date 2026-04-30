# Feature: LOADING Icon State

## Summary

Added a LOADING state icon that shows a person silhouette without any status indicator while the extension is checking if a person exists in Attio. This replaces the previous behavior where the default plus icon was shown during loading.

## Changes Made

### 1. New Icon
- Created `public/icons/icon-loading-source.svg` - a person silhouette without any badge indicator

### 2. Constants (`src/constants/index.ts`)
- Added `LOADING` to `BADGE_STATES`
- Added `LOADING` to `EXTENSION_ICONS` with SVG paths for all sizes

### 3. Background Script (`src/background.ts`)
- Updated `updateBadge()` to handle LOADING state
- Updated `chrome.tabs.onUpdated` listener to set LOADING icon immediately when page completes loading
- Updated `chrome.tabs.onActivated` listener to set LOADING icon immediately when switching to a tab

## Behavior Change

**Before:**
- When navigating to a profile page, the old plus icon (DEFAULT) was shown during the 500ms delay before the check completed
- This made it appear as if it was a non-profile page briefly

**After:**
- When navigating to a profile page, a person silhouette without any indicator is shown immediately
- This makes it clear the extension is working and just determining the state
- After the check completes, the appropriate state icon is shown (EXISTS, EXISTS_WITH_UPDATES, or CAPTURABLE)

## Testing

- All 112 tests pass
- Build completes successfully