# Competitive Analysis: Add to CRM

**Date:** 2026-02-06
**Status:** Evidence documented

---

## Overview

"Add to CRM" is a browser extension that captures contacts from LinkedIn to various CRMs. This analysis documents its fundamental design flaws that create our competitive wedge.

---

## Evidence: Screenshots

### Screenshot 1: Credit Exhaustion Screen

**What it shows:**
- "You've enriched 10 contacts!"
- "You've run out of credits."
- "Your progress so far: 10 contacts enriched, ~2 hours saved vs. manual research"
- Upgrade prompt: "Up to 500 profile enrichments/month, Access to phone numbers, ~20 hours saved per month"

**What it proves:**
- 10 lifetime credits (not monthly)
- Progress theater ("hours saved" vanity metrics)
- Upgrade pressure as primary UX goal

---

### Screenshot 2: DOM-Visible Data Charged as "Enrichment"

**What it shows:**

LinkedIn Contact Info panel (DOM-visible):
- Profile: linkedin.com/in/mollygravatt
- Website: radiant.dev (Company)
- Phone: 720-557-6359 (Work)
- Email: molly@radiant.dev
- Birthday: May 6
- Connected since: May 8, 2018

Add to CRM popup:
- "Enrich 3 fields in CRM..."
- Shows: molly@radiant.dev, molly@gravatt.net, mgravatt@radiantinteractiv..., (720) ••••••• personal
- "5 credits left"

**What it proves:**
1. **Phone number is DOM-visible** — LinkedIn Contact Info panel clearly shows 720-557-6359
2. **Primary email is DOM-visible** — molly@radiant.dev is on the page
3. **Add to CRM still charges credits** — "Enrich 3 fields" for data already loaded

**Critical insight:** They charge credits for `document.querySelector()`. Zero marginal data cost. Pure rent extraction.

---

## Root Cause Analysis

### Their Mental Model (Flawed)

> "Any field we populate = enrichment = credit."

### Correct Mental Model

> "Only fields requiring paid external data access cost credits."

### What They Skipped

1. **Field provenance tracking** — No distinction between page-extracted vs externally-sourced
2. **Write-safety** — Non-transactional writes create orphans
3. **Atomicity** — No rollback on failure

---

## Technical Failure: Non-Atomic Writes

### Observed Behavior

1. Parse page
2. Build "candidate person" object
3. Attempt CREATE + UPSERT
4. Let CRM reject duplicates
5. Fail to recover state

### Result

- Duplicate key errors
- Partial/orphan records (email with no name)
- No rollback
- Manual cleanup required

### Evidence

User experienced:
- Enrichment attempted on existing contact
- Email address entered as new contact without name
- Original contact not updated
- Orphan record left in CRM
- Attio rejected duplicate email on subsequent operations

---

## Pricing Model Analysis

### What They Charge Credits For

| Data Source | Marginal Cost | Add to CRM | Should Be |
|-------------|---------------|------------|-----------|
| DOM-visible name | $0 | Credit | Free |
| DOM-visible email | $0 | Credit | Free |
| DOM-visible phone | $0 | Credit | Free |
| DOM-visible company | $0 | Credit | Free |
| External email lookup | ~$0.01-0.05 | Credit | Credit |
| External phone lookup | ~$0.05-0.15 | Credit | Credit |
| Failed writes | $0 | Credit | Free |
| Partial writes | $0 | Credit | Free |

### Conclusion

Credits are detached from cost. They exist purely as artificial throttle for upgrade pressure.

---

## Feature Gaps

### Gmail Integration

- Broken: buttons don't add contacts
- UI pollution: weird markers obscure email text
- Not worth replicating

### Message Context

What Add to CRM does NOT capture:
- LinkedIn message history
- Conversational context
- Relationship timeline
- "Connected since" date

They optimize for **new leads**, not **real relationships**.

---

## Their Business Model

### What They Optimize For

1. Credit exhaustion
2. Upgrade pressure
3. Vanity metrics ("hours saved")
4. Progress theater

### What They Don't Optimize For

1. Data correctness
2. Write safety
3. User trust
4. Operator-grade reliability

---

## Our Wedge

### Hard Rule

**DOM-visible data is always free.**

Everything flows from that.

### Capture Pipeline (Correct)

```
1. Read DOM
2. Tag each field: source = page | external
3. Pre-flight lookup in Attio (LinkedIn URL, email)
4. If exists → PATCH only changed fields
5. If not exists → CREATE once
6. Credits only decrement for source = external
```

### Failure Condition

If any write fails → abort all writes.

No orphans. No surprises.

---

## Strategic Position

| Aspect | Add to CRM | Add to Attio |
|--------|------------|--------------|
| DOM-visible data | Charged | Free |
| Field provenance | Not tracked | Tracked |
| Write atomicity | No | Yes |
| Orphan records | Common | Never |
| Multi-CRM | Yes (sprawling) | No (focused) |
| Credit model | Rent extraction | Cost-aligned (future) |
| Open source | No | Yes |

---

## Leverage Move (No Code Required)

