# Why Add to Attio Never Charges for Data Already on the Page

---

## The Problem with "Credits"

Most CRM capture tools charge credits for everything:
- The name you can see
- The email visible in the sidebar
- The phone number in plain text
- Even writes that fail

Credits ≠ marginal cost.
Credits = artificial throttle.

When a tool charges you for reading data your browser already loaded, that's not enrichment. That's rent extraction.

---

## Our Rule: Page-Visible Data is Free

If the browser can read it without leaving the page, you don't pay for it.

| Data Type | Add to CRM | Add to Attio |
|-----------|------------|--------------|
| Name from profile | Credit | Free |
| Headline | Credit | Free |
| Company | Credit | Free |
| LinkedIn URL | Credit | Free |
| DOM-visible email | Credit | Free |
| DOM-visible phone | Credit | Free |

**Hard rule. No exceptions. Ever.**

---

## What Actually Costs Money

External enrichment—calling third-party APIs to find data not on the page—has real marginal cost.

If we ever add enrichment:
- Credits map 1:1 to external API calls
- Explicitly labeled per-field
- Optional, not bundled
- You know exactly what you're paying for

But V1 has no enrichment. No credits. No pricing discussion.

---

## Correct Write Order

Most tools attempt CREATE before checking if the contact exists.

Result:
- Orphan records (email with no name)
- Failed merges
- Manual cleanup
- Data hygiene debt

**Our write order:**

```
1. RESOLVE  → Does this contact exist? (by LinkedIn URL, email, name)
2. LOCK     → Claim the record
3. DIFF     → What fields are new or changed?
4. PATCH    → Update only what's needed
5. COMMIT   → Or abort entirely if anything fails
```

No CREATE unless proven absent.
No partial writes.
No orphans.

---

## Who This Is For

**Operators who:**
- Use Attio as their CRM
- Prospect via LinkedIn
- Want one thing to work correctly
- Don't want to pay $50/month for buggy software
- Care about data hygiene

**Not for:**
- Teams needing multi-CRM support
- Users wanting automatic enrichment
- Anyone looking for workflow automation

---

## Who This Is Not For

If you need:
- Salesforce, HubSpot, or Pipedrive integration → Use Surfe
- Automatic email/phone enrichment → Use Apollo (and accept the cost)
- Workflow automation → Use Attio's native features

We do one thing. We do it correctly.

---

## The Difference

| Aspect | Add to CRM | Add to Attio |
|--------|------------|--------------|
| Credits for DOM data | Yes | No |
| Orphan records | Common | Never |
| Multi-CRM support | Yes (sprawling) | No (focused) |
| Open source | No | Yes |
| Gmail integration | Broken | Not attempted |
| Pricing | $50/month after 10 lifetime credits | Free |

---

## One Sentence

Add to Attio is a free, open-source browser extension that adds LinkedIn contacts to Attio without charging you for data your browser already loaded.

---

*Built for operators who value correctness over progress theater.*
