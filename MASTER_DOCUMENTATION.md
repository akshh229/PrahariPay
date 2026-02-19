# 🛡 PrahariPay: Comprehensive Project Documentation

**Version:** 1.0.0  
**Date:** February 18, 2026  
**Status:** Under Active Development

---

## 1. Executive Summary

**PrahariPay** is an intelligent, offline-first digital payment system designed to ensure financial continuity in low-connectivity environments, disaster zones, and rural areas. Unlike traditional systems (UPI, Cards) that require constant internet access, PrahariPay utilizes a "Guardian" architecture combining local ledgers, peer-to-peer gossip protocols, and AI-driven conflict resolution to allow secure transactions to happen anywhere, anytime.

**Core Philosophy:** "Payments Protected. Even Offline."

---

## 2. Problem Statement

Digital finance creates a single point of failure: **Connectivity**.

1.  **Network Reliance:** In rural regions, underground transit, or during natural disasters (floods, internet shutdowns), modern payment rails fail completely.
2.  **Double-Spending Risks:** Existing offline solutions often struggle to prevent a user from spending the same digital token twice before syncing.
3.  **Key Management:** Losing a device or forgetting a seed phrase results in permanent loss of funds.
4.  **Financial Blindness:** Users often lack real-time insights into their spending habits, leading to poor financial health.

---

## 3. The PrahariPay Solution

PrahariPay introduces a multi-layer resilience architecture:

### A. Offline-First Approach
Transactions are cryptographically signed and stored on the device's local ledger first. They are considered "optimistically valid" and allow the user to continue transacting.

### B. Intelligent Synchronization
When connectivity is restored, the **AI Reconciliation Engine** processes the batch of offline transactions. Instead of simple timestamp rules, it uses a risk-scoring model to resolve conflicts.

### C. Guardian Social Recovery
Recovering a wallet does not require a complex seed phrase. Users designate 3-5 trusted contacts ("Guardians"). A 3-of-5 quorum approval allows a user to provision a new device and restore their balance.

### D. Gossip Redundancy
Transactions are broadcast to nearby devices via a Gossip Protocol. If a user's phone is destroyed before syncing, the transaction history can be reconstructed from the "web of trust" formed by peers.

---

## 4. Key Features

### 1️⃣ Offline Payments
-   **Mechanism:** Append-only local ledger (AsyncStorage/SQLite).
-   **Security:** ECDSA (Elliptic Curve) signatures for every transaction.
-   **Limits:** Offline credit limits prevent unlimited unbounded spending.

### 2️⃣ AI Reconciliation Engine (Security)
-   **Function:** Server-side analysis of synced transactions to prevent fraud.
-   **Scoring:** Assigns a risk score (0.0 - 1.0) to every transaction.
-   **Flags:** Detects double-spending, high-velocity spending, and burst attacks.

### 3️⃣ AI Spend Analyzer (Financial Health)
-   **Function:** Intelligent categorization and budget tracking.
-   **Capabilities:**
    -   Auto-tags transactions (Food, Transport, Bills).
    -   Predicts budget overruns based on current velocity.
    -   Detects anomalous spending patterns (e.g., unusual amount at unusual time).
    -   Works offline (local logic) and enriches data after sync.

### 4️⃣ Guardian Social Recovery
-   **Mechanism:** Shamir's Secret Sharing simplified into a robust approval workflow.
-   **Workflow:** User requests recovery -> Guardians receive notification -> Quorum approves -> New key registered.

### 5️⃣ Network-Aware Smart Sync
-   **Logic:** Client decides when to sync based on battery, signal strength, and pending transaction volume.

---

## 5. Artificial Intelligence Implementation

PrahariPay uses a **Rule-Based AI Engine** with a roadmap to Machine Learning.

### A. Risk Scoring Factors (The "Brain")
Every transaction is evaluated against 7 weighted factors:
1.  **Duplicate Token:** (+0.50 risk) Attempting to spend a token ID that was already used.
2.  **High Amount:** (+0.20 risk) Exceeding defined safety thresholds (e.g., ₹5,000).
3.  **Burst Detection:** (+0.25 risk) >5 transactions in <5 minutes.
4.  **Velocity Check:** (+0.20 risk) Exceeding total spend limits within an hour.
5.  **Circular Loops:** (+0.20 risk) Detecting A->B->C->A laundering patterns.
6.  **Peer Propagation:** (+0.10 risk) Failure to gossip transaction to peers.
7.  **Signature Validity:** (+0.30 risk) Cryptographic failure.

### B. Deployment
-   **Location:** `backend/app/services/reconciliation.py`
-   **Output:** `Risk Score` (Float) and `Classification` (Valid, Likely Honest Conflict, Suspicious, Fraud).

---

## 6. Technical Stack

### 📱 Mobile App (Consumer)
-   **Framework:** React Native (Expo)
-   **Language:** JavaScript / TypeScript
-   **Database:** AsyncStorage (Local Ledger)
-   **Cryptography:** `uuid` for tokens, ECDSA for signing (planned integration).
-   **Network:** Axios with optimistic UI updates.

### 🧠 Backend (Server)
-   **Framework:** FastAPI (Python)
-   **Server:** Uvicorn (ASGI)
-   **Database:** SQLite (Dev) / PostgreSQL (Prod) via **SQLAlchemy**.
-   **Auth:** JWT (Access/Refresh tokens) + `passlib` (Bcrypt).
-   **Validation:** Pydantic models.

### 📊 Dashboard (Merchant/Admin)
-   **Framework:** Next.js 16 (React 19)
-   **Styling:** Tailwind CSS v4
-   **Charts:** Recharts
-   **Type Safety:** TypeScript

---

## 7. Project Structure

```
PrahariPay/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/v1/           # API Routes
│   │   ├── core/             # AI Engine, Config, Security
│   │   ├── db/               # Database Models & Session
│   │   └── services/         # Business Logic (Reconciliation, Spend Analyzer)
│   └── tests/                # Pytest Suite
├── dashboard/                # Next.js Merchant Dashboard
│   ├── app/
│   │   ├── components/       # UI Widgets (RiskBadge, SpendCards)
│   │   └── spend-analyzer/   # [New] AI Spend Pages
├── mobile/                   # React Native App
│   ├── src/
│   │   ├── services/         # Offline Ledger, Sync, Crypto
│   │   └── screens/          # Dashboard, ScanQR, Insights
└── docs/                     # Documentation
```

---

## 8. Future Roadmap

1.  **AI Upgrade:** Move from rule-based logic to **TensorFlow Lite** models running directly on the mobile device for real-time fraud detection.
2.  **Connectivity:** Implement **BLE Mesh Networking** to allow devices to "talk" and gossip transactions without any internet at all.
3.  **Privacy:** Zero-Knowledge Proofs (ZK-Snarks) for social recovery, so guardians approve recovery without knowing who the user is.
