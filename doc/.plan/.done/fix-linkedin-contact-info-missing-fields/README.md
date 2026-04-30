# Bug: LinkedIn Contact Info Missing Fields + Modal Flashing

## Summary

Two user-visible issues on LinkedIn profiles:

1. The popup sometimes shows `No website` / missing `Connected since` even though those values are present in LinkedIn's **Contact info** modal.
2. If the **Contact info** modal is already open and the user clicks the extension icon, the modal can intermittently flash (open/close loop).

## Steps To Reproduce (Intermittent)

1. Open a LinkedIn profile (1st-degree connection).
2. Open the LinkedIn **Contact info** modal.
3. Click the Add to Attio extension icon.
4. Observe: sometimes the modal begins flashing (opening/closing repeatedly).

## Expected

- Extension should not cause modal flashing.
- When contact info is available, capture all emails, all websites, and `Connected since`.

## Actual

- Modal can flash intermittently.
- Website and connected-since can be missing in extracted data despite being visible in the modal.

## Root Cause (Hypothesis)

- Badge checks call `{ action: 'extractProfile' }` which may auto-open/close the LinkedIn modal.
- Concurrent `extractProfile` requests (badge + popup) can race and repeatedly toggle the modal.
- Websites are often exposed as LinkedIn redirect links (`linkedin.com/redir/redirect?...url=...`), which were being filtered out.

## Fix Strategy

- Add `includeContactInfo?: boolean` to `extractProfile` messages.
- Badge checks set `includeContactInfo: false` to keep extraction non-interactive.
- Popup/capture flows set `includeContactInfo: true` to extract from contact info.
- Add in-flight guards in the LinkedIn content script to prevent concurrent modal toggling.
- If the modal is already open, extract without clicking and do not close it.
- Decode LinkedIn redirect URLs to capture websites reliably.
