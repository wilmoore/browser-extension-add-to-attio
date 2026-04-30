# 010. Icon-Based State Indication

Date: 2026-04-30

## Status

Accepted (supersedes ADR-007)

## Context

ADR-007 established a badge-based approach to indicate contact status:
- EXISTS: No badge (clean icon, no action needed)
- CAPTURABLE: `+` badge in purple (actionable)

User feedback revealed issues with this design:
- The absence of a badge for EXISTS made it indistinguishable from NONE (not a profile page)
- Users wanted a **positive indicator** that a contact exists, not just the absence of an indicator
- Users wanted to know if a contact has available updates without opening the popup
- Badge text overlays on small icons can appear cluttered

## Decision

Replace badge-based indication with a **semantic icon system** using 4 distinct icons:

| State | Icon | Description |
|-------|------|-------------|
| CAPTURABLE | Person + purple plus | New contact, can be added to Attio |
| EXISTS | Person + green checkmark | Contact in Attio, fully up to date |
| EXISTS_WITH_UPDATES | Person + orange dot | Contact in Attio, has available updates |
| NONE | Default + icon | Not a profile page |

**Design principles:**
- All icons share a consistent **person silhouette** base design
- Status indicators positioned as badges in bottom-right corner
- Colors follow semantic conventions: green = good, orange = attention, purple = action
- Icons designed at 128px source, scaled to 16/48/128px PNGs for Chrome extension

**Implementation details:**
- Added `BADGE_STATES.EXISTS_WITH_UPDATES` state
- `EXTENSION_ICONS` object maps states to icon paths
- `checkAndUpdateBadge()` computes diffs using `computeFieldDiffs()` to detect updates
- Badge text/color cleared (icons convey all state information)

## Consequences

- **Positive**: Clear visual distinction between all 4 states at a glance
- **Positive**: Consistent person silhouette reinforces "contact" semantic meaning
- **Positive**: EXISTS_WITH_UPDATES provides proactive update awareness
- **Positive**: Eliminates badge text rendering issues at small sizes
- **Positive**: More accessible design with distinct shapes (plus, checkmark, dot)
- **Negative**: Requires 12 additional icon files (3 sizes × 4 states, minus default)
- **Negative**: Slightly more complex icon management logic

## Alternatives Considered

- **Keep badge-only approach**: Simpler but lacks positive EXISTS indicator
- **Use checkmark badge for EXISTS, + badge for CAPTURABLE**: Requires badge overlay rendering which can look cluttered
- **Single icon with colored dot badges**: Dots alone don't convey semantic meaning (plus vs checkmark)
- **Text badges for all states**: Text is hard to read at 16px icon size

## Related

- Planning: `.plan/.done/fix-existing-contact-badge-indicator/`
- Supersedes: ADR-007 (semantic-badge-indicator-for-existing-contacts)
- Issue: Users reported "ugly" badge and lack of positive EXISTS indicator
