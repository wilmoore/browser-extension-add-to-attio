# Refactor “Add to Attio” Sheet  Diff-Based UI (No Extra Buttons, Inline Navigation)

Branch: `refactor/add-to-attio-sheet-diff-based-ui`

## ADR Guardrails

- ADR 003 (Two-Step Upsert): keep query-then-create/update for People; don’t reintroduce `matching_attribute` upsert.
- ADR 005 (Person-First Popup): previously introduced a bulk update CTA and extra preview sections; this refactor intentionally removes those in favor of field-level diffs.
- ADR 006 (Link Existing Person): keep navigation embedded in the header name row (no standalone “Open in Attio” button) and only link when `attioUrl` is available.

## Target UI States

- **New** (`#state-new`): show header, core fields (Name, LinkedIn), single primary CTA: “Save to Attio”.
- **Existing + Diff** (`#state-diff`): header link, render only differing fields; each row has “Update” + “Skip”; optional subtle “Update all”.
- **Existing + Clean** (`#state-clean`): header link, show “Up to date ” only.

## Implementation Notes

- Field-level diffing requires returning Attio field values (subset) to the popup from `checkPerson`.
- Per-field updates require a dedicated background message/action that PATCHes only the chosen field.
- Move popup/user-facing copy to `src/i18n/translations.ts`.
- Replace timing magic numbers in popup with `TIMING` constants.
