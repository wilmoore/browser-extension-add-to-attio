# Add to Attio — Product Principles

**Date:** 2026-02-06

These principles are non-negotiable. They define what we build and what we explicitly reject.

---

## Core Principles

### 1. Page-visible data is free

**Hard rule. No exceptions. Ever.**

If the browser can read it without leaving the page:
- Zero credits
- Zero pricing discussion
- Zero artificial throttling

This alone differentiates us from Add to CRM, which charges credits for DOM-visible phone numbers and emails.

**Rationale:** Credits should map to marginal cost. Reading the DOM costs nothing. Charging for it is rent extraction, not value creation.

---

### 2. Resolve before write

Write order must be:

1. **Resolve** — Query for existing contact (LinkedIn URL, then email, then name)
2. **Lock** — Claim the record for atomic operation
3. **Diff** — Compare existing fields to new data
4. **Patch** — Update only changed fields
5. **Commit or abort** — Never leave partial state

**No CREATE unless proven absent.**
**No partial writes.**
**No orphan records.**

Add to CRM's failure mode: CREATE attempted before RESOLVE, no transactional boundary, no rollback. Result: orphan records, manual merges, data hygiene debt.

---

### 3. Binary state clarity

Preserve the good interaction pattern from Add to CRM:

| State | Affordance |
|-------|------------|
| Contact not in CRM | "Add" button |
| Contact exists | Green indicator (no action needed) |
| Contact exists + updatable | "Update X fields" option |

Users should immediately understand state. No guessing. No hidden automation.

---

### 4. Credits only for external calls (future)

If enrichment is ever added:
- Credits map 1:1 to external API calls
- Explicitly labeled per-field
- Optional, not bundled
- User knows exactly what they're paying for

**V1 has no enrichment. No credits. No pricing.**

---

### 5. Provenance awareness

Track where every field came from:
- `source: "linkedin_profile"` — DOM-visible data
- `source: "linkedin_message"` — Conversation context (future)
- `source: "enrichment_api"` — External lookup (future)
- `source: "user_input"` — Manual entry

Add to CRM treats everything as the same "enrich" event. This guarantees user distrust and credit anxiety.

---

## What We Build (B1)

### Scope

1. **LinkedIn profile detection** — Recognize profile pages
2. **One-click capture** — Single action to add/update contact
3. **Deduplication** — Resolve before write, always
4. **Visible field capture** — Name, headline, company, LinkedIn URL
5. **State indication** — Clear visual for exists/doesn't exist/updatable
6. **Success/failure feedback** — Immediate, unobtrusive

### Explicitly Not in B1

- Multi-CRM support
- Contact enrichment
- Gmail integration
- Workflow automation
- Credit systems
- Analytics or dashboards
- X (Twitter) support
- Reddit support

---

## What We Never Build

These are category rejections, not deferrals:

1. **Multi-CRM support** — Sprawling logic = bugs. Single-purpose = reliability.
2. **Credit gamification** — "You've enriched 10 contacts!" is progress theater.
3. **"Hours saved" marketing** — Vanity metrics optimize for upgrades, not users.
4. **Automatic enrichment** — Users should explicitly request external lookups.
5. **Background scraping** — No hidden behavior, ever.

---

## Future Wedge (B2): Message History

A high-leverage feature for later:

If the user is connected to the contact:
- Optional capture of LinkedIn message threads
- Attach as notes or timeline events in Attio
- Even read-only capture is valuable

**Reframes the product:**
> "Not just who they are, but how you already know them."

Add to CRM optimizes for new leads. We optimize for real relationships.

---

## Strategic Position

Add to CRM sells **progress theater**:
- Credit exhaustion
- Upgrade pressure
- Vanity metrics

We sell **operator-grade reliability**:
- Correct writes
- No orphans
- No anxiety
- No surprises

Their failures create our space.

---

## References

- ADR-001: `.plan/decisions/001-build-single-purpose-attio-extension.md`
- Product Brief: `.plan/product/briefs/2026-02-06-add-to-attio.md`
