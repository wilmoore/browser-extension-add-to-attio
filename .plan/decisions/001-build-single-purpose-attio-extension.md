# ADR-001: Build Single-Purpose Attio Extension

**Status:** Accepted
**Date:** 2026-02-06
**Decision:** Build a minimal, open-source browser extension for adding contacts to Attio from LinkedIn

---

## Context

### The Problem with "Add to CRM"

The existing market solution, "Add to CRM" extension, has critical issues:

1. **Predatory credit model**: 10 credits lifetime (not monthly), then ~$50/month to continue
2. **Gmail integration is broken**: Buttons don't work, contacts don't get added
3. **UI pollution**: Adds weird markers in Gmail that obscure email text
4. **Deduplication failures**:
   - Enrichment created duplicate contacts without names
   - Failed to merge existing contacts properly
   - Left orphan records (email address, no name)
   - Likely caused by sprawling multi-CRM logic that hasn't been tested for Attio edge cases
5. **Over-scoped**: Supports many CRMs, leading to bugs and complexity

### What Actually Works

The extension does successfully:
- Add contacts from LinkedIn profile pages
- Enrich some fields (source unclear—possibly scraping non-visible LinkedIn data)

### What's Actually Needed

A simple V1 that:
1. Adds a contact from LinkedIn to Attio
2. Handles deduplication correctly (don't create duplicates)
3. Does one thing well
4. Has no credit limits or paywalls

---

## Decision

Build a single-purpose, open-source browser extension that:

1. **Supports Attio only** — No multi-CRM sprawl
2. **Captures from LinkedIn first** — Highest value surface for professional relationships
3. **Handles deduplication** — Check for existing contacts before creating new ones
4. **No enrichment in V1** — Just capture what's visible; enrichment is a future concern
5. **No Gmail integration** — The existing tool's Gmail features are broken anyway; skip entirely
6. **Open source** — Inspectable, trustworthy, no hidden behavior
7. **No artificial limits** — No credits, no paywalls for core functionality

---

## Consequences

### Positive

- **Zero ongoing cost** vs ~$50/month for Add to CRM
- **No credit anxiety** — Use as much as needed
- **Clean implementation** — Single CRM = simpler logic = fewer bugs
- **Proper deduplication** — Built specifically for Attio's data model
- **No UI pollution** — No Gmail markers, no overlay noise
- **Portfolio value** — Demonstrates restraint and product judgment

### Negative

- **Development time investment** — Must build and maintain
- **Attio API dependency** — If Attio changes API, must update
- **No enrichment initially** — May need to add later if valuable

### Neutral

- **Tiny TAM currently** — Attio has ~5,000 customers today, but growing (4x ARR, $52M Series B)
- **LinkedIn platform risk** — Exists for all extensions; manageable with non-aggressive behavior

---

## Alternatives Considered

### 1. Pay for Add to CRM ($50/month)

**Rejected.**
- Cost is disproportionate to value for current usage volume
- Extension is buggy (broken Gmail, deduplication failures)
- 10 lifetime credits is insulting before upgrade

### 2. Use Attio's Native Extension

**Rejected.**
- 4.3/5 stars but users report slow performance (7-10 seconds)
- Incomplete data capture (missing fields)
- Reliability complaints

### 3. Use Groovin

**Rejected.**
- Closed-source (no transparency on behavior)
- Pricing unclear
- Adds another dependency

### 4. Use Open-Source GitHub Alternatives

**Partially viable but insufficient.**
- [twenty-crm-extension](https://github.com/JhumanJ/twenty-crm-extension) — For Twenty CRM, not Attio
- [LinkedIn-crm-extension](https://github.com/atul-gairola/LinkedIn-crm-extension) — LeadDelta clone, not Attio-compatible
- No existing open-source Attio-specific solution

### 5. Do Nothing

**Rejected.**
- Continue paying mental tax of 10-credit limit
- Continue with broken Gmail experience
- Miss contacts that should be in CRM

---

## Implementation Notes

### V1 Scope

1. **LinkedIn profile page detection** — Recognize when user is on a LinkedIn profile
2. **One-click capture** — Single action to add contact to Attio
3. **Deduplication check** — Query Attio for existing contact by LinkedIn URL or name before creating
4. **Minimal data capture** — Name, LinkedIn URL, headline, company (what's visible)
5. **Success/failure feedback** — Immediate, unobtrusive notification

### Explicitly Not in V1

- X (Twitter) support
- Reddit support
- Gmail integration
- Contact enrichment
- Automatic field population from non-visible data
- Bulk operations
- Analytics or dashboards

### Deduplication Strategy

Before creating a contact:
1. Query Attio by LinkedIn URL (exact match)
2. If no match, query by name (fuzzy match with confirmation)
3. If existing contact found, offer to update vs create new
4. Never create orphan records

---

## References

- Product Brief: `.plan/product/briefs/2026-02-06-add-to-attio.md`
- Market Validation: `.plan/product/validation-2026-02-06-125937.md`
- Attio API Docs: https://docs.attio.com/
- Attio Chrome Extension Help: https://attio.com/help/reference/tools-and-extensions/attio-chrome-extension

---

*Decision recorded 2026-02-06*