**Publish a short post:**

> "Why we don't charge for phone numbers already on LinkedIn."

Include:
- These screenshots
- Simple diagram of correct write order
- "Who this is for / not for"

Converts:
- Frustration → authority
- Their flaw → our positioning
- Zero code → inbound demand

---

## Detailed Diagnosis

### What Add to CRM Actually Is

> "This is not a data business; it's a **metered DOM extractor with enrichment bolted on**."

Credits are tied to **field writes**, not **data acquisition cost**. This is a **pricing integrity failure**, not just UX.

---

### Broken Dedupe Flow (Observed)

What they do:

```
1. Detect existing person → switch to "enrich" mode
2. CREATE → then reconcile
3. CRM rejects duplicate key (email)
4. Error handler fails
5. Result: orphan record with partial fields
```

What they should do:

```
1. Pre-flight lookup (email + LinkedIn URL)
2. Hard lock on existing record
3. PATCH-only writes
4. All-or-nothing transaction
```

**Diagnosis:** They are doing **best-effort writes**, not atomic operations.

---

### Strategic Implications

Add to CRM is:
- Optimized for **credit burn**, not correctness
- Built for **breadth of CRMs**, not depth of any one
- **Unsafe for serious operators** who care about data hygiene

This caps them at prosumers and SMBs. Enterprise and serious operators need transaction-safe writes.

---

## Correct Write Algorithm (Attio-Specific)

### Pre-Flight Resolution

```typescript
async function resolveContact(data: CapturedData): Promise<AttioRecord | null> {
  // Priority order for matching
  const matchers = [
    { field: 'linkedin_url', value: data.linkedinUrl },
    { field: 'email', value: data.email },
    { field: 'name', value: data.fullName }  // fuzzy, requires confirmation
  ];

  for (const matcher of matchers) {
    if (!matcher.value) continue;

    const existing = await attio.people.search({
      filter: { [matcher.field]: matcher.value }
    });

    if (existing.length === 1) {
      return existing[0];
    }

    if (existing.length > 1) {
      // Ambiguous match - require user selection
      throw new AmbiguousMatchError(existing);
    }
  }

  return null; // No match - safe to create
}
```

### Atomic Write

```typescript
async function captureContact(data: CapturedData): Promise<Result> {
  const existing = await resolveContact(data);

  if (existing) {
    // PATCH only - never CREATE on existing
    const diff = computeDiff(existing, data);

    if (diff.isEmpty()) {
      return { status: 'no_changes', record: existing };
    }

    try {
      const updated = await attio.people.update(existing.id, diff.changes);
      return { status: 'updated', record: updated, changes: diff.changes };
    } catch (error) {
      // Abort entirely - no partial state
      return { status: 'failed', error, record: existing };
    }
  } else {
    // CREATE new - only if proven absent
    try {
      const created = await attio.people.create(data);
      return { status: 'created', record: created };
    } catch (error) {
      // Abort - no orphans
      return { status: 'failed', error };
    }
  }
}
```

### Field Provenance Tracking

```typescript
interface CapturedField {
  value: string;
  source: 'page' | 'external';
  confidence: 'exact' | 'inferred';
  timestamp: string;
}

// Example captured data
const capturedData = {
  fullName: { value: 'Molly Gravatt', source: 'page', confidence: 'exact' },
  email: { value: 'molly@radiant.dev', source: 'page', confidence: 'exact' },
  phone: { value: '720-557-6359', source: 'page', confidence: 'exact' },
  linkedinUrl: { value: 'linkedin.com/in/mollygravatt', source: 'page', confidence: 'exact' },
  // Future: external enrichment
  // verifiedEmail: { value: 'molly@radiant.dev', source: 'external', confidence: 'exact' }
};
```

---

## MVP Counter-Position

**Tagline:** "Attio-native, zero-waste contact capture."

### Hard Guarantees

1. **No credit usage for DOM-visible data** — Page-present fields are always free
2. **Credits only for external calls** — Enrichment APIs explicitly itemized (future)
3. **Pre-flight dedupe required** — If record exists, only PATCH allowed
4. **Atomic writes** — If any field fails, nothing is written

---

## 72-Hour Leverage Move

### Action

Write a short teardown:
> "Why we don't charge for phone numbers already on LinkedIn."

### Include

- Screenshots showing DOM-visible data charged as enrichment
- Simple diagram: their flow vs correct flow
- "Who this is for / not for"

### End With

> "Attio-first. No duplicate records. No wasted credits."

### Converts

- Your annoyance → authority
- Their flaw → your positioning
- Zero code → inbound demand

---

## Summary

Add to CRM has two fundamental failures:

1. **Pricing integrity** — Credits detached from marginal cost
2. **Transactional integrity** — Best-effort writes create orphans

These are not bugs. They are **business model smells**.

Build the challenger:
- Attio-first
- Transaction-safe
- Credit-honest

---

## References

- Product Principles: `.plan/product/principles.md`
- Positioning: `.plan/product/positioning.md`
- ADR-001: `.plan/decisions/001-build-single-purpose-attio-extension.md`
