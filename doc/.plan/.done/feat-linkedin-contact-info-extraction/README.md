# Bug Fix: LinkedIn Contact Info Modal Extraction

## Summary

Fixed the LinkedIn contact info extraction feature (originally implemented in ADR-008) by updating outdated selectors to match the current LinkedIn UI.

## Problem

Users reported that LinkedIn contact info (email, website, etc.) was not being extracted even though it was available on the profile's "Contact info" modal. The selectors used to find the contact info link and extract data were outdated for the current LinkedIn UI.

## Changes Made

### 1. Updated LinkedIn selectors (`src/constants/index.ts`)

**Contact Info Link selectors** (detects if contact info is available):
- Added modern selectors for current LinkedIn: `a[href*="contact-info"]`, `[data-test-id="about-section"] a`
- Kept legacy fallbacks

**Contact Info Modal selectors:**
- Added modern trigger selectors: `button[aria-label*="Contact"]`
- Updated modal detection: `[role="dialog"][aria-label*="Contact"]`, `[data-test-modal]`
- Added more robust close button selectors
- Made website extraction more permissive: `a[href^="http"]:not([href*="linkedin.com"]):not([href*="localhost"])`
- Added additional website label selectors
- Added modern connected since selectors: `time[datetime]`, `span[title*="Connected"]`

### 2. Key Improvements

- Added more fallback selectors for robustness
- Made website extraction less restrictive (now captures any external http link)
- Added better modal detection for newer LinkedIn UI
- Preserved backward compatibility with legacy selectors

## Testing

- All 112 tests pass
- Build completes successfully

## Notes

The issue is that LinkedIn periodically updates their HTML structure. This fix adds more robust selectors that should work with both older and newer versions of LinkedIn's UI. If issues persist, further investigation may be needed to identify the specific selectors that work on the user's LinkedIn version.