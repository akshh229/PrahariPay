# PrahariPay Warm Light Theme - Implementation Plan

Date: 2026-02-20  
Scope: Dashboard + Mobile  
Goal: Replace dark/neon styling with a light, warm, merchant-friendly UI inspired by provided reference.

---

## 1) Current State Analysis

### Dashboard
Theme is dark and cyan-neon with many hardcoded colors.
Key sources:
- [dashboard/app/globals.css](dashboard/app/globals.css)
- [dashboard/app/layout.tsx](dashboard/app/layout.tsx)
- [dashboard/app/template.tsx](dashboard/app/template.tsx)
- [dashboard/app/components/Sidebar.tsx](dashboard/app/components/Sidebar.tsx)
- [dashboard/app/page.tsx](dashboard/app/page.tsx)
- [dashboard/app/transactions/page.tsx](dashboard/app/transactions/page.tsx)
- [dashboard/app/analytics/page.tsx](dashboard/app/analytics/page.tsx)
- [dashboard/app/spend-analyzer/page.tsx](dashboard/app/spend-analyzer/page.tsx)
- [dashboard/app/recovery/page.tsx](dashboard/app/recovery/page.tsx)
- [dashboard/app/guardians/page.tsx](dashboard/app/guardians/page.tsx)
- [dashboard/app/network/page.tsx](dashboard/app/network/page.tsx)
- [dashboard/app/settings/page.tsx](dashboard/app/settings/page.tsx)
- [dashboard/app/login/page.tsx](dashboard/app/login/page.tsx)

### Mobile
Theme is dark-blue with neon cyan accents and per-screen hardcoded styles.
Key sources:
- [mobile/App.js](mobile/App.js)
- [mobile/src/screens/SplashScreen.js](mobile/src/screens/SplashScreen.js)
- [mobile/src/screens/LoginScreen.js](mobile/src/screens/LoginScreen.js)
- [mobile/src/screens/RegisterScreen.js](mobile/src/screens/RegisterScreen.js)
- [mobile/src/screens/DashboardScreen.js](mobile/src/screens/DashboardScreen.js)
- [mobile/src/screens/ScanQRScreen.js](mobile/src/screens/ScanQRScreen.js)
- [mobile/src/screens/LedgerScreen.js](mobile/src/screens/LedgerScreen.js)
- [mobile/src/screens/SyncScreen.js](mobile/src/screens/SyncScreen.js)
- [mobile/src/screens/InsightsScreen.js](mobile/src/screens/InsightsScreen.js)
- [mobile/src/screens/SettingsScreen.js](mobile/src/screens/SettingsScreen.js)
- [mobile/src/screens/SendPpayScreen.js](mobile/src/screens/SendPpayScreen.js)

---

## 2) Target Theme Tokens (Warm Light)

Use semantic tokens, not direct hex in components.

Core neutrals:
- `bg.app`: `#F6F4EE`
- `bg.sidebar`: `#EFEDE6`
- `bg.card`: `#FFFFFF`
- `bg.cardMuted`: `#F3F1EA`
- `border.subtle`: `#E4DFD3`
- `text.primary`: `#1E1D1A`
- `text.secondary`: `#6F6B62`
- `text.muted`: `#9E998F`

Brand warm accents:
- `brand.primary`: `#E56A00`
- `brand.primaryHover`: `#CF5F00`
- `brand.soft`: `#F7E6D4`

Status:
- `success.bg`: `#E9F8EF`
- `success.fg`: `#1F8D52`
- `warning.bg`: `#FFF6E8`
- `warning.fg`: `#B56A00`
- `danger.bg`: `#FDECEC`
- `danger.fg`: `#B33636`
- `info.bg`: `#EEF5FF`
- `info.fg`: `#2F6FB6`

---

## 3) Dashboard Implementation

## 3.1 Foundation changes (mandatory first)
1. Update CSS tokens in [dashboard/app/globals.css](dashboard/app/globals.css):
   - Replace dark variables with warm-light semantic variables.
   - Add utility classes for card, badge, panel, subtle-border.

2. Remove forced dark mode in [dashboard/app/layout.tsx](dashboard/app/layout.tsx):
   - Remove `className="dark"` from `<html>`.
   - Replace body classes with warm-light background/text defaults.

3. Update root container in [dashboard/app/template.tsx](dashboard/app/template.tsx):
   - Replace dark root bg with `bg.app` token.

## 3.2 Component refactor
4. Sidebar refactor in [dashboard/app/components/Sidebar.tsx](dashboard/app/components/Sidebar.tsx):
   - Use warm sidebar background.
   - Active nav: soft orange background + primary text.
   - Inactive nav: muted gray text, subtle hover.

