# Add to Attio — Product Requirements Document

## 1. Product Thesis

Add to Attio is a minimal browser extension that enables users to add people to Attio directly from high-signal social surfaces at the moment a relationship begins.
The product prioritizes speed, trust, and zero UI friction.
It supports Attio only, captures only user-visible data on explicit action, and performs no background enrichment or automation.

The core extension is fully functional, open source, and usable without any hosted services.

---

## 2. Core Design Principles

1. **Single-focus integration**
   Support Attio only. No abstraction for other CRMs.

2. **Explicit user action only**
   No background scraping, no automatic triggers, no passive collection.

3. **Minimal surface area**
   No persistent UI, overlays, side panels, or injected elements.

4. **Inspectability and trust**
   All behavior is auditable in open source code. Permissions are minimal and explainable.

5. **Habit-friendly limits**
   Usage constraints, if any, reset daily rather than monthly.

6. **Fail clearly and quietly**
   Errors are immediate, localized, and non-disruptive.

---

## 3. Personas

### P-001 Operator Founder

* Uses Attio as primary CRM
* Actively sources relationships from social platforms
* Values speed and control over automation
* Distrusts opaque browser extensions

### P-002 Early GTM Builder

* Engages prospects publicly before email exists
* Tracks context manually today
* Wants capture without workflow changes

### P-003 Technical Power User

* Comfortable inspecting source code
* Sensitive to browser permissions
* Will abandon tools that feel invasive

---

## 4. Input Scenarios

* Viewing a LinkedIn profile during outbound research
* Reading an X thread where a potential customer signals intent
* Discovering a relevant Reddit commenter in a niche community

In all scenarios, the user is already on the page and decides explicitly to capture the person.

---

## 5. User Journeys

### J-001 Capture from Social Profile

User adds a visible person from a supported social surface to Attio with a single action.

### J-002 Handle Duplicate or Existing Record

User attempts to add a person who already exists in Attio.

### J-003 Failure Handling

User receives clear feedback when capture fails due to auth, limits, or network issues.

---

## 6. UX Surface Inventory

| Screen ID | Surface                           |
| --------- | --------------------------------- |
| S-001     | Browser extension context menu    |
| S-002     | Browser extension action feedback |
| S-003     | Extension settings page           |

---

## 7. Behavior and Editing Model

* All data capture is read-only from the page DOM at time of action.
* No post-capture editing occurs inside the extension.
* Any corrections or enrichment happen inside Attio.
* The extension does not store long-lived personal data locally beyond minimal operational state.

---

## 8. Constraints and Anti-Features

### Constraints

* Browser extension only
* Web-first, no native apps
* Minimal permissions
* No required backend services
* MVP build target: 2 to 4 weeks

### Anti-Features

* No enrichment
* No scraping outside active page
* No analytics dashboards
* No automation or workflows
* No CRM switching
* No injected UI into third-party sites

---

## 9. Success and Failure Criteria

### Success

* User can add a person in under 2 seconds
* Zero background network activity when idle
* Behavior explainable in one sentence
* Used daily without friction

### Failure

* Any hidden data capture
* UI pollution on supported sites
* Surprising limits or blocked usage
* Dependency on hosted services for core functionality

---

## 10. North Star

**Daily successful captures per active user**, with zero reported trust violations.

---

## 11. Epics

* E-001 [MUST] Social surface capture
* E-002 [MUST] Attio authentication and API interaction
* E-003 [MUST] Transparent feedback and errors
* E-004 [SHOULD] Duplicate handling
* E-005 [SHOULD] Extension settings and inspection
* E-006 [COULD] Optional hosted service integration

---

## 12. User Stories with Acceptance Criteria

### E-001 Social Surface Capture

* US-001 [MUST] As a user, I can add a LinkedIn profile to Attio from the page I am viewing.

  **Acceptance Criteria**

  * Given I am on a LinkedIn profile
    When I invoke the extension action
    Then visible name, profile URL, and headline are captured
    And no background requests occur before action

* US-002 [MUST] As a user, I can add an X profile to Attio.

  **Acceptance Criteria**

  * Given I am on an X profile
    When I invoke capture
    Then username, display name, and profile URL are captured

* US-003 [MUST] As a user, I can add a Reddit user profile to Attio.

  **Acceptance Criteria**

  * Given I am on a Reddit user page
    When I invoke capture
    Then username and profile URL are captured

