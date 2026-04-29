# Feature: Extract LinkedIn Contact Info & Enhance Existing Contact UI

## Summary

Enhance the extension to extract additional contact information from LinkedIn's "Contact info" modal (email, website, connected since) and display richer information in the popup UI for existing contacts.

## Problem Statement

1. **Contact Info Modal Data Not Captured**: LinkedIn profiles display a "Contact info" link that opens a modal containing:
   - Profile URL
   - Website(s) (could be personal or company)
   - Email address(es)
   - "Connected since" date

   This valuable data is currently **not being extracted** despite having corresponding fields in Attio.

2. **Sparse "Existing Contact" UI**: When viewing a profile that exists in Attio, the popup shows:
   - "Existing" badge
   - "Up to date ✓" status
   - Link to open contact in Attio

   This is sparse and doesn't provide value to the user - they can't see what data they have without clicking through to Attio.

## User Decisions

1. **Extraction Method**: Extension should **auto-open the contact info modal**, extract data, and close it
2. **UI Content**: Show **email + website + location** for existing contacts
3. **Multi-value Handling**: Extract and sync **all** emails/websites (multi-value arrays)

## Requirements

### Must Have
1. Auto-open contact info modal and extract:
   - All email address(es)
   - All website(s)
   - Connected since date

2. Map extracted fields to Attio person attributes:
   - `email_addresses` (multi-value)
   - `website` or `websites` (need to verify attribute slug)
   - Consider custom field for "Connected since"

3. Show contact summary in the "Up to date" state:
   - Display primary email
   - Display primary website
   - Display location

4. Multi-value support:
   - Extract all emails/websites from modal
   - Store as arrays
   - Display primary with "+N more" indicator

### Should Have
1. Graceful fallback when contact info unavailable (2nd/3rd degree connections)
2. Field-level diff for new contact info fields
3. Loading indicator while extracting contact info

### Could Have
1. Copy-to-clipboard action for email/website
2. Show all values in expandable list

## Technical Analysis

### Current State

#### Profile Data Extracted (`src/content/linkedin.ts`)
```typescript
interface ProfileData {
  fullName: string | null;
  linkedinUrl?: string;
  username?: string;
  description?: string;
  avatarUrl?: string;
  company?: string;
  location?: string;
  connectionDegree?: string;
  hasContactInfo?: boolean;  // Already detecting if link exists!
}
```

#### Attio Fields Currently Supported (`src/types/index.ts`)
```typescript
type PersonFieldKey = 'name' | 'linkedin' | 'twitter' | 'description';

interface AttioPersonValues {
  name: string | null;
  linkedin: string | null;
  twitter: string | null;
  description: string | null;
}
```

### LinkedIn Contact Info Modal Structure

From the screenshot, the modal contains:
- **Profile URL**: `linkedin.com/in/angelo-mccaskle/`
- **Website**: `mccaskleandpartners.com` (with "Company" label)
- **Email**: `angelo@mccaskleandpartners.com`
- **Connected since**: `Apr 4, 2026`

Modal URL pattern: `/overlay/contact-info/`

### Contact Info Extraction Strategy

**Auto-Open Modal Approach**:
1. Detect if `hasContactInfo` is true (1st degree connection)
2. Find and click the "Contact info" link programmatically
3. Wait for modal to appear (URL changes to `/overlay/contact-info/`)
4. Extract all data from modal DOM
5. Close modal (click outside or close button)
6. Return extracted data with profile data

**DOM Selectors to investigate** (need to verify on live page):
- Modal container: `.artdeco-modal`, `[data-test-modal="contact-info"]`
- Email section: Look for envelope icon or "Email" heading
- Website section: Look for link icon or "Website" heading
- Connected since: Look for people icon or "Connected since" heading

### Attio API Field Mapping

Standard Attio People attributes to verify:
- `email_addresses` - likely exists as standard multi-value attribute
- `websites` or `website` - need to verify slug
- May need custom attribute for "connected_since"

## Implementation Plan

### Phase 1: Extend Types and Constants

1. **Add new field types** (`src/types/index.ts`):
   ```typescript
   type PersonFieldKey = 'name' | 'linkedin' | 'twitter' | 'description'
                       | 'email' | 'website';

   interface ProfileData {
     // existing fields...
     emails?: string[];
     websites?: Array<{ url: string; label?: string }>;
     connectedSince?: string;
   }

   interface AttioPersonValues {
     // existing fields...
     email?: string | null;
     website?: string | null;
   }
   ```

2. **Add LinkedIn contact info selectors** (`src/constants/index.ts`):
   ```typescript
   contactInfo: {
     link: ['a[href*="overlay/contact-info"]', '#top-card-text-details-contact-info'],
     modal: ['.artdeco-modal', '[role="dialog"]'],
     closeButton: ['.artdeco-modal__dismiss', '[data-test-modal-close-btn]'],
     sections: {
       email: ['section.ci-email', '.pv-contact-info__ci-container a[href^="mailto:"]'],
       website: ['section.ci-websites', '.pv-contact-info__ci-container a[href^="http"]'],
       connected: ['.pv-contact-info__ci-container .t-black--light'],
     }
   }
   ```

