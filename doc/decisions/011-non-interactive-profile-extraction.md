# 011. Non-Interactive Profile Extraction for Badge Checks

Date: 2026-04-30

## Status

Accepted

## Context

LinkedIn contact info extraction (ADR-008) works by programmatically opening the "Contact info" modal, scraping emails/websites/connected-since, and then closing the modal.

Separately, the background service worker periodically requests profile extraction to update the extension icon state (EXISTS/CAPTURABLE/UPDATES). This can happen on tab activation and page load.

When badge checks trigger modal open/close behavior, users can experience UI disruption. In particular, if the LinkedIn "Contact info" modal is already open (or multiple extraction requests overlap), the modal can appear to flash due to competing open/close operations.

## Decision

Introduce an `includeContactInfo?: boolean` option on the `extractProfile` message.

- **Badge checks** set `includeContactInfo: false`.
  - Extraction must be non-interactive and avoid opening/closing modals.
- **Popup and capture flows** set `includeContactInfo: true`.
  - Extraction may open the modal to obtain richer contact info.

Additionally, the LinkedIn content script deduplicates in-flight extraction requests to prevent concurrent modal interactions.

## Consequences

### Positive

- Badge updates no longer disrupt the LinkedIn UI.
- Eliminates a class of intermittent modal flashing caused by competing extraction calls.
- Keeps richer contact extraction available for user-initiated flows.

### Negative

- Adds a small message-contract surface area (`includeContactInfo`) that must be maintained.
- Popup extraction may still be slower when contact info is included.

## Alternatives Considered

- **Always extract contact info**: rejected due to user-facing UI disruption.
- **Separate message type (e.g. `extractProfileBasic`)**: rejected in favor of a single message with an option.
- **Cache contact info in background**: rejected due to complexity and potential staleness.

## Related

- ADR-008: `doc/decisions/008-linkedin-contact-info-modal-extraction.md`
- Planning: `doc/.plan/.done/fix-linkedin-contact-info-missing-fields/`
