# Implementation Notes

**Date:** 2026-02-06

Learnings from real-world testing and research.

---

## 1. API vs UI Automation: Speed Matters

### Observation

Tested two approaches for adding a LinkedIn contact to Attio:

| Approach | Tool | Speed | Method |
|----------|------|-------|--------|
| Direct API | Add to CRM extension | ~2 seconds | Single API call |
| UI Automation | Claude Chrome plugin | ~30+ seconds | Screenshot iteration, field-by-field entry |

### Implication

**Our extension must use direct API calls.** UI automation is too slow for daily use. The speed difference is not marginal—it's the difference between "frictionless" and "annoying."

---

## 2. LinkedIn DOM Navigation Challenges

### Observation

Claude Chrome plugin struggled with LinkedIn's messaging flow:

1. **Failed to click "Messages" button** on connected profile
2. **Kept opening wrong pages** instead of direct message link
3. **Workaround path**: Opened main messaging page → searched for contact name
4. **Problem**: If conversation isn't recent, it could be buried deep in the list

### Implication

LinkedIn's DOM is complex and changes frequently. For MVP:
- **Stick to profile page data only** (name, headline, URL, visible contact info)
- **Don't attempt message navigation** in V1
- **Message capture is B2 feature** (even competitors don't have this)

### Research Action

Use Playwright or Claude Chrome plugin to document:
- Correct selectors for profile data
- Correct selectors for "Contact Info" panel
- Stable navigation patterns that won't break

---

## 3. Message History Capture (B2 Feature)

### Observation

Despite navigation struggles, Claude plugin successfully:
1. Captured message thread screenshots
2. Created a summarization of the relationship history
3. Documented context in Attio

### Value Proposition

> "Not just who they are, but how you already know them."

This is a differentiated feature competitors don't offer. Add to CRM optimizes for new leads; we can optimize for **existing relationships**.

### Implementation Consideration

When capturing message history:
- Summarize into **one note** (not multiple comments)
- Include: first contact date, topic themes, relationship context
- Format as readable paragraphs, not raw data dump

---

## 4. Attio Data Entry: Notes vs Comments

### Observation

Claude plugin used **31 separate comments** instead of a single consolidated note. This created noise rather than clarity.

**Evidence (Screenshot 2):**
- Each bullet point from the message summary = separate comment
- Timeline organized well (March 2019, 2020, 2024-2026) but fragmented across 31 entries
- Activity feed becomes unusable

### What Claude Did Well

- Company linkage (WorkOS) with description and domain
- Job title captured (Developer Success Engineer)
- LinkedIn handle populated correctly
- Message history summarization was comprehensive and well-organized by time periods

### What Claude Did Poorly

| Issue | What Happened | What Should Happen |
|-------|---------------|-------------------|
| 31 comments | Each bullet = separate comment | Single markdown note |
| Task title | `@Kat Brandt tps://www.linkedin.com/in/katbrandt/` | "Follow up with Kat re: WorkOS contract opportunity" |
| Task context | No description | "Kat expressed interest in short-cycle dev support" |

### Task Creation Insight

The intuition to create a task was **correct**—there was an actionable thread about contract work with WorkOS. But a task titled "LinkedIn URL due today" is noise, not signal.

**Good task creation (if we ever add this):**
```
Title: Follow up with Kat about WorkOS contract opportunity
Description: Kat responded enthusiastically to contract work availability.
             WorkOS may need short-cycle help with dev success, integrations, or project support.
Due: [User should set this]
```

### Preferred Note Approach

```markdown
# Relationship Context

**First connected:** March 2019
**Last interaction:** February 2026
**Relationship span:** 7+ years

## Summary
Long-standing professional relationship. Wil has been a mentor/advisor to Kat
regarding career development. Both have moved into leadership/senior technical roles.

## Recent Context
Currently exploring potential collaboration—WorkOS may need short-cycle help
with dev success, integrations, or project support. Kat responded enthusiastically.

## Key History
- Initial contact: Job search advice after Nordstrom hiring freeze (2019)
- Career discussions: Contract vs W2, 1099 considerations
- Shared Glassdoor opportunities
- Reconnected about WorkOS culture and contract availability (2024-2026)
```

### Implication

For MVP: **Do not create tasks automatically.** If we add task creation later (B2), require:
1. User confirmation before creating
2. Meaningful title inferred from context
3. Description with actionable detail

---

## 5. Extension Architecture: Direct API

### Non-Negotiable

The extension must:
1. **Read DOM directly** (no screenshots, no iteration)
2. **Call Attio API directly** (no UI automation)
3. **Complete in <2 seconds** (comparable to Add to CRM)

### Flow

```
User clicks extension
      ↓
Content script extracts DOM data
      ↓
Background script calls Attio API
      ↓
User sees success/failure feedback
```

No intermediate steps. No navigation. No waiting.

---

## 6. Research Tasks (Pre-Implementation)

### Attio API

- [x] Authentication method (OAuth 2.0 vs API key)
- [x] Person creation endpoint
- [x] Person search/lookup endpoint (for deduplication)
- [x] Note creation endpoint
- [x] Required vs optional fields
- [x] Rate limits

**See Section 9: Attio API Reference below for full documentation.**

### LinkedIn DOM

- [x] Profile name selector
- [x] Headline selector
- [x] Profile URL extraction
- [x] "Contact Info" panel selectors (when available)
- [x] Detection of "connected" vs "not connected" state

**See Section 10: LinkedIn DOM Selectors below for full documentation.**

### X (Twitter) DOM

- [ ] Profile name selector
- [ ] Username selector
- [ ] Profile URL extraction
- [ ] Bio selector

### Reddit DOM

- [ ] Username selector
- [ ] Profile URL extraction
- [ ] Karma/account age (optional context)

---

## 7. Message Capture (B2 Scope)

### Approach Options

| Option | Pros | Cons |
|--------|------|------|
| DOM scraping | Fast, no navigation | LinkedIn may block, fragile selectors |
| UI automation | More reliable | Slow, requires navigation |
| LinkedIn API | Official, stable | Requires LinkedIn app approval, limited access |

### Recommendation

For B2: Start with DOM scraping from the direct message URL:
```
linkedin.com/messaging/thread/{thread-id}
```

If user is already on that page, capture visible messages. Don't navigate to it automatically.

---

## 8. Open Questions

1. **Should we offer to capture message history if user is on a message thread?**
   - Could detect URL pattern and offer "Capture conversation" option
   - B2 feature, not MVP

2. **How does Attio handle duplicate people by LinkedIn URL?**
   - Need to test: does their API reject duplicates or merge?
   - Our dedup logic depends on this

3. **What's the minimum viable permission set for the extension?**
   - `activeTab` (read current page)
   - Host permission for `api.attio.com`
   - Anything else?

---

## 9. Attio API Reference

### Authentication

Two options:
1. **OAuth 2.0** — For user-authorized apps
2. **API Key** — For workspace integrations

Both use Bearer token in header:
```
Authorization: Bearer <access_token_or_api_key>
```

### Required Scopes

- `record_permission:read-write` — Create/update person records
- `object_configuration:read` — Read object schema (for attribute IDs)

---

### Create Person Record

**Endpoint:** `POST /v2/objects/people/records`

```json
{
  "data": {
    "values": {
      "name": [{ "first_name": "Jane", "last_name": "Doe" }],
      "email_addresses": [{ "email_address": "jane@example.com" }],
      "linkedin_url": [{ "value": "https://linkedin.com/in/janedoe" }]
    }
  }
}
```

**Response:** Created record with `id.record_id` for future operations.

---

### Search/Query People (Deduplication)

**Endpoint:** `POST /v2/objects/people/records/query`

```json
{
  "filter": {
    "linkedin_url": "https://linkedin.com/in/janedoe"
  }
}
```

Filter supports:
- Exact match by attribute slug
- Compound filters with `$and`, `$or`

**Response:** Array of matching records.

---

### Assert (Upsert) — Preferred for Dedup

**Endpoint:** `PUT /v2/objects/people/records?matching_attribute=<attribute_slug>`

```json
{
  "data": {
    "values": {
      "linkedin_url": [{ "value": "https://linkedin.com/in/janedoe" }],
      "name": [{ "first_name": "Jane", "last_name": "Doe" }]
    }
  }
}
```

**Behavior:**
- If record with matching `linkedin_url` exists → updates it
- If no match → creates new record
- Returns the record either way

**Key insight:** Use `matching_attribute=linkedin_url` for deduplication by LinkedIn profile URL.

---

### Create Note

**Endpoint:** `POST /v2/notes`

```json
{
  "data": {
    "parent_object": "people",
    "parent_record_id": "<record_id>",
    "title": "Relationship Context",
    "content": "# Summary\n\nFirst connected: May 2018\n\n## Key Topics\n- Previous collaboration\n- Contract availability"
  }
}
```

**Features:**
- Linked to person record via `parent_record_id`
- Appears in person's activity timeline

**Markdown Limitations:**
- Basic formatting works: `#` headers, `**bold**`, `-` bullets
- **Links do NOT render** — `[text](url)` displays as raw text
- Attio uses rich text editor style: select text → paste URL to create link
- For API-created notes: include URLs as plain text, not markdown links

```
# Bad (won't render as link)
See [their LinkedIn](https://linkedin.com/in/example)

# Good (plain URL)
LinkedIn: https://linkedin.com/in/example
```

---

### Standard Attributes (People Object)

| Attribute Slug | Type | Notes |
|----------------|------|-------|
| `name` | Personal Name | `first_name`, `last_name`, `full_name` |
| `email_addresses` | Email (multi-value) | Array of emails |
| `phone_numbers` | Phone (multi-value) | Array of phones |
| `linkedin_url` | URL | Single value |
| `twitter_handle` | Text | Without @ prefix |
| `description` | Text | Bio/headline |

---

### Rate Limits

| Operation | Limit |
|-----------|-------|
| Read requests | 100/second |
| Write requests | 25/second |

**429 Response:**
- Returns `Retry-After` header with reset time
- Safe to retry after waiting
- For our use case (single user, manual action), rate limits are not a concern

---

### Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Invalid request | Check payload format |
| 401 | Unauthorized | Check API key/token |
| 403 | Forbidden | Check scopes |
| 404 | Not found | Record doesn't exist |
| 409 | Conflict | Duplicate detected (use assert instead) |
| 429 | Rate limited | Wait for `Retry-After` header, then retry |

---

### Implementation Strategy

```
1. User clicks extension
2. Content script extracts: name, headline, LinkedIn URL, visible contact info
3. Background script calls: PUT /v2/objects/people/records?matching_attribute=linkedin_url
4. Assert handles create-or-update atomically
5. If context note needed: POST /v2/notes with parent_record_id
6. Return success/failure to content script
7. Show non-blocking feedback
```

The assert endpoint eliminates the need for separate query → create/update logic. Single atomic operation.

---

## 10. LinkedIn DOM Selectors

**Source:** Live inspection via Claude in Chrome (2026-02-06)
**Test profile:** https://www.linkedin.com/in/katbrandt/ (Kathleen "Kat" Brandt)
**Attio record:** https://app.attio.com/savvyai/person/06816caf-76e9-4ae3-8cec-dff944057883/overview

---

### Critical Note: Dynamic Classes

LinkedIn uses **dynamically generated class names** (e.g., `ab639f49`, `e8d16db8`). These change between sessions and deployments. **Never rely on class names.** Use:
- Tag selectors (`h1`)
- Content-based matching
- Attribute selectors (`a[href="#"]`)
- Browser APIs (`window.location`)

---

### Name

**Primary selector:** `h1`

```javascript
const name = document.querySelector("h1")?.textContent?.trim();
// → "Kathleen (Kat) Brandt"
```

**Fallback:** Page title (always available)
```javascript
const name = document.title.split("|")[0].trim();
// → "Kathleen (Kat) Brandt"
```

---

### Headline (Job Title)

**Approach:** Content-based search (no reliable selector)

```javascript
// The headline is in a div near the h1, search by proximity
const h1 = document.querySelector("h1");
const headline = h1?.parentElement?.parentElement
  ?.querySelector("div:not(:has(h1))")?.textContent?.trim();
// → "Developer Success Engineer | Educator | Software Engineer"
```

**Alternative:** Search all divs for job-related text
```javascript
const headline = Array.from(document.querySelectorAll("div"))
  .find(el => el.childNodes.length === 1 &&
              el.textContent.length > 10 &&
              el.textContent.length < 200 &&
              !el.querySelector("*"))?.textContent?.trim();
```

**Note:** This is the most fragile selector. May need refinement during implementation.

---

### Profile URL

**Primary:** Browser API (100% reliable)

```javascript
const profileUrl = window.location.href;
// → "https://www.linkedin.com/in/katbrandt/"

const username = window.location.pathname.match(/\/in\/([^/]+)/)?.[1];
// → "katbrandt"
```

**Canonical URL pattern:** `https://www.linkedin.com/in/{username}/`

---

### Contact Info Link

**Selector:** `a[href="#"]` with text content check

```javascript
const contactInfoLink = Array.from(document.querySelectorAll('a[href="#"]'))
  .find(a => a.textContent?.trim() === "Contact info");
// → <a href="#">Contact info</a>

const hasContactInfo = !!contactInfoLink;
// → true (for 1st-degree connections)
```

**Note:** Contact info panel only visible for 1st-degree connections. Clicking this link opens a modal with email/phone if shared.

---

### Connection Degree

**Pattern:** Look for `· 1st`, `· 2nd`, or `· 3rd` in header area

```javascript
const headerText = document.querySelector("main section")?.textContent || "";
const degreeMatch = headerText.match(/·\s*(1st|2nd|3rd)/i);
const connectionDegree = degreeMatch?.[1] || null;
// → "1st"
```

**Interpretation:**
| Degree | Meaning | Contact Info Visible |
|--------|---------|---------------------|
| 1st | Direct connection | Yes (if shared) |
| 2nd | Friend of friend | No |
| 3rd | 3 degrees away | No |
| null | Not connected / Out of network | No |

---

### Complete Extraction Function

```javascript
function extractLinkedInProfile() {
  // Name (with fallback)
  const name = document.querySelector("h1")?.textContent?.trim()
    || document.title.split("|")[0].trim();

  // Profile URL
  const profileUrl = window.location.href;
  const username = window.location.pathname.match(/\/in\/([^/]+)/)?.[1];

  // Connection degree
  const headerText = document.querySelector("main section")?.textContent || "";
  const degreeMatch = headerText.match(/·\s*(1st|2nd|3rd)/i);
  const connectionDegree = degreeMatch?.[1] || null;

  // Contact info availability
  const hasContactInfo = Array.from(document.querySelectorAll('a[href="#"]'))
    .some(a => a.textContent?.trim() === "Contact info");

  // Headline (best effort)
  const h1 = document.querySelector("h1");
  const headline = h1?.closest("div")?.parentElement
    ?.querySelector("div + div")?.textContent?.trim() || null;

  return {
    name,
    headline,
    profileUrl,
    username,
    connectionDegree,
    hasContactInfo,
    source: "linkedin",
    capturedAt: new Date().toISOString()
  };
}
```

---

### URL Pattern Detection

To detect if current page is a LinkedIn profile:

```javascript
function isLinkedInProfile() {
  return /^https:\/\/(www\.)?linkedin\.com\/in\/[^/]+\/?$/.test(window.location.href);
}
```

---

## References

- Competitive Analysis: `.plan/product/competitive-analysis.md`
- Correct Write Algorithm: See "Correct Write Algorithm (Attio-Specific)" section
- Attio API Docs: https://docs.attio.com/
