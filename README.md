🛡 PrahariPay
AI-Powered Offline-First Guardian Payment Protocol

Payments Protected. Even Offline.

🌍 Overview

PrahariPay is an intelligent, offline-first digital payment system designed to operate in low-connectivity and disaster-prone environments.

Unlike traditional payment systems that fail without internet access, PrahariPay enables:

Secure peer-to-peer offline transactions

AI-powered conflict resolution during sync

AI Spend Analyzer for intelligent spending insights and budget intelligence

Guardian-based social recovery (no seed phrases)

Gossip-style transaction redundancy

Eventual consistency with central ledger

PrahariPay acts as a digital Prahari (guardian) — protecting transactions even when networks fail.

🚨 Problem

Digital payment systems like UPI, card networks, and centralized wallets depend on continuous connectivity.

In:

Rural regions

Disaster zones

Underground facilities

Network outage scenarios

Payments either fail or become insecure.

Additionally:

Lost devices = lost access

Offline transactions risk double-spending

Ledger data may be permanently lost

💡 Solution

PrahariPay introduces a multi-layer resilience architecture:

📴 Offline Payment Engine

Users transact without internet using locally signed ledgers.

🧠 Conflict Resolution Intelligence (AI)

When connectivity returns, an AI-driven engine analyzes conflicts instead of naïve timestamp rules.

🛡 Social Recovery (Web of Trust)

Users recover wallets via guardian quorum (e.g., 3-of-5 approvals). No seed phrases.

🌐 Gossip Protocol Redundancy

Transactions propagate to nearby peers, ensuring survivability even if devices are destroyed.

� AI Spend Analyzer

Intelligent spending analysis engine that categorizes transactions, detects spending patterns, provides budget recommendations, and alerts users to unusual spending behavior — all powered by on-device + server-side AI.

�🔄 Smart Sync Optimization

AI determines optimal sync timing based on battery, signal, and pending transactions.

🏗 System Architecture
Mobile App (Offline-First)
 ├── Local Ledger (Append-Only)
 ├── Offline Payment Engine
 ├── Gossip Propagation Layer
 ├── Guardian Recovery Client
 ├── Edge Risk Estimator
 │
 ↓
FastAPI Backend
 ├── Ledger Reconciliation Engine
 ├── Conflict Resolution Intelligence
 ├── Anomaly Detection Engine
 ├── AI Spend Analyzer Engine
 ├── Guardian Recovery Manager
 ├── Peer Cache (Redundancy)
 ├── Credit Adjustment Engine

🔐 Key Features
1️⃣ Offline-First Transactions

Append-only local ledger

Token-based spending model

Offline credit limits

Double-spend prevention

2️⃣ AI-Powered Conflict Resolution

During sync, the system evaluates:

Duplicate token usage

Offline transaction bursts

High-value transaction patterns

Sync delay anomalies

Outputs:

Risk Score (0–1)

Classification:

Valid

Likely Honest Conflict

Suspicious

Likely Fraud

3️⃣ Anomaly Detection Engine

Detects:

Collusion patterns

Circular transaction loops

Repeated peer abuse

Burst transaction anomalies

4️⃣ Social Recovery (Guardian Model)

User designates 5 guardians

Recovery threshold: 3-of-5 quorum

New key registered after approval

No seed phrase required

Inspired by quorum-based smart contract wallets.

5️⃣ Gossip Redundancy Layer

Transactions:

Propagate to nearby peer nodes

Stored redundantly

Reconstructed during sync

Ensures:

Data survivability

No single point of failure

Eventual consistency

6️⃣ AI Spend Analyzer

Per-user and per-merchant intelligent spending analysis:

Automatic transaction categorization (food, transport, utilities, etc.)

Daily / weekly / monthly spend summaries with trend detection

Budget threshold alerts and overspend warnings

Peer comparison — anonymous spend benchmarking

Merchant-side revenue analytics and customer spend patterns

Anomalous spend detection (sudden spikes, unusual categories)

Works offline: local analysis on-device, enriched after sync

7️⃣ Network-Aware Smart Sync

Client-side logic determines:

Immediate sync

Batched sync

Delayed sync

Based on:

Battery level

Signal strength

Pending transaction count

🔁 Worst Case Scenario Handling
Scenario	Resolution
User loses phone	Guardian recovery
Both sender & receiver devices destroyed	Gossip redundancy + sync reconstruction
Double-spend attempt	AI conflict resolution
Collusion attempt	Anomaly detection
🛠 Tech Stack
Mobile App

React Native (Expo)

AsyncStorage / SQLite

UUID token simulation

Axios

Backend

FastAPI (Python)

Pydantic models

Rule-based AI logic (upgrade-ready)

AI Layer (MVP)

Risk scoring logic

Pattern detection rules

Spend Analyzer (categorization, trends, budgets)

Upgrade path to ML models

🚀 Getting Started
Clone Repository
git clone https://github.com/your-username/praharipay.git
cd praharipay

Mobile Setup
cd mobile
npm install
npx expo start

Backend Setup
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

🧪 Demo Flow

Enable Offline Mode

Make multiple transactions

Observe local ledger growth

Trigger Sync

View AI risk classification

Simulate conflict

View AI Spend Analyzer insights and category breakdown

Trigger guardian recovery

Restore wallet access

🔭 Future Roadmap

AI Spend Analyzer v2 — ML-based category prediction and personalized budget coaching

Real NFC pairing

BLE mesh gossip propagation

Blockchain smart contract wallet

Federated learning fraud models

On-device ML (TensorFlow Lite) for spend predictions

Zero-knowledge recovery proofs

🛡 Why PrahariPay?

Because finance should not collapse when networks do.

PrahariPay redefines digital trust by combining:

Offline-first design

AI intelligence

Social recovery

Distributed redundancy

Into a unified guardian architecture.

📜 License

MIT License

🤝 Contributing

Currently built as a solo project.
Future collaboration welcome for:

ML model upgrades

AI Spend Analyzer enhancements (NLP categorization, forecasting)

Cryptographic hardening

Mesh networking implementation

🌟 Tagline

PrahariPay — Your Intelligent Payment Guardian.
