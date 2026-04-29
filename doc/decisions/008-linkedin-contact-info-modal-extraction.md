# 008. LinkedIn Contact Info Modal Extraction

Date: 2026-04-28

## Status

Accepted

## Context

LinkedIn profiles display a "Contact info" link that opens a modal containing valuable data not visible on the main profile:
- Email address(es)
- Website(s) with labels
- "Connected since" date

This data has corresponding fields in Attio's People object (`email_addresses`) but was not being extracted. Additionally, when viewing existing contacts, the popup showed only "Up to date ✓" without displaying what data the user has.

## Decision

1. **Auto-open modal extraction**: The content script programmatically clicks the "Contact info" link, waits for the modal to appear, extracts data, and closes the modal. This happens automatically when extracting profile data for 1st-degree connections.

2. **Multi-value array storage**: Emails and websites are stored as arrays (`emails: string[]`, `websites: WebsiteEntry[]`) to capture all values, not just the primary.

3. **Contact summary UI**: The "Up to date" state now displays a contact summary section showing:
   - Primary email with "+N more" indicator for multi-value
   - Primary website with "+N more" indicator
   - Location

4. **Graceful degradation**: If the modal fails to open or extraction times out, the profile data is returned without contact info rather than failing entirely.

## Consequences

### Positive
- Captures valuable contact data previously ignored
- Users can see contact details without leaving the popup
- Multi-value support preserves all emails/websites
- Works transparently without user interaction

### Negative
- Modal interaction adds latency to profile extraction (~1-3 seconds)
- DOM selectors may break if LinkedIn changes modal structure
- Only works for 1st-degree connections (contact info unavailable for others)

## Alternatives Considered

1. **Manual button to fetch contact info**: Rejected because it adds friction and most users want this data automatically.

2. **Scrape from background page navigation**: Rejected because it would require navigating away from the current page.

3. **Store only primary email/website**: Rejected because users often have multiple relevant emails and websites.

## Related

- Planning: `.plan/.done/feat-extract-linkedin-contact-info-enhance-ui/`
- ADR-005: Person-first popup design (extended with contact summary)
- ADR-006: Link existing person to Attio (adds more content alongside link)
