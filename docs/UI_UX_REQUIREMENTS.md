# PrahariPay UI/UX Requirements (Comprehensive)

Version: 1.0  
Date: 2026-02-20  
Owner: Product + Design + Engineering  
Status: Ready for execution

---

## 1) Purpose

Define complete UI/UX requirements for redesign and implementation of PrahariPay across:
- Mobile app (React Native / Expo)
- Web dashboard (Next.js)

This document is implementation-ready and intended for product, design, frontend, backend, QA, and demo stakeholders.

---

## 2) Product Context

PrahariPay is an offline-first digital payment system with:
- Offline transaction capture and local ledger
- Sync and reconciliation with risk classification
- Spend insights and anomaly awareness
- Guardian-based account recovery
- Gossip redundancy and trust continuity

UI/UX must prioritize trust, clarity, resilience in poor network conditions, and fast user comprehension.

---

## 3) Design Principles

1. Trust-first UI
- Always show status, risk, and sync confidence clearly.
- Avoid hidden system behavior.

2. Offline-first behavior
- Core actions must remain usable with no internet.
- Network-dependent features must degrade gracefully.

3. Actionable simplicity
- Every screen should make the next best action obvious.
- Minimize cognitive load and dense text.

4. Safety and transparency
- High-risk events and conflicts require explicit feedback.
- No silent failures.

5. Consistency
- Same patterns for cards, list rows, badges, alerts, and action bars across mobile and web.

---

## 4) Scope

### In Scope
- Visual refresh and interaction redesign for existing screens
- Better hierarchy, spacing, typography, and status messaging
- Improved form UX, error handling, loading states, and empty states
- Unified components and behavior across mobile and web
- Accessibility and responsiveness
- Analytics instrumentation for key flows

### Out of Scope
- New payment protocol or reconciliation logic changes
- New business domain modules beyond current app capabilities
- Complete backend API redesign

---

## 5) Success Metrics (UX KPIs)

Primary:
- Sync success rate on first attempt >= 95%
- Payment flow completion >= 98% for happy path
- Time to understand account status on Home <= 5 seconds
- Recovery setup completion >= 85%

Secondary:
- Reduced support/debug incidents related to unclear errors
- Reduced repeated taps on primary actions caused by uncertain state
- Improved task completion in low-connectivity conditions

---

## 6) User Roles and Personas

1. Consumer user (primary)
- Sends/receives payments, scans QR, checks balance, syncs, views risk/insights.

2. Merchant user
- Reviews transactions and summary; cares about reconciliation outcomes and trust.

3. Admin/demo operator
- Needs predictable flows for demos, diagnostics, and setup.

4. Guardian participant
- Approves recovery requests and monitors account safety context.

---

## 7) Information Architecture

### Mobile Navigation (Bottom Tabs)
- Home
- Scan
- Ledger
- Sync
- Insights
- Settings

### Settings Subsections
- Profile and PrahariPay ID
- Guardians and recovery
- Security/session
- Diagnostics and environment info

### Web Dashboard Sections
- Analytics
- Transactions
- Guardians
- Recovery
- Network
- Settings
- Spend Analyzer

---

## 8) Global UX Requirements

### 8.1 Feedback States
Every async action must support:
- Idle
- Loading (progress visible)
- Success (clear confirmation)
- Recoverable error (with next action)
- Non-recoverable error (with fallback/support guidance)

### 8.2 Message Standards
- Use plain, actionable language.
- Error text format:
  - What failed
  - Why (if known)
  - What user can do now
- Never show raw stack traces in UI.

### 8.3 Offline/Online Behavior
- Always show connectivity status (discrete but visible).
- Mark which data is local vs server-verified.
- Queue supported actions and show queue count.

### 8.4 Time and Currency Display
- Human-readable date/time with locale support.
- Currency formatting consistent across mobile and web.

### 8.5 Risk and Trust Display
- Risk labels must be explicit: Valid, Likely Honest Conflict, Suspicious, Likely Fraud.
- Include contextual helper text for high-risk labels.

---

## 9) Visual Design System Requirements

### 9.1 Foundations
- Typography scale with clear title/body/caption hierarchy
- Spacing scale (4/8-based)
- Radius and elevation levels standardized
- One semantic color system for:
  - Primary action
  - Success
  - Warning
  - Error
  - Info
  - Neutral surfaces

