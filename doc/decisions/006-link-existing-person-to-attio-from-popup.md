# 006. Link Existing Person to Attio from Popup

Date: 2026-04-01

## Status

Accepted

## Context

When a captured profile already exists in Attio, the popup indicates an "Existing" state.
Users need a fast way to open the Attio record they are looking at.

The popup can only link to Attio if the background can construct an Attio record URL, which requires a workspace identifier from Attio's `/self` endpoint.

## Decision

When the person exists and an `attioUrl` is available, render the person's name in the popup header as a hyperlink to the Attio record (with a small external-link indicator).

To make the link more reliable, parse the workspace slug from Attio's `/self` response in a tolerant way (supporting multiple response shapes).

## Consequences

- Positive: Existing records are one click away, without adding a separate "View" button.
- Positive: `attioUrl` becomes available in more environments where `/self` returns a different shape.
- Negative: If `attioUrl` is still unavailable, the name renders as plain text (no link).

## Alternatives Considered

- Keep a dedicated "View in Attio" button: clearer but adds visual weight and duplicates the primary header affordance.
- Always link the name somewhere: misleading if the record URL is unknown.
- Store a workspace slug in extension storage: adds persistence concerns and invalidation complexity.

## Related

- Planning: `.plan/.done/fix-name-attribute-invalid-value/`
