# Development Guide

This guide documents the practical realities of Chrome extension development, including when different types of reloads are required.

## The Reload Reality

Chrome extensions have multiple components with different reload requirements. **Hot reload rarely works as advertised.** Know when each type of reload is needed to avoid debugging phantom issues.

### Quick Reference

| What Changed | What To Do |
|--------------|------------|
| Content script CSS | Refresh the page |
| Content script JS (minor) | Refresh the page (sometimes works) |
| Content script JS (imports, structure) | Reload extension → Refresh page |
| Popup HTML/CSS/JS | Close and reopen popup |
| Background service worker | Reload extension |
| manifest.json (any change) | Reload extension |
| Permissions in manifest | Remove and re-add extension |
| New files added | Reload extension |
| "Extension context invalidated" | Reload extension → Refresh page |
| Nothing makes sense anymore | Remove and re-add extension |

---

## Reload Types Explained

### 1. Page Refresh (Cmd+R / F5)

**When it works:**
- CSS-only changes to content scripts
- Sometimes minor JS changes to content scripts

**When it doesn't work:**
- Changes to imports or module structure
- Changes to code that runs at `document_idle` / `document_start`
- Any background worker changes

**How to do it:**
- Refresh the target page (LinkedIn, X, Reddit, etc.)

---

### 2. Extension Reload

**When required:**
- Background service worker changes (always)
- manifest.json changes (always)
- New files added to the project
- Content script structural changes
- After build errors that may have corrupted dist/

**When it's not enough:**
- After changing permissions in manifest
- When extension state is corrupted
- Persistent "Extension context invalidated" errors

**How to do it:**
1. Go to `chrome://extensions`
2. Find your extension
3. Click the reload icon (↻)
4. Then refresh any open target pages

**Shortcut:** Bookmark `chrome://extensions` or use an extension reloader extension.

---

### 3. Remove and Re-add Extension (Nuclear Option)

**When required:**
- Changed `permissions` or `host_permissions` in manifest
- Service worker refuses to register
- IndexedDB or storage seems corrupted
- "Extension context invalidated" errors won't go away
- Extension popup shows old content despite reloads
- You've tried everything else and it still doesn't work

**How to do it:**
1. Go to `chrome://extensions`
2. Click "Remove" on your extension
3. Click "Load unpacked"
4. Select the `dist/` folder
5. Refresh all target pages

**Note:** This resets extension storage (localStorage, chrome.storage). If you have API keys or settings stored, you'll need to re-enter them.

---

## Common Gotchas

### "Extension context invalidated"

This error means the content script is trying to communicate with a background worker that no longer exists (because you reloaded the extension).

**Fix:** Reload extension → Refresh the page

### Content script runs but nothing happens

The content script may have injected before your latest code. Old event listeners from the previous version are still attached.

**Fix:** Reload extension → Refresh the page

### Popup shows stale content

Chrome aggressively caches popup HTML/JS.

**Fix:**
1. Close the popup
2. Reload extension
3. Reopen popup

If that doesn't work: Remove and re-add extension

### Background worker changes don't take effect

Service workers have their own lifecycle. Chrome doesn't always pick up changes.

**Fix:** Reload extension. If that fails: Remove and re-add extension

### "Service worker registration failed"

Usually means syntax error or import error in background.js.

**Fix:**
1. Check the console in `chrome://extensions` → "Service worker" link
2. Fix the error
3. Rebuild: `npm run build`
4. Reload extension

### manifest.json changes ignored

Manifest is only read when extension loads.

**Fix:** Reload extension (always required for manifest changes)

---

## Recommended Workflow

For the most reliable development experience:

```
1. Make code changes
2. npm run build
3. Reload extension (chrome://extensions → ↻)
4. Refresh target page
5. Test
```

Yes, this is slower than "hot reload." But it's predictable. You'll never wonder "is this a real bug or a stale cache?"

### When to Use Dev Server

`npm run dev` can help when:
- Iterating rapidly on popup UI
- Making CSS-only changes

But expect to fall back to full reload often.

---

## Debugging Tips

### View background worker console

1. Go to `chrome://extensions`
2. Find your extension
3. Click "Service worker" link
4. Console opens for background script

### View content script console

1. Open target page (e.g., LinkedIn profile)
2. Open DevTools (Cmd+Option+I)
3. Console shows content script logs
4. Look for `[Extension]` prefix or your log messages

### Check if content script injected

In the target page console:
```javascript
// If your content script sets a global or data attribute, check for it
document.querySelector('[data-attio-extension]')
```

### Force service worker update

In `chrome://extensions`, click the "Update" button (if visible) or reload the extension.

---

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build to dist/ |
| `npm run dev` | Dev server with hot reload (limited usefulness) |
| `make clean` | Remove dist/ and dist.zip |

---

## Mental Model

Think of Chrome extension development like this:

- **Content scripts** = injected guests on someone else's page
- **Background worker** = a separate process that can die/restart
- **Popup** = a mini web page that opens/closes frequently
- **manifest.json** = read once at extension load time

Each component has its own lifecycle. Changes to one don't automatically propagate to others. When in doubt, reload the extension.