### 9.2 Components (Shared Patterns)
Required reusable components:
- Primary/secondary/ghost buttons
- Input fields with validation states
- Status badges (sync, risk, network)
- Card container with header/body/footer slots
- Alert and toast patterns
- Empty state block
- Skeleton loader
- Section header with optional actions

### 9.3 Motion
- Motion should communicate state changes, not decorate.
- Max transition durations:
  - Micro interactions: 120-180ms
  - Screen transitions: 220-320ms
- Reduced-motion mode must be respected.

---

## 10) Mobile Screen-Level Requirements

## 10.1 Splash and App Entry
Purpose:
- Fast trust framing and load readiness.

Requirements:
- Show app identity and loading indicator.
- If startup checks fail, show retry CTA.
- Navigate to login/session restore when ready.

Acceptance:
- Startup completes without blank screen.
- Failure state always offers Retry.

## 10.2 Login
Purpose:
- Secure and low-friction authentication.

Requirements:
- Username/password inputs with clear validation.
- Login CTA disabled until valid input.
- Explicit errors for invalid creds vs network issue.
- Optional quick link to registration/reset if available.

Acceptance:
- User can identify exactly why login failed.

## 10.3 Home Dashboard
Purpose:
- Instant account understanding and next actions.

Content blocks:
- Available balance
- Trust/risk snapshot
- Pending offline transaction count
- Quick actions: Scan, Sync, Ledger, Send by PrahariPay ID

Requirements:
- Balance and ledger state visibility even when offline.
- Prominent queue/sync status indicator.
- If high-risk recent events exist, show alert card.

Acceptance:
- User can identify sync need and balance in under 5 seconds.

## 10.4 Scan QR
Purpose:
- Fast and safe payment input.

Requirements:
- Camera permissions pre-check and fallback message.
- Scan viewport with clear guidance text.
- Parse validation with readable errors for invalid QR.
- Confirm screen before final submit.

Acceptance:
- Invalid payload errors are understandable and actionable.

## 10.5 Ledger
Purpose:
- Transparent transaction history.

Requirements:
- Group by date with sticky section headers.
- Transaction row: counterparty, amount, status, timestamp.
- Filter chips: All / Synced / Pending / Risk-flagged.
- Detail drawer/screen for full metadata.

Acceptance:
- User can differentiate pending vs synced without opening detail.

## 10.6 Sync Center
Purpose:
- Resolve offline queue and reconcile server state.

Requirements:
- Show pending transaction count and latest sync time.
- Primary CTA: Sync Now.
- On sync result, show:
  - Processed count
  - Newly synced count
  - Already synced count
  - Failed count with reason summary
- Handle duplicate transaction IDs as successful idempotent outcomes.
- Do not block entire batch because one item is duplicate.

Error handling:
- HTTP/network errors: show retry and diagnostics hint.
- Server 5xx: show partial progress if available.

Acceptance:
- Duplicate re-sync never shows generic 500 failure modal.
- Successful idempotent transactions are clearly identified.

## 10.7 Insights
Purpose:
- Spending awareness and anomaly detection.

Requirements:
- Summary cards (daily/weekly/monthly spend)
- Category breakdown chart/list
- Alert list (anomaly, budget, prediction)
- Offline mode badge and local-analysis messaging

Acceptance:
- User can tell if insights are local-only or server-enriched.

## 10.8 Settings
Purpose:
- Identity, account safety, and configuration.

Sections:
- Profile overview
- PrahariPay ID setup/update (with validation and availability feedback)
- Session/device metadata
- Diagnostics panel (API host, sync status, app version)

Acceptance:
- PrahariPay ID update result is immediate and explicit.

## 10.9 Send by PrahariPay ID
Purpose:
- Direct transfer using user handle.

Requirements:
- ID input with real-time format validation.
- Resolve recipient preview before amount entry.
- Confirm transfer summary before submit.
- Clear success state + link to ledger entry.

Acceptance:
- No transfer proceeds without confirmed recipient resolution.

## 10.10 Guardians and Recovery
Purpose:
- Prevent account lockout and support social recovery.

Requirements:
- Guardian list with status and count vs threshold.
- Add/remove guardian with confirmation and conflict checks.
- Recovery request flow with progress timeline and approvals count.

Acceptance:
- User always sees current quorum progress and required remaining approvals.

---

## 11) Web Dashboard Requirements

## 11.1 Analytics
- KPI cards: volume, risk distribution, trust signals.
- Trend chart with period selector.
- Alert feed for anomalies/conflicts.
- Export controls (if available) remain discoverable.