5. Shared status badges:
   - Keep existing risk class names in [dashboard/app/globals.css](dashboard/app/globals.css)
   - Replace dark translucent colors with light pastel backgrounds.

## 3.3 Page-by-page tokenization
6. Replace hardcoded `bg-[#111618]`, `bg-[#1b2427]`, `text-white`, `slate-*` classes with semantic token classes in:
   - [dashboard/app/page.tsx](dashboard/app/page.tsx)
   - [dashboard/app/transactions/page.tsx](dashboard/app/transactions/page.tsx)
   - [dashboard/app/analytics/page.tsx](dashboard/app/analytics/page.tsx)
   - [dashboard/app/spend-analyzer/page.tsx](dashboard/app/spend-analyzer/page.tsx)
   - [dashboard/app/recovery/page.tsx](dashboard/app/recovery/page.tsx)
   - [dashboard/app/guardians/page.tsx](dashboard/app/guardians/page.tsx)
   - [dashboard/app/network/page.tsx](dashboard/app/network/page.tsx)
   - [dashboard/app/settings/page.tsx](dashboard/app/settings/page.tsx)
   - [dashboard/app/login/page.tsx](dashboard/app/login/page.tsx)

7. Primary CTA normalization:
   - Use one orange primary button style globally (Sync, Approve, Generate QR, Login).

8. Card hierarchy:
   - Big metric card: optional strong orange fill for one highlight card only.
   - All other cards white with subtle borders.

---

## 4) Mobile Implementation

## 4.1 Create central theme files
1. Add [mobile/src/theme/colors.js](mobile/src/theme/colors.js)
2. Add [mobile/src/theme/typography.js](mobile/src/theme/typography.js)
3. Add [mobile/src/theme/components.js](mobile/src/theme/components.js)

This removes per-screen hardcoded hex values.

## 4.2 Navigation and shell
4. Update tab bar theme in [mobile/App.js](mobile/App.js):
   - Light tab background
   - Warm active color
   - Neutral inactive color
   - Remove dark top border colors

## 4.3 Screen migration
5. Migrate high-traffic screens first:
   - [mobile/src/screens/DashboardScreen.js](mobile/src/screens/DashboardScreen.js)
   - [mobile/src/screens/SyncScreen.js](mobile/src/screens/SyncScreen.js)
   - [mobile/src/screens/ScanQRScreen.js](mobile/src/screens/ScanQRScreen.js)
   - [mobile/src/screens/LedgerScreen.js](mobile/src/screens/LedgerScreen.js)

6. Then migrate account screens:
   - [mobile/src/screens/SettingsScreen.js](mobile/src/screens/SettingsScreen.js)
   - [mobile/src/screens/SendPpayScreen.js](mobile/src/screens/SendPpayScreen.js)
   - [mobile/src/screens/LoginScreen.js](mobile/src/screens/LoginScreen.js)
   - [mobile/src/screens/RegisterScreen.js](mobile/src/screens/RegisterScreen.js)
   - [mobile/src/screens/SplashScreen.js](mobile/src/screens/SplashScreen.js)
   - [mobile/src/screens/InsightsScreen.js](mobile/src/screens/InsightsScreen.js)

## 4.4 Style pattern for every screen
- Background: warm light app bg
- Cards: white + subtle border
- Primary action: orange filled button
- Secondary action: muted outlined button
- Alerts: pastel blocks with semantic text colors
- Replace emoji tab icons with icon library if desired (optional visual polish)

---

## 5) Execution Order (Recommended)

Phase A (1 day):
- Dashboard foundation tokenization + sidebar + overview page

Phase B (1-2 days):
- Remaining dashboard pages and login

Phase C (1 day):
- Mobile theme files + tab shell

Phase D (2 days):
- Mobile screen migration

Phase E (0.5 day):
- QA pass for contrast, consistency, regressions

---

## 6) QA Checklist

Visual:
- No dark/neon backgrounds remain
- Text contrast is readable on all cards/buttons
- Active nav and primary CTA are visually consistent

Functional:
- Sync, scan, send, recovery flows unchanged behavior
- No state color confusion for risk labels

Responsive:
- Dashboard works at common laptop widths
- Mobile safe-area and tab spacing remain correct

---

## 7) Risks and Mitigation

Risk: many hardcoded classes on dashboard pages  
Mitigation: first add semantic utility classes, then replace page-by-page.

Risk: mobile style duplication  
Mitigation: centralize tokens before screen migration.

Risk: accidental status-color regressions  
Mitigation: preserve risk class names and only change their palettes.

---

## 8) Definition of Done

- Dashboard and mobile no longer use dark/neon look.
- Warm-light palette implemented via centralized theme tokens.
- Primary/secondary/status components are visually consistent.
- Core user flows pass manual QA on phone and dashboard.
