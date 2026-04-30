# 009. Content Script Retry with Exponential Backoff

Date: 2026-04-30

## Status

Accepted

## Context

Chrome extension content scripts may not be immediately available when:
- LinkedIn's SPA is still hydrating
- Page navigation is in progress
- Content script injection is delayed by Chrome

The initial 500ms delay before checking content script availability was insufficient for LinkedIn's complex SPA hydration process. Users were seeing "Refresh page to capture this profile" errors that persisted even after multiple page refreshes.

## Decision

Implement a retry mechanism with exponential backoff for content script messaging:

1. **Helper function**: `sendMessageWithRetry<T>(tabId, message, retryDelays)`
2. **Default retry schedule**: [1000ms, 2000ms] after initial failure
3. **Popup auto-retry**: Single retry after 500ms when content script unavailable
4. **Graceful degradation**: After all retries fail, show user-friendly message

## Consequences

### Positive

- More reliable content script communication
- Handles LinkedIn's slow SPA hydration
- Users see fewer "Refresh page" errors
- No user intervention required for timing issues

### Negative

- Slightly longer initial load time in worst case (up to 3.5s total)
- Additional complexity in messaging layer

## Alternatives Considered

### 1. Increase initial delay to 2000ms
Rejected: Would slow down all pages, not just slow-loading ones.

### 2. Content script sends "ready" message
Rejected: Requires more coordination and doesn't help if content script fails to load entirely.

### 3. Inject content script on-demand
Rejected: Chrome extension manifest v3 makes this complex, and the retry pattern is simpler.

## Related

- ADR-007: Semantic Badge Indicator for Existing Contacts
- Planning: `.plan/.done/fix-content-script-not-ready-and-badge-overlay/`
