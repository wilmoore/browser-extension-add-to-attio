# Bug Fix: CSS Path Resolution in Manifest

## Bug Details

**Error Message:**
```
Could not load css 'src/content/feedback.css' for script.
Could not load manifest.
```

**Steps to Reproduce:**
1. `npm run build`
2. Go to `chrome://extensions`
3. Click "Load unpacked"
4. Select the `dist/` folder

**Expected:** Extension loads successfully
**Actual:** Extension fails to load with CSS path error

**Severity:** Blocks work (extension won't load)

## Root Cause

CRXJS/Vite processes JS files in `content_scripts` but does NOT automatically bundle CSS files referenced in the manifest. The manifest referenced `src/content/feedback.css` which:

1. Is not processed by Vite (only JS is bundled)
2. Is not in `public/` directory (so not copied as static asset)
3. Results in the path existing in manifest but file not existing in `dist/`

The built `dist/manifest.json` had:
```json
"css": ["src/content/feedback.css"]
```

But `dist/src/content/feedback.css` did not exist.

## Fix

Moved CSS to `public/styles/feedback.css` so it's treated as a static asset:

1. Copied `src/content/feedback.css` → `public/styles/feedback.css`
2. Updated `public/manifest.json` to reference `styles/feedback.css`

Files in `public/` are copied to `dist/` as-is, so the path now resolves correctly.

## Files Changed

- `public/manifest.json` - Updated CSS paths from `src/content/feedback.css` to `styles/feedback.css`
- `public/styles/feedback.css` - New file (copy of original)

## Note

The original `src/content/feedback.css` remains in place. It could be removed, but keeping it maintains compatibility if someone wants to revert to the non-Vite build process.

## Verification

After fix:
- `npm run build` succeeds
- `dist/styles/feedback.css` exists
- `dist/manifest.json` references `styles/feedback.css`
- Extension loads in Chrome without errors
