# 007. Semantic Badge Indicator for Existing Contacts

Date: 2026-04-16

## Status

Accepted

## Context

The extension icon displays a badge to indicate state:
- **EXISTS**: Person is already in Attio (person should be linked/viewable)
- **CAPTURABLE**: Person can be added to Attio (actionable)
- **NONE**: Not a supported profile or not authenticated

The original badge design used colored dots:
- EXISTS: Green dot (#10b981)
- CAPTURABLE: Orange dot (#f59e0b)

This design had UX issues:
- The orange dot appeared "ugly" and harsh to users
- The green dot added visual clutter when viewing existing contacts (no action needed)
- A colored dot provides poor semantic meaning at small icon sizes
- The design didn't distinguish between "no action needed" and "action available"

## Decision

Adopt a **semantic badge design** based on action intent:

1. **EXISTS**: No badge (transparent) — person already in Attio, no action needed; keep icon clean
2. **CAPTURABLE**: Show `+` text indicator in purple (#6366f1) — "add this profile", actionable and clear
3. **NONE**: No badge (transparent) — default state

**Rationale for choices:**
- The `+` indicator visually matches the extension's icon design (plus symbol in rounded square)
- Purple (#6366f1) aligns with Attio's brand while being distinct
- Removing the EXISTS badge eliminates visual noise and follows modern design patterns
- Text indicator (`+`) is more readable than a colored dot at small sizes

## Consequences

- **Positive**: Cleaner icon appearance when viewing existing contacts (no badge)
- **Positive**: Clear, actionable indicator (+ in purple) only when user can capture a profile
- **Positive**: Semantic design reduces cognitive load — badge = action available
- **Positive**: Text indicator is more accessible at small sizes than a colored dot
- **Negative**: Users cannot visually confirm "exists in Attio" from badge alone (must open popup)
- **Negative**: Slightly higher implementation complexity (handling text vs. color differently)

## Alternatives Considered

- **Keep colored dots with better colors**: Simpler but still adds clutter to EXISTS state
- **Use checkmark for EXISTS, + for CAPTURABLE**: More explicit but adds complexity and requires two badge types
- **Badge for all states**: Original approach, but semantic information is unclear
- **Remove badge entirely**: Too minimal; loses the actionable signal for CAPTURABLE

## Related

- Planning: `doc/.plan/.done/fix-existing-contact-badge-ux/`
- Commit: `9a119d4` (fix: improve badge UX for existing contacts)
- Issue: Addresses UX feedback on badge appearance for existing contacts