## 11.2 Transactions
- Table with server-side pagination and sorting.
- Columns: tx id, sender, receiver, amount, time, classification, flags.
- Row expansion for raw details.
- Distinct styling for risky records.

## 11.3 Spend Analyzer
- Summary + trend chart + category breakdown.
- Budget status and overspend indicators.
- Alert panel for anomaly and predictions.

## 11.4 Guardians and Recovery
- Current guardians list with status and actions.
- Recovery requests table with state filters and detail panel.

## 11.5 Network and Sync Visibility
- Last sync time, queue indicators, endpoint status.
- Diagnostics widgets useful for demos and QA.

## 11.6 Settings
- Profile and identity management.
- Environment info and connectivity config visibility.

---

## 12) Data and API UX Contracts

### 12.1 Sync Response UX Contract
UI must support backend sync response containing per-item fields:
- transaction_id
- risk_score
- classification
- risk_flags
- synced
- already_synced (optional; true for idempotent duplicates)

### 12.2 Error Surface Contract
Frontend should parse and display:
- HTTP status
- endpoint-level message
- retry guidance

### 12.3 Loading Contract
For every endpoint-backed section:
- Show skeleton/loader first
- Show explicit empty state if no data
- Show recoverable error state with Retry action

---

## 13) Accessibility Requirements

Minimum WCAG targets:
- Contrast ratio compliant for text and controls
- Touch targets >= 44x44 px on mobile
- Screen reader labels for controls and status badges
- Focus-visible states on web
- Reduced-motion support

Accessibility acceptance:
- Keyboard navigation for all dashboard controls
- Screen reader announces sync outcomes and error messages

---

## 14) Performance Requirements

Mobile:
- First interactive Home render <= 2.5s on mid-tier Android
- Screen transitions remain smooth under normal load

Web:
- Core dashboard views load meaningful content <= 2.5s on average dev network

Both:
- Heavy lists/charts should use efficient rendering and avoid jank.

---

## 15) Security and Privacy UX

- Never display sensitive tokens or secrets in plain UI.
- Mask confidential identifiers where full value is not needed.
- Show explicit confirmation for sensitive actions:
  - recovery request submit
  - guardian removal
  - direct transfer submit

---

## 16) Telemetry and Analytics Events

Track events (mobile + web where relevant):
- login_success, login_failure
- qr_scan_success, qr_scan_failure
- sync_started, sync_completed, sync_failed
- sync_item_already_synced
- transfer_by_ppay_started, transfer_by_ppay_completed, transfer_by_ppay_failed
- guardian_added, guardian_removed
- recovery_requested, recovery_approved

Each event should include:
- timestamp
- user id (anonymized if required)
- network state (online/offline)
- screen/source context

---

## 17) QA Acceptance Matrix

Critical flows to validate:
1. Login and session restore
2. Offline transaction creation
3. Sync with all outcomes: success/partial/already-synced/error
4. Duplicate transaction id sync idempotency
5. QR scan invalid payload handling
6. PrahariPay ID resolve + send flow
7. Guardian setup and recovery request lifecycle
8. Insights online vs offline rendering

Device/browser coverage:
- Android physical device (primary)
- Web latest Chrome/Edge

---

## 18) Implementation Plan (Phased)

Phase 1: Foundations
- Design tokens, typography, spacing, shared components, global status patterns

Phase 2: Mobile Core
- Home, Scan, Ledger, Sync, Settings, Send by ID

Phase 3: Mobile Safety/Recovery
- Guardians and recovery UX completion

Phase 4: Web Dashboard
- Transactions, analytics, spend analyzer, guardians, settings

Phase 5: QA and Hardening
- Accessibility checks, performance tuning, edge-case handling, demo polish

---

## 19) Deliverables

Design deliverables:
- Mobile and web high-fidelity screens
- Component library and interaction specs
- State diagrams for sync, recovery, and transfer flows

Engineering deliverables:
- Updated reusable components
- Screen-level implementation aligned to this spec
- Analytics instrumentation
- QA checklist pass report

---

## 20) Final Definition of Done

Project UI/UX redesign is complete when:
1. All in-scope screens match this requirements document.
2. Core user journeys pass QA without blocker bugs.
3. Sync and duplicate sync flows never produce generic failure for idempotent replays.
4. Accessibility and performance minimums are met.
5. Demo flows are stable on physical Android device and web dashboard.
