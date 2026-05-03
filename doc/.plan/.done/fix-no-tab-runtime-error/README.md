# Bug: "No tab with id" Runtime Errors

## Summary

Chrome can surface `Unchecked runtime.lastError: No tab with id: <id>` in `chrome://extensions` when tab-scoped extension APIs race tab closure/replacement.

The extension performs tab-scoped operations during navigation and tab activation:

- `chrome.action.setIcon` / `setBadgeText` / `setBadgeBackgroundColor`
- `chrome.tabs.sendMessage`

If the tab disappears between scheduling and execution, Chrome reports a benign error.

## Goal

Prevent noisy error entries in `chrome://extensions` without changing user-facing behavior.

## Fix

- Use callback-style wrappers that explicitly consume `chrome.runtime.lastError`.
- Treat "No tab with id" as a benign race and ignore it.
- Log other errors via `attio:background`.

## Files

- `src/background.ts`
