# AI Spend Analyzer — Development TODO

## Overview
Add an intelligent spending analysis engine that categorizes transactions, detects spending patterns, provides budget recommendations, and alerts users to unusual spending behavior. Works offline (local analysis on-device) and enriched after sync (server-side).

---

## Phase 1: Backend — Core Engine
- [ ] **Create `backend/app/services/spend_analyzer.py`**
  - [ ] `categorize_transaction(tx)` — rule-based category assignment (food, transport, utilities, entertainment, transfers, etc.)
  - [ ] `compute_spend_summary(user_id, period)` — aggregate daily / weekly / monthly totals per category
  - [ ] `detect_spend_trends(user_id)` — compare current period vs. previous (% change, direction)
  - [ ] `detect_anomalous_spending(user_id)` — flag sudden spikes or unusual category volumes
  - [ ] `generate_budget_alerts(user_id, thresholds)` — check user-defined or default budget limits

- [ ] **Create `backend/app/models/spend.py`** — Pydantic schemas
  - [ ] `SpendCategory` enum (FOOD, TRANSPORT, UTILITIES, ENTERTAINMENT, TRANSFERS, OTHER)
  - [ ] `SpendSummary` response model (period, totals, category_breakdown)
  - [ ] `SpendTrend` response model (category, current, previous, change_pct, direction)
  - [ ] `SpendAlert` response model (alert_type, message, severity, category, threshold, actual)
  - [ ] `SpendAnalysis` response model (summary + trends + alerts combined)

- [ ] **Update `backend/app/db/models.py`** — new DB columns/tables
  - [ ] Add `category` column to `TransactionRecord` (nullable String, backfill-friendly)
  - [ ] Create `BudgetThreshold` table (user_id, category, monthly_limit, alert_enabled)
  - [ ] Create `SpendSnapshot` table (user_id, period_type, period_start, category, total_amount) — for fast queries

## Phase 2: Backend — API Endpoints
- [ ] **Create `backend/app/api/v1/spend.py`** — new router
  - [ ] `GET /api/v1/spend/analyze/{user_id}` — full AI spend analysis (summary + trends + alerts)
  - [ ] `GET /api/v1/spend/summary/{user_id}?period=weekly` — spend summary for a period
  - [ ] `GET /api/v1/spend/categories/{user_id}` — category-wise breakdown
  - [ ] `GET /api/v1/spend/alerts/{user_id}` — current budget alerts and overspend warnings
  - [ ] `POST /api/v1/spend/budget/{user_id}` — set/update budget thresholds per category
  - [ ] `GET /api/v1/merchant/{id}/spend-insights` — merchant-side customer spend analytics

- [ ] **Register spend router in `backend/app/main.py`**

- [ ] **Add spend analysis hook into sync pipeline**
  - [ ] After `reconcile_transaction()` in `sync.py`, call `categorize_transaction()` to tag each tx

## Phase 3: Backend — Tests
- [ ] **Create `backend/tests/test_spend_analyzer.py`**
  - [ ] Test `categorize_transaction()` with various merchant/description patterns
  - [ ] Test `compute_spend_summary()` for correct aggregation
  - [ ] Test `detect_spend_trends()` — rising, falling, stable
  - [ ] Test `detect_anomalous_spending()` — spike detection
  - [ ] Test `generate_budget_alerts()` — threshold breach, near-limit warning
  - [ ] Test score with no transaction history (empty state)

- [ ] **Create `backend/tests/test_spend_api.py`**
  - [ ] Test all 5 spend endpoints (status codes, response shapes)
  - [ ] Test auth requirement on spend endpoints
  - [ ] Test merchant spend-insights endpoint

## Phase 4: Dashboard — Spend Analyzer UI
- [ ] **Create `dashboard/app/spend-analyzer/page.tsx`** — main spend analyzer page
  - [ ] Category pie/donut chart
  - [ ] Daily/weekly/monthly toggle
  - [ ] Trend indicators (↑ ↓ →) per category
  - [ ] Budget progress bars per category
  - [ ] Alert cards for overspend warnings

- [ ] **Create `dashboard/app/components/SpendChart.tsx`** — chart component
  - [ ] Install chart library (e.g., `recharts` or `chart.js`)
  - [ ] Pie chart for category breakdown
  - [ ] Bar chart for period comparison

- [ ] **Create `dashboard/app/components/BudgetBar.tsx`** — budget progress bar component

- [ ] **Create `dashboard/app/components/SpendAlert.tsx`** — alert card component

- [ ] **Update `dashboard/app/services/api.ts`**
  - [ ] `fetchSpendAnalysis(userId)` 
  - [ ] `fetchSpendSummary(userId, period)`
  - [ ] `fetchSpendCategories(userId)`
  - [ ] `fetchSpendAlerts(userId)`
  - [ ] `fetchMerchantSpendInsights(merchantId)`

- [ ] **Update `dashboard/app/page.tsx`** — add Spend Analyzer link card on home

## Phase 5: Mobile — On-Device Spend Analysis
- [ ] **Create `mobile/src/services/spendAnalyzer.js`**
  - [ ] `categorizeLocal(tx)` — offline category tagging using keyword matching
  - [ ] `getLocalSpendSummary(period)` — compute from AsyncStorage ledger
  - [ ] `getLocalAlerts(thresholds)` — check local spend vs. budget limits

- [ ] **Create `mobile/src/screens/SpendAnalyzerScreen.js`**
  - [ ] Category breakdown view
  - [ ] Spend trend summary
  - [ ] Budget alert list
  - [ ] Works fully offline (local data), enriched after sync

- [ ] **Update `mobile/src/navigation/`** — add Spend Analyzer tab/screen

- [ ] **Update sync flow** — after sync, refresh spend data from server response

## Phase 6: Integration & Polish
- [ ] **DB migration** — Alembic migration for new columns/tables (or auto-create for SQLite dev)
- [ ] **Backfill category** — script to categorize existing transactions
- [ ] **Default budgets** — seed sensible default budget thresholds for new users
- [ ] **End-to-end test** — mobile → sync → spend analysis → dashboard display
- [ ] **Update `DEVELOPMENT.md`** with spend analyzer API docs
- [ ] **Update `README.md`** demo flow with spend analyzer steps

## Future Enhancements (v2)
- [ ] ML-based category prediction (NLP on merchant names / descriptions)
- [ ] Personalized budget coaching (adaptive thresholds based on income patterns)
- [ ] Peer comparison — anonymous percentile-based spend benchmarking
- [ ] Predictive alerts — "At this rate, you'll exceed your food budget by Thursday"
- [ ] Export spend reports (PDF / CSV)
- [ ] TensorFlow Lite on-device inference for real-time categorization
