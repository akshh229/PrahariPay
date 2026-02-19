# PrahariPay Development Guide

## Project Structure

- **backend/**: FastAPI application — ledger reconciliation, AI risk scoring, AI spend analyzer, JWT auth, guardian recovery, gossip protocol.
- **dashboard/**: Next.js merchant dashboard (React 19 + Tailwind CSS 4).
- **mobile/**: React Native (Expo) consumer app for offline payments.
- **docs/**: Documentation files.
- **scripts/**: Utility scripts.

## Getting Started

### Backend

1.  Navigate to `backend/`
2.  Create a virtual environment: `python -m venv .venv` and activate it
3.  Copy env config: `cp .env.example .env`
4.  Install dependencies: `pip install -r requirements.txt`
5.  Run the server: `uvicorn app.main:app --reload`
6.  Open API docs: `http://localhost:8000/docs`

The SQLite database (`praharipay.db`) is auto-created on first startup.

### Running Tests

```bash
cd backend
pytest tests/ -v
```

### Backend API Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/auth/register` | POST | No | Register new user |
| `/api/v1/auth/login` | POST | No | Login, get JWT tokens |
| `/api/v1/auth/refresh` | POST | No | Refresh access token |
| `/api/v1/auth/profile` | GET | Yes | Get user profile |
| `/api/v1/auth/generate-keys` | POST | Yes | Generate ECDSA keypair |
| `/api/v1/sync` | POST | Optional | Sync offline transactions |
| `/api/v1/ledger/{user_id}` | GET | Optional | Get user's transaction ledger |
| `/api/v1/merchant/{id}/transactions` | GET | Optional | Get merchant transactions |
| `/api/v1/merchant/{id}/summary` | GET | Optional | Get merchant summary stats |
| `/api/v1/register-guardians` | POST | Yes | Register recovery guardians |
| `/api/v1/guardians` | GET | Yes | List your guardians |
| `/api/v1/initiate-recovery` | POST | No | Start wallet recovery |
| `/api/v1/approve-recovery` | POST | Yes | Guardian approves recovery |
| `/api/v1/recovery/{id}` | GET | No | Check recovery status |
| `/api/v1/pending-recoveries` | GET | Yes | List your pending approvals |
| `/api/v1/gossip` | POST | No | Submit gossip message |
| `/api/v1/gossip/reconstruct/{tx_id}` | GET | No | Reconstruct tx from gossip |
| `/api/v1/gossip/stats` | GET | No | Gossip network stats |
| `/api/v1/spend/analyze/{user_id}` | GET | Yes | AI spend analysis (categories, trends, alerts) |
| `/api/v1/spend/summary/{user_id}` | GET | Yes | Spend summary (daily/weekly/monthly) |
| `/api/v1/spend/categories/{user_id}` | GET | Yes | Category-wise spend breakdown |
| `/api/v1/spend/alerts/{user_id}` | GET | Yes | Budget alerts and overspend warnings |
| `/api/v1/merchant/{id}/spend-insights` | GET | Optional | Merchant-side customer spend analytics |

### Mobile

1.  Navigate to `mobile/`
2.  Install dependencies: `npm install`
3.  Start Expo: `npx expo start`

### Dashboard

1.  Navigate to `dashboard/`
2.  Install dependencies: `npm install`
3.  Start dev server: `npm run dev`

## Architecture

```
Mobile App (Offline-First)
 ├── Local Ledger (AsyncStorage)
 ├── QR Scan → Pay → Local Debit
 ├── Gossip Broadcast (Device-to-Device)
 │
 ↓ (Sync when online)
FastAPI Backend (SQLite/PostgreSQL)
 ├── JWT Authentication
 ├── AI Reconciliation Engine
 │    ├── Duplicate Token Detection
 │    ├── Burst / Velocity Analysis
 │    ├── Circular Transaction Detection
 │    ├── Signature Verification (ECDSA)
 │    └── Trust Score Adjustment
 ├── AI Spend Analyzer
 │    ├── Transaction Categorization
 │    ├── Spend Trend Detection
 │    ├── Budget Threshold Alerts
 │    ├── Anomalous Spend Detection
 │    └── Merchant Revenue Analytics
 ├── Guardian Recovery (3-of-5 Quorum)
 ├── Gossip Redundancy Store
 └── Merchant Transaction View
       ↑
Dashboard (Next.js) polls merchant endpoint
```

## Environment Variables

See `backend/.env.example` for all configurable values.