---

### E-002 Attio Integration

* US-004 [MUST] As a user, I can authenticate the extension with Attio.

  **Acceptance Criteria**

  * Given I have not authenticated
    When I attempt capture
    Then I am prompted to authenticate
    And no data is sent without auth

* US-005 [MUST] As a user, captured people are created in Attio.

  **Acceptance Criteria**

  * Given valid auth and input
    When capture succeeds
    Then a person record exists in Attio with source URL

---

### E-003 Feedback and Errors

* US-006 [MUST] As a user, I receive immediate success feedback.

  **Acceptance Criteria**

  * Given a successful capture
    Then a non-blocking confirmation is shown
    And disappears automatically

* US-007 [MUST] As a user, I see clear errors when capture fails.

  **Acceptance Criteria**

  * Given a failure
    Then the error reason is shown
    And no retry occurs automatically

---

### E-004 Duplicate Handling

* US-008 [SHOULD] As a user, I am informed if a person already exists.

  **Acceptance Criteria**

  * Given the person exists in Attio
    When I attempt capture
    Then I am notified without creating a duplicate

---

### E-005 Settings

* US-009 [SHOULD] As a user, I can view permissions and data usage.

  **Acceptance Criteria**

  * Given I open settings
    Then permissions and data handling are documented locally

---

### E-006 Optional Hosted Services

* US-010 [COULD] As a power user, I can opt into usage limits managed by a hosted service.

  **Acceptance Criteria**

  * Given I opt in
    Then usage limits are enforced
    And core capture still functions without the service

---

## 13. Traceability Map

| Story  | Epic  | Journey | Screen | Priority |
| ------ | ----- | ------- | ------ | -------- |
| US-001 | E-001 | J-001   | S-001  | MUST     |
| US-002 | E-001 | J-001   | S-001  | MUST     |
| US-003 | E-001 | J-001   | S-001  | MUST     |
| US-004 | E-002 | J-001   | S-003  | MUST     |
| US-005 | E-002 | J-001   | S-002  | MUST     |
| US-006 | E-003 | J-001   | S-002  | MUST     |
| US-007 | E-003 | J-003   | S-002  | MUST     |
| US-008 | E-004 | J-002   | S-002  | SHOULD   |
| US-009 | E-005 | J-001   | S-003  | SHOULD   |
| US-010 | E-006 | J-001   | S-003  | COULD    |

---

## 14. Lo-fi UI Mockups (ASCII)

### S-001 Extension Context Menu

**Purpose**
Trigger capture action.

**Primary Action**
Add to Attio

**States**
Idle only.

```
+----------------------+
| Add to Attio         |
+----------------------+
```

---

### S-002 Action Feedback

**Purpose**
Confirm success or failure.

**States**

Success

```
[✓ Added to Attio]
```

Error

```
[✕ Failed to add]
Reason: Not authenticated
```

---

### S-003 Settings

**Purpose**
Auth, inspection, transparency.

```
Add to Attio Settings
--------------------
Status: Authenticated
Permissions:
- Read current page
- Access Attio API

Data Usage:
- Visible profile fields only

[Disconnect Attio]
```

---

## 15. Decision Log

### D-001 Supported CRMs

* **Question**: Support Attio only or multiple CRMs?
* **Options**: Attio only, Multi-CRM
* **Evidence**: Explicit in brief
* **Winner**: Attio only
* **Confidence**: 0.95

### D-002 UI Injection

* **Question**: Inject UI into social surfaces?
* **Options**: Yes, No
* **Winner**: No
* **Confidence**: 0.9

### D-003 Hosted Service Dependency

* **Question**: Require backend for core capture?
* **Options**: Required, Optional, None
* **Winner**: Optional
* **Confidence**: 0.85

### D-004 Usage Limits Model

* **Question**: Daily vs monthly limits?
* **Options**: Daily, Monthly
* **Winner**: Daily
* **Confidence**: 0.8

---

## 16. Assumptions

* Attio provides an API suitable for person creation.
* Social surface DOMs are accessible at capture time.
* MVP scope excludes localization.
* Browser support targets Chromium first.
* No compliance requirements beyond standard browser policies.

---

> **This PRD is complete.**
> Copy this Markdown into Word, Google Docs, Notion, or directly into a coding model.
