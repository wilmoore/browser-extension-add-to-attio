# Bug: No visual indicator for existing contacts until popup opened

## Bug Details

**Steps to Reproduce:**
1. Navigate to a LinkedIn profile that exists in Attio
2. Observe the extension icon in the toolbar
3. Notice the `+` badge shows (same as for new contacts)
4. Click the icon to open popup
5. Only then does it show "Existing" status

**Expected Behavior:**
- Extension icon should visually indicate whether the contact is NEW (capturable) vs EXISTS (already in Attio)
- User should know the contact status BEFORE clicking the icon

**Actual Behavior:**
- Extension icon shows `+` badge for ALL profiles (both new and existing)
- No differentiation until popup is opened
- This defeats the purpose of the badge as a quick status indicator

**Environment:**
- Branch: `fix/existing-contact-badge-indicator`
- Extension version: 1.2.1
- Platform: LinkedIn profile pages

**Severity:** Degraded experience - can still use extension but UX is confusing

## Root Cause Analysis

### ADR-007 Context
ADR-007 decided:
- EXISTS: No badge (empty) - "clean icon, no action needed"
- CAPTURABLE: `+` badge in purple - actionable

The rationale was that absence of badge = "already handled". However, the user experience shows this is insufficient - users want a **positive indicator** that a contact exists, not just the absence of an indicator.

### Current Implementation
In `src/background.ts`, `updateBadge()` sets:
- `BADGE_STATES.EXISTS`: `{ text: '', color: [0,0,0,0] }` - no visible badge
- `BADGE_STATES.CAPTURABLE`: `{ text: '+', color: '#6366f1' }` - purple + badge

The problem: both EXISTS and NONE states look identical (no badge), so users can't distinguish "exists in Attio" from "not a profile page".

### User's Preferred Solution
Instead of badges, use **two different extension icons**:
1. **CAPTURABLE icon**: Current `+` icon (rounded square with plus)
2. **EXISTS icon**: Person silhouette with checkmark

This is cleaner than trying to make badge overlays look good, and provides clear semantic distinction.

## Implementation Plan

### Step 1: Create EXISTS icon assets
Create new icon files for the EXISTS state:
- `public/icons/icon-exists-16.png`
- `public/icons/icon-exists-48.png`
- `public/icons/icon-exists-128.png`
- `public/icons/icon-exists-source.svg`

Design: Person silhouette with small checkmark (conveys "person in Attio")

### Step 2: Update background.ts to swap icons
Use `chrome.action.setIcon()` instead of (or in addition to) badges:
- EXISTS: Use person-with-checkmark icon, no badge
- CAPTURABLE: Use default + icon, no badge needed (icon IS the indicator)
- NONE: Use default + icon, no badge

### Step 3: Simplify badge states
Since icons now convey state, we may be able to remove the badge text entirely:
- CAPTURABLE: Icon is the + symbol
- EXISTS: Icon is person-with-checkmark
- No badge overlay needed for either

### Step 4: Update manifest (if needed)
May need to declare all icon variants in `action.default_icon`.

## Files to Modify

| File | Changes |
|------|---------|
| `public/icons/icon-exists-*.png` | NEW: Create EXISTS state icons |
| `public/icons/icon-exists-source.svg` | NEW: Source SVG for EXISTS icons |
| `src/background.ts` | Add icon swapping logic in `updateBadge()` |
| `src/constants/index.ts` | Add icon path constants |
| `public/manifest.json` | May need icon declarations |

## Implementation Complete

### Final Design (User-Requested)

All icons use a consistent **person silhouette** with different status indicators:

| State | Icon | Description |
|-------|------|-------------|
| CAPTURABLE | Person + purple plus | New contact, can be added to Attio |
| EXISTS | Person + green checkmark | Contact in Attio, up to date |
| EXISTS_WITH_UPDATES | Person + orange dot | Contact in Attio, has available updates |
| NONE | Default + icon | Not a profile page |

### Changes Made

1. **Created 3 new icon sets** (`public/icons/`):
   - `icon-capturable-*.png/svg` - Person silhouette with purple plus badge
   - `icon-exists-*.png/svg` - Person silhouette with green checkmark badge (prominent)
   - `icon-updates-*.png/svg` - Person silhouette with orange dot badge
   - Each in 16px, 48px, 128px PNG + source SVG

2. **Updated constants** (`src/constants/index.ts`):
   - Added `BADGE_STATES.EXISTS_WITH_UPDATES` state
   - Expanded `EXTENSION_ICONS` with all 4 icon sets: DEFAULT, CAPTURABLE, EXISTS, EXISTS_WITH_UPDATES
   - All badge states now have empty text (icons convey state, no text overlay)

3. **Updated background.ts**:
   - Imported `computeFieldDiffs` from `lib/popup-diff.ts`
   - Modified `updateBadge()` to select correct icon for all 4 states
   - Updated `checkAndUpdateBadge()` to compute diffs and use EXISTS_WITH_UPDATES when updates available
   - Updated `buildExistingPersonResponse()` to also compute diffs for correct badge state

### Icon Design (SVG)

All icons share the same person silhouette base:
```svg
<!-- Head -->
<circle cx="64" cy="38" r="20" fill="#111827"/>
<!-- Body -->
<path d="M32 98C32 78 46 68 64 68C82 68 96 78 96 98" stroke="#111827" stroke-width="10" stroke-linecap="round"/>
```

Badge indicators positioned at bottom-right (cx=96, cy=96, r=22):
- **CAPTURABLE**: Purple (#6366f1) circle with white plus
- **EXISTS**: Green (#10b981) circle with white checkmark
- **EXISTS_WITH_UPDATES**: Orange (#f59e0b) solid circle (dot)

### Verification

- ✅ Build passes
- ✅ All 112 tests pass
- ✅ Icons copied to dist folder
- Manual verification needed: Load extension and test on LinkedIn profiles

## Related ADRs

This supersedes ADR-007's badge design decision. ADR-010 will document:
- Moving from badge-based to icon-based state indication
- Addition of EXISTS_WITH_UPDATES state for diff-aware badge
- Rationale: cleaner visual design, semantic icon system
