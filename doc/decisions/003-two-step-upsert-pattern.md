# 003. Two-Step Upsert Pattern for Person Records

Date: 2026-02-06

## Status

Accepted

## Context

When attempting to create or update person records in Attio, we were using the `PUT /v2/objects/people/records?matching_attribute=linkedin` endpoint. This endpoint uses the `matching_attribute` parameter to deduplicate records.

However, this approach fails with the error:
> "Invalid request: The matching attribute specified is not a unique attribute"

This occurs because:

1. The `matching_attribute` parameter **requires** the attribute to be unique
2. For the People standard object, only `email_addresses` is a unique attribute by default
3. Attio does NOT allow adding or editing unique attributes for the People standard object
4. Attributes like `linkedin`, `twitter`, and `name` are NOT unique

From Attio's documentation:
> "It is not possible to add or edit unique attributes for lists or People or Companies standard objects."

## Decision

Implement a query-then-create/update pattern:

1. **Query first**: Use `findPersonByAttribute()` to search for existing records using `$contains` (for flexible URL matching)
2. **If found**: Use `PATCH /v2/objects/people/records/{record_id}` to update
3. **If not found**: Use `POST /v2/objects/people/records` to create (no matching_attribute)

```javascript
export async function upsertPerson(apiKey, personData, matchingAttribute, platform) {
  const searchValue = getSearchValue(platform, personData);

  // Step 1: Query for existing record
  const existingPerson = await findPersonByAttribute(apiKey, matchingAttribute, searchValue);

  // Step 2: Create or update based on result
  if (existingPerson) {
    return await updatePerson(apiKey, existingPerson.id.record_id, personData);
  } else {
    return await createPerson(apiKey, personData);
  }
}
```

## Consequences

**Positive:**
- Works with non-unique attributes like `linkedin` and `twitter`
- More explicit control over create vs update logic
- Better debugging visibility with separate API calls
- Leverages existing `findPersonByAttribute()` with flexible URL matching

**Negative:**
- Two API calls instead of one for updates (query + patch)
- Slightly higher latency for update operations
- Theoretical race condition if the same person is being updated simultaneously

## Alternatives Considered

1. **Use `email_addresses` as matching attribute** - Only unique attribute available
   - Rejected: We don't always have email addresses from LinkedIn profiles

2. **Create a custom object** - Could define our own unique attributes
   - Rejected: Adds complexity, loses integration with People standard object

3. **Request Attio API enhancement** - Ask for non-unique matching support
   - Deferred: Not under our control, uncertain timeline

## Related

- ADR 002: Flexible URL Matching with Contains
- Attio API docs: https://developers.attio.com/reference
