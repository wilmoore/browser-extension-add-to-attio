# 005. Person-First Popup Design

Date: 2026-04-01

## Status

Accepted

## Context

The original popup UI showed a simple "Add to Attio" button without displaying any profile information to the user. Users had no confidence about what data would be captured or whether the person already existed in their Attio workspace. Additionally, the "Update Info" action would fail with an API error because the name attribute was being sent incorrectly.

## Decision

We redesigned the popup to present a "person-first" UI that:

1. **Shows profile data before action** - Displays avatar, name, role, company, and available data fields so users know exactly what will be added/updated
2. **Binary state clarity** - Clear "New" vs "Existing" status badge eliminates confusion
3. **Update field count** - "Update X fields" button text shows exactly how many fields will change
4. **Extended data extraction** - Added LinkedIn-specific extraction for avatarUrl, company, location, connectionDegree, hasContactInfo
5. **Fixed name parsing** - Split `full_name` into `first_name` and `last_name` per Attio API requirements for personal-name attributes

## Consequences

**Positive:**
- Users have complete visibility before taking action
- Clear distinction between adding new vs updating existing records
- API errors eliminated through proper name attribute formatting
- More data captured from LinkedIn profiles (avatar, company, location)

**Negative:**
- Increased popup complexity (more DOM elements, more CSS)
- Profile extraction may need platform-specific maintenance as LinkedIn changes their DOM

## Alternatives Considered

1. **Keep simple button, add tooltip** - Rejected: doesn't solve the confidence problem
2. **Modal confirmation dialog** - Rejected: adds friction without adding value
3. **Separate "Preview" screen** - Rejected: unnecessary extra step

## Related

- Planning: `.plan/.done/feat-person-first-dropdown-v1/`
- Attio personal-name attribute docs: https://docs.attio.com/docs/attribute-types/attribute-types-personal-name
