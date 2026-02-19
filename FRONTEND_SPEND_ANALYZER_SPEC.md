# Frontend Specification: AI Spend Analyzer

**Context:** We are adding an "AI Spend Analyzer" feature to the PrahariPay Dashboard (Next.js) and Mobile App (React Native). This feature provides intelligent insights, categorization, and budget alerts using an offline-first AI engine.

## 1. Tech Stack
- **Frameworks:** Next.js 16 (Dashboard), React Native 0.81 (Mobile)
- **Styling:** Tailwind CSS v4
- **Charts:** `recharts` (Recommended for React/Next.js), `react-native-chart-kit` (Mobile)
- **Icons:** Lucide React / Heroicons

## 2. Feature Requirements

### A. Merchant/User Dashboard (Next.js)
Create a new page `/spend-analyzer` and a simplified widget for the home dashboard.

#### UI Components
1.  **Spend Summary Card**
    -   Displays total spend for the selected period (Daily/Weekly/Monthly).
    -   Shows a "Trend Indicator" (e.g., "⬇ 12% vs last week" in Green, or "⬆ 5% vs last week" in Red).
    -   *Logic:* Compare current `total_amount` vs previous period.

2.  **Category Breakdown Chart (Donut User Interface)**
    -   Visualizes spend distribution (Food, Transport, Utilities, etc.).
    -   Legend with percentage and absolute amount.
    -   *Library:* Recharts `<PieChart>`.

3.  **Budget Progress Bars**
    -   List of categories with progress bars showing `spent / limit`.
    -   Color-coded:
        -   Green: < 75%
        -   Yellow: 75% - 90%
        -   Red: > 90%
        -   Pulsing Red: Over budget

4.  **AI Insight & Alert Cards**
    -   A specialized card component for AI notifications.
    -   Types:
        -   `ANOMALY`: "Unusual spike in 'Entertainment' detected on Tuesday."
        -   `BUDGET`: "You exceeded your 'Food' budget by ₹500."
        -   `PREDICTION`: "Projected to overspend by Friday based on current velocity."

### B. Mobile App Screens (React Native)
add a new bottom tab or section for "Insights".

1.  **Offline-Aware Analysis**
    -   The UI must handle two states:
        -   **Online:** Fetches rich analysis from `/api/v1/spend/analyze`.
        -   **Offline:** Calculates basic summaries locally from `AsyncStorage` ledger.
    -   *Indicator:* Show "⚡ On-device Analysis" tag when offline.

## 3. Data Models (TypeScript)

```typescript
// types/spend.ts

export type SpendCategory = 'FOOD' | 'TRANSPORT' | 'UTILITIES' | 'ENTERTAINMENT' | 'HEALTH' | 'TRANSFER' | 'OTHER';

export interface SpendSummary {
  period: 'daily' | 'weekly' | 'monthly';
  total_amount: number;
  currency: string;
  trend_pct: number; // e.g., 12.5 or -5.0
  trend_direction: 'up' | 'down' | 'flat';
}

export interface CategoryBreakdown {
  category: SpendCategory;
  amount: number;
  percentage: number;
  budget_limit?: number;
}

export interface SpendAlert {
  id: string;
  type: 'ANOMALY' | 'BUDGET' | 'PREDICTION';
  severity: 'low' | 'medium' | 'high';
  message: string;
  created_at: string;
}

export interface SpendAnalysisResponse {
  summary: SpendSummary;
  breakdown: CategoryBreakdown[];
  alerts: SpendAlert[];
}
```

## 4. API Endpoints (Integration)

**Base URL:** `http://localhost:8000/api/v1`

| Endpoint | Method | Purpose | Response Type |
|---|---|---|---|
| `/spend/analyze/{user_id}` | `GET` | Full analysis data for the dashboard | `SpendAnalysisResponse` |
| `/spend/alerts/{user_id}` | `GET` | Just the active alerts (for notification bell) | `SpendAlert[]` |

## 5. UI/UX Prompts for Implementation

**Prompt for Dashboard Widget:**
> "Create a React component `SpendInsightWidget.tsx` using Tailwind CSS. It should take a `SpendAnalysisResponse` prop. Display the total spend on the left with a big font. On the right, show a minimal 3-item list of the top spending categories with small progress bars. At the bottom, show a single 'Latest Insight' alert if one exists, styled with a light yellow/red background based on severity."

**Prompt for Analytics Page:**
> "Create a Next.js page `/spend-analyzer/page.tsx`. Use a 2-column grid layout. 
> - **Left Col:** A large 'Spend Over Time' bar chart and below it, the 'Category Breakdown' donut chart using `recharts`.
> - **Right Col:** A scrollable list of 'AI Insights & Alerts'. Each alert should have an icon (AlertTriangle, TrendingUp, Info) and a 'Dimiss' button.
> - Include a time-range picker (This Week / This Month) at the top right."

**Prompt for Mobile Screen:**
> "Create a React Native screen `SpendScreen.js`. Use `ScrollView`.
> 1. Top Section: 'Your Digital Ledger' card with total balance.
> 2. Middle: A horizontal scroll view of 'Budget Cards' (Credit Card style visuals for each category).
> 3. Bottom: 'AI Watchdog' section. If offline, show text 'Analyzing locally...'. If online, render the list of anomalies fetched from the API. Use `react-native-chart-kit` for a simple line graph of daily spending."
