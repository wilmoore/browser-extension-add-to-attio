# Bug Fix: "The matching attribute specified is not a unique attribute"

## Problem

When clicking "Add to Attio" on a LinkedIn profile, the extension failed with error:
> "Invalid request: The matching attribute specified is not a unique attribute"

## Root Cause

The extension used Attio's `PUT /v2/objects/people/records?matching_attribute=linkedin` endpoint. However, the `matching_attribute` parameter requires the attribute to be unique, and `linkedin` is NOT a unique attribute for Attio's People standard object.

From Attio's documentation:
> "It is not possible to add or edit unique attributes for lists or People or Companies standard objects."

## Solution

Implemented a query-then-create/update pattern:
1. Query for existing record using `findPersonByAttribute()` (uses `$contains` for flexible URL matching)
2. If found: PATCH the existing record
3. If not found: POST a new record

## Changes

- `src/lib/attio-api.js`: Replaced `assertPerson()` with `upsertPerson()`, added `createPerson()` and `updatePerson()`
- `src/background.js`: Updated to use new `upsertPerson()` function

## Related ADRs

- [003. Two-Step Upsert Pattern for Person Records](../../../doc/decisions/003-two-step-upsert-pattern.md)
