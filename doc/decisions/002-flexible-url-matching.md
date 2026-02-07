# 002. Flexible URL Matching with Contains

Date: 2026-02-06

## Status

Accepted

## Context

When checking if a LinkedIn profile exists in Attio, exact URL matching fails due to format variations:
- Trailing slash: `linkedin.com/in/user/` vs `linkedin.com/in/user`
- WWW prefix: `www.linkedin.com` vs `linkedin.com`
- Protocol: `https://` vs `http://`

The Attio API stores URLs as entered by users or imported from various sources, so the same person might have different URL formats.

## Decision

For LinkedIn URLs, extract the username from the URL and use Attio's `$contains` operator instead of `$eq`:

```javascript
// Extract username: "michaelrbates" from "https://www.linkedin.com/in/michaelrbates/"
const usernameMatch = value.match(/linkedin\.com\/in\/([^/?]+)/);
const username = usernameMatch ? usernameMatch[1] : value;

// Search with contains
{ "linkedin": { "value": { "$contains": username } } }
```

## Consequences

**Positive:**
- Matches regardless of URL format variations
- More reliable duplicate detection
- Reduces false negatives

**Negative:**
- Theoretical risk of false positives if two users have overlapping usernames (extremely unlikely)
- Slightly less strict matching

## Alternatives Considered

1. **Normalize URLs before comparison** - Strip trailing slash, www, etc.
   - Rejected: Requires modifying stored data or complex pre-processing

2. **Multiple queries with URL variations** - Query multiple times with different formats
   - Rejected: Slower, more API calls, still might miss variations

3. **Exact match with $eq** - Original approach
   - Rejected: Failed in practice due to format variations

## Related

- Planning: `.plan/.done/feat-fix-popup-state-display/`
