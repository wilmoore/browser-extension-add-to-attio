# 001. Use Attio Attribute Slugs for API Queries

Date: 2026-02-06

## Status

Accepted

## Context

When querying the Attio API to find existing person records, we need to specify which attribute to filter by. Initially, we assumed the attribute name would be `linkedin_url` based on common naming conventions.

However, the Attio API returned "Unknown attribute slug: linkedin_url" errors because each Attio workspace has its own attribute slugs that may differ from expected names.

## Decision

Use the actual Attio attribute slugs as shown in the workspace settings:
- LinkedIn URL attribute: `linkedin` (not `linkedin_url`)
- Twitter attribute: `twitter`
- Name attribute: `name`

These slugs are visible in Attio under Settings > Objects > People > Attributes.

## Consequences

**Positive:**
- API queries work correctly
- Extension properly detects existing contacts

**Negative:**
- Extension may not work if a user's workspace has different attribute slugs
- Future enhancement may need to allow users to configure attribute mappings

## Alternatives Considered

1. **Dynamic attribute discovery** - Query Attio for available attributes and match by name
   - Rejected: Adds complexity and additional API calls

2. **User-configurable mappings** - Let users specify their attribute slugs
   - Deferred: Good enhancement for future if needed

## Related

- Planning: `.plan/.done/feat-fix-popup-state-display/`
