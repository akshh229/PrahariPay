"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAnomalies,
  fetchMerchantSummary,
  fetchMerchantTransactions,
  fetchTrustScore,
  syncTransactions,
  type SyncTransactionPayload,
} from "./services/api";

interface MerchantSummary {
  total_transactions: number;
  total_amount: number;
  flagged_transactions: number;
}

interface RecentTx {
  transaction_id: string;
  sender_id: string;
  amount: number;
  timestamp: string;
  classification?: string;
  risk_score?: number;
}

export default function DashboardHome() {
  const [summary, setSummary] = useState<MerchantSummary | null>(null);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const [merchantId, setMerchantId] = useState("merchant_001");
  const [trustScore, setTrustScore] = useState(98);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) setMerchantId(storedId);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryData, transactionsData, trustAdjustment, anomalies] = await Promise.all([
          fetchMerchantSummary(merchantId),
          fetchMerchantTransactions(merchantId),
          fetchTrustScore(merchantId),
          fetchAnomalies(24),
        ]);

        setSummary(summaryData);
        setRecentTxs((transactionsData || []).slice(0, 5));
        setAnomalyCount((anomalies || []).length);
        const computedTrust = Math.max(
          0,
          Math.min(100, Math.round(98 + (trustAdjustment ?? 0) * 100))
        );
        setTrustScore(computedTrust);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [merchantId]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const pendingRaw = localStorage.getItem("pending_transactions");
      const pending = pendingRaw ? (JSON.parse(pendingRaw) as SyncTransactionPayload[]) : [];
      const result = await syncTransactions(pending);
      setSyncMessage(`Synced ${result.results?.length || 0} transaction(s)`);
      localStorage.removeItem("pending_transactions");
    } catch {
      setSyncMessage("Sync failed. Check payload format or backend status.");
    } finally {
      setSyncing(false);
    }
  };

  const riskBadge = (cls?: string) => {
    const map: Record<string, string> = {
      Valid: "risk-valid",
      "Likely Honest Conflict": "risk-honest",
      Suspicious: "risk-suspicious",
      "Likely Fraud": "risk-fraud",
    };
    return map[cls || ""] || "bg-[#efebe2] text-[var(--color-text-secondary)]";
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Merchant Hub</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Welcome back, {merchantId}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e9f8ef] text-[#1f8d52] text-xs font-medium border border-[#cdecd8]">
            <span className="w-2 h-2 rounded-full bg-[#1f8d52] animate-pulse" />
            AI Guard Active
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f3f1ea] text-[var(--color-text-secondary)] text-xs font-medium border border-[var(--color-border-subtle)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
            {anomalyCount} anomaly alerts
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-full pp-btn-primary text-xs font-semibold transition disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>
      {syncMessage && <p className="text-xs text-[var(--color-text-secondary)]">{syncMessage}</p>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pp-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-[#f7e6d4] flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--color-primary)]">account_balance_wallet</span>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Balance</span>
          </div>
          <p className="text-2xl font-bold">₹{summary?.total_amount?.toLocaleString() || "0"}</p>
        </div>

        <div className="pp-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-[#e9f8ef] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#1f8d52]">trending_up</span>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Transactions</span>
          </div>
          <p className="text-2xl font-bold">{summary?.total_transactions || 0}</p>
        </div>

        <div className="pp-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-[#fff6e8] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#b56a00]">warning</span>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">Flagged</span>
          </div>
          <p className="text-2xl font-bold text-[#b56a00]">{summary?.flagged_transactions || 0}</p>
        </div>

        <Link
          href="/generate-qr"
          className="pp-card-muted rounded-2xl p-5 hover:border-[#d5c8af] transition group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-[#fff] border border-[var(--color-border-subtle)] flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--color-primary)]">qr_code_2</span>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-medium">Quick Action</span>
          </div>
          <p className="text-lg font-semibold text-[var(--color-primary)] group-hover:underline">Receive Payment →</p>
        </Link>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 pp-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
            <h2 className="font-semibold text-sm">Recent Transactions</h2>
            <Link href="/transactions" className="text-xs text-[var(--color-primary)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {recentTxs.length === 0 ? (
              <p className="p-5 text-sm text-[var(--color-text-muted)] text-center">No transactions yet</p>
            ) : (
              recentTxs.map((tx) => (
                <div key={tx.transaction_id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#f8f4ec] transition">
                  <div className="h-9 w-9 rounded-full bg-[#f7e6d4] flex items-center justify-center text-[var(--color-primary)] text-sm font-bold">
                    {tx.sender_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.sender_id}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">₹{tx.amount}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${riskBadge(tx.classification)}`}>
                    {tx.classification || "Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links Panel */}
        <div className="space-y-4">
          <div className="pp-card rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Quick Links</h3>
            <div className="space-y-2">
              {[
                { href: "/spend-analyzer", icon: "analytics", label: "AI Spend Analyzer", color: "text-[#b56a00]" },
                { href: "/network", icon: "hub", label: "Gossip Network", color: "text-[#1f8d52]" },
                { href: "/recovery", icon: "shield", label: "Recovery Center", color: "text-[#b33636]" },
                { href: "/guardians", icon: "group", label: "Manage Guardians", color: "text-[var(--color-primary)]" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f8f4ec] transition"
                >
                  <span className={`material-symbols-outlined text-xl ${item.color}`}>{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                  <span className="material-symbols-outlined text-[var(--color-text-muted)] ml-auto text-lg">chevron_right</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Trust Score */}
          <div className="pp-card rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3">Trust Score</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-[#1f8d52]">{trustScore}%</span>
              <span className="text-xs text-[var(--color-text-muted)] pb-1">Excellent</span>
            </div>
            <div className="w-full h-2 bg-[#efe8db] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#1f8d52] to-[var(--color-primary)] rounded-full" style={{ width: `${trustScore}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
