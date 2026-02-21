"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchAnomalies,
  fetchLedger,
  fetchProfile,
  fetchMerchantTransactions,
  type AnomalyReport,
  type Transaction,
} from "../services/api";

const FILTERS = ["All", "Valid", "Suspicious", "Likely Fraud"];

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterOverride, setFilterOverride] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [merchantId, setMerchantId] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("user_id")) || "merchant_001"
  );
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);

  useEffect(() => {
    const resolveUser = async () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("access_token");
      const localUserId = localStorage.getItem("user_id");

      if (token) {
        const profile = await fetchProfile();
        if (profile?.id) {
          localStorage.setItem("user_id", profile.id);
          setMerchantId(profile.id);
          return;
        }
      }

      if (localUserId) {
        setMerchantId(localUserId);
        return;
      }

      setMerchantId("merchant_001");
    };

    resolveUser();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [merchantTxs, ledger] = await Promise.all([
          fetchMerchantTransactions(merchantId),
          fetchLedger(merchantId),
        ]);
        const merged = [...(merchantTxs || []), ...(ledger?.transactions || [])];
        const unique = Array.from(
          new Map(merged.map((tx) => [tx.transaction_id, tx])).values()
        );
        setTransactions(unique);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [merchantId]);

  useEffect(() => {
    const loadAnomalies = async () => {
      const data = await fetchAnomalies(24);
      setAnomalies(data || []);
    };
    loadAnomalies();
  }, []);

  const focus = searchParams.get("focus");
  const focusFilter =
    focus === "anomaly" || focus === "prediction"
      ? "Suspicious"
      : focus === "positive"
      ? "Valid"
      : "All";

  const activeFilter = filterOverride || focusFilter;

  const filtered =
    activeFilter === "All"
      ? transactions
      : transactions.filter((tx) => tx.classification === activeFilter);

  const riskColor = (cls?: string) => {
    switch (cls) {
      case "Valid": return "risk-valid";
      case "Likely Honest Conflict": return "risk-honest";
      case "Suspicious": return "risk-suspicious";
      case "Likely Fraud": return "risk-fraud";
      default: return "bg-[#efebe2] text-[var(--color-text-secondary)]";
    }
  };

  const riskGaugeColor = (score: number) => {
    if (score < 0.3) return "#10b981";
    if (score < 0.6) return "#fbbf24";
    if (score < 0.8) return "#f97316";
    return "#ef4444";
  };

  const parseFlags = (flags?: string | string[]): string[] => {
    if (!flags) return [];
    if (Array.isArray(flags)) return flags;
    try { return JSON.parse(flags); } catch { return []; }
  };

  return (
    <div className="flex h-full">
      {/* Main table area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Transaction Risk Monitor</h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Real-time AI fraud analysis • {transactions.length} transactions
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                Viewing account: {merchantId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fff6e8] text-[#b56a00] text-xs border border-[#f2e2bf]">
                <span className="w-2 h-2 rounded-full bg-[#b56a00] animate-pulse" />
                {anomalies.length} anomalies (24h)
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e9f8ef] text-[#1f8d52] text-xs border border-[#caebd7]">
                <span className="w-2 h-2 rounded-full bg-[#1f8d52] animate-pulse" />
                Live Feed
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilterOverride(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeFilter === f
                    ? "bg-[var(--color-primary)] text-white border border-[var(--color-primary)]"
                    : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-[#ece7db] sticky top-0 z-10">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Tx ID</th>
                <th className="text-left px-5 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Sender</th>
                <th className="text-left px-5 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Amount</th>
                <th className="text-left px-5 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Time</th>
                <th className="text-left px-5 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Risk</th>
                <th className="text-left px-5 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-card)]">
              {filtered.map((tx) => (
                <tr
                  key={tx.transaction_id}
                  onClick={() => setSelected(tx)}
                  className={`cursor-pointer hover:bg-[#f8f4ec] transition ${
                    selected?.transaction_id === tx.transaction_id ? "bg-[#f8f4ec]" : ""
                  }`}
                >
                  <td className="px-5 py-3 text-xs font-mono text-[var(--color-text-secondary)]">
                    {tx.transaction_id.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-3 text-sm">{tx.sender_id}</td>
                  <td className="px-5 py-3 text-sm font-semibold">₹{tx.amount}</td>
                  <td className="px-5 py-3 text-xs text-[var(--color-text-secondary)]">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold" style={{ color: riskGaugeColor(tx.risk_score || 0) }}>
                      {((tx.risk_score || 0) * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${riskColor(tx.classification)}`}>
                      {tx.classification || "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--color-text-muted)] text-sm">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Inspector Panel */}
      {selected && (
        <div className="w-96 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] overflow-y-auto flex-shrink-0">
          <div className="p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h3 className="font-semibold text-sm">Transaction Detail</h3>
            <button onClick={() => setSelected(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Risk Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute w-32 h-32 rounded-full border-[6px] border-[#e7e0d1]" />
                <div
                  className="absolute w-32 h-32 rounded-full border-[6px] border-transparent"
                  style={{
                    borderTopColor: riskGaugeColor(selected.risk_score || 0),
                    borderRightColor: (selected.risk_score || 0) > 0.25 ? riskGaugeColor(selected.risk_score || 0) : "transparent",
                    borderBottomColor: (selected.risk_score || 0) > 0.5 ? riskGaugeColor(selected.risk_score || 0) : "transparent",
                    borderLeftColor: (selected.risk_score || 0) > 0.75 ? riskGaugeColor(selected.risk_score || 0) : "transparent",
                    transform: `rotate(${-90 + (selected.risk_score || 0) * 180}deg)`,
                  }}
                />
              </div>
              <p className="text-2xl font-bold mt-2" style={{ color: riskGaugeColor(selected.risk_score || 0) }}>
                {((selected.risk_score || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">{selected.classification}</p>
            </div>

            {/* AI Reasoning */}
            <div className="bg-[#f8f4ec] rounded-xl p-4 border border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">psychology</span>
                <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">AI Analysis</span>
              </div>
              {parseFlags(selected.risk_flags).length > 0 ? (
                <ul className="space-y-2">
                  {parseFlags(selected.risk_flags).map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                      <span className="material-symbols-outlined text-[#b56a00] text-sm mt-0.5">flag</span>
                      {flag.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--color-text-secondary)]">No risk flags detected. Transaction appears clean.</p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">TX ID</span>
                <span className="font-mono text-xs">{selected.transaction_id.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Sender</span>
                <span>{selected.sender_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Receiver</span>
                <span>{selected.receiver_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Amount</span>
                <span className="font-semibold">₹{selected.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Time</span>
                <span>{new Date(selected.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Synced</span>
                <span className={selected.synced ? "text-[#1f8d52]" : "text-[#b56a00]"}>
                  {selected.synced ? "Yes" : "Pending"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 py-2.5 rounded-lg bg-[#e9f8ef] text-[#1f8d52] border border-[#caebd7] text-xs font-semibold hover:bg-[#dcf4e5] transition">
                Mark Safe
              </button>
              <button className="flex-1 py-2.5 rounded-lg bg-[#fdecec] text-[#b33636] border border-[#f2cdcd] text-xs font-semibold hover:bg-[#f9dddd] transition">
                Freeze Funds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