### Phase 2: Contact Info Modal Extraction

1. **Create modal interaction helper** (`src/content/linkedin.ts`):
   ```typescript
   async function extractContactInfo(): Promise<ContactInfo | null> {
     // 1. Find contact info link
     // 2. Click to open modal
     // 3. Wait for modal to appear
     // 4. Extract emails, websites, connected since
     // 5. Close modal
     // 6. Return extracted data
   }
   ```

2. **Handle modal interaction carefully**:
   - Use `MutationObserver` or polling to detect modal appearance
   - Set reasonable timeouts (2-3 seconds max)
   - Clean up: always close modal even on error

3. **Update `extractLinkedInProfile()`**:
   - Check `hasContactInfo` flag
   - Call `extractContactInfo()` if available
   - Merge contact info into profile data

### Phase 3: Popup UI Enhancement

1. **Enhance "Up to date" state** (`src/popup/popup.html`, `popup.ts`):
   ```html
   <!-- State 3: Existing contact with contact summary -->
   <div id="state-clean" class="sheet-state hidden">
     <div class="contact-summary">
       <div class="contact-row" id="summary-email">
         <span class="contact-icon">✉</span>
         <span class="contact-value" id="summary-email-value"></span>
       </div>
       <div class="contact-row" id="summary-website">
         <span class="contact-icon">🔗</span>
         <span class="contact-value" id="summary-website-value"></span>
       </div>
       <div class="contact-row" id="summary-location">
         <span class="contact-icon">📍</span>
         <span class="contact-value" id="summary-location-value"></span>
       </div>
     </div>
     <div class="clean-status" id="up-to-date">Up to date ✓</div>
   </div>
   ```

2. **Display multi-value fields**:
   - Show primary value
   - If more values exist, show `+N more` indicator
   - Consider expandable list on click

3. **Loading state for contact info extraction**:
   - Show spinner while modal interaction occurs
   - Handle timeout gracefully

### Phase 4: Background Script & API Updates

1. **Update field mapping** (`src/background.ts`):
   - Add email/website to `AttioValuesInput` building
   - Add email/website to `handleUpdatePersonField`

2. **Multi-value API format**:
   ```typescript
   // Attio format for multi-value attributes
   values.email_addresses = emails.map(email => ({ value: email }));
   values.websites = websites.map(w => ({ value: w.url }));
   ```

3. **Update `toPersonValues()`**:
   - Extract first email/website for display
   - Store count for "+N more" indicator

### Phase 5: Diff & Update Logic

1. **Update `popup-diff.ts`**:
   - Add email/website comparison
   - Handle array comparison (check if new values not in Attio)

2. **Add translations** (`src/i18n/translations.ts`):
   ```typescript
   'popup.field.email': 'Email',
   'popup.field.website': 'Website',
   'popup.field.location': 'Location',
   'popup.summary.moreEmails': '+{n} more',
   'popup.summary.moreWebsites': '+{n} more',
   ```

### Phase 6: Testing

1. **Unit tests**:
   - Contact info extraction (mock DOM)
   - Multi-value handling
   - Field diff with arrays

2. **E2E tests** (Playwright):
   - Modal open/close flow
   - Data extraction accuracy
   - Popup display verification
   - Attio sync verification

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| LinkedIn DOM changes break selectors | High | Use multiple fallback selectors, add logging |
| Modal interaction timing issues | Medium | Use robust waiting with timeouts |
| Rate limiting on repeated modal opens | Low | Only open modal when explicitly needed |
| Contact info unavailable (non-1st degree) | Low | Already handle with `hasContactInfo` flag |

## Files to Modify

1. `src/types/index.ts` - Add email/website types
2. `src/constants/index.ts` - Add contact info selectors
3. `src/content/linkedin.ts` - Add modal extraction logic
4. `src/popup/popup.html` - Add contact summary section
5. `src/popup/popup.css` - Style contact summary
6. `src/popup/popup.ts` - Render contact info, handle new fields
7. `src/lib/popup-diff.ts` - Add email/website diff logic
8. `src/lib/attio-api.ts` - Add email/website API support
9. `src/background.ts` - Handle new fields in messages
10. `src/i18n/translations.ts` - Add labels for new fields

## Definition of Done

- [x] Contact info modal auto-opens and extracts data
- [x] All emails and websites extracted (multi-value)
- [x] New fields mapped to Attio person attributes
- [x] Existing contact UI shows email + website + location
- [x] Multi-value display with "+N more" indicator
- [x] Field-level diff works for email/website
- [x] Unit tests pass (110 tests)
- [ ] E2E tests verify modal interaction and sync
- [x] No regressions in existing functionality
- [x] Graceful degradation when contact info unavailable

## Related ADRs

- **ADR-005**: Person-first popup design - extends with contact summary
- **ADR-006**: Link existing person to Attio - adds more content alongside link
- **ADR-007**: Semantic badge indicator - no changes needed
- **ADR-008**: LinkedIn Contact Info Modal Extraction - documents the modal automation approach
