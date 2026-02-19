"use client";

import { useEffect, useState } from "react";
import {
  fetchAnomalies,
  fetchLedger,
  fetchMerchantTransactions,
  type AnomalyReport,
  type Transaction,
} from "../services/api";

const FILTERS = ["All", "Valid", "Suspicious", "Likely Fraud"];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [merchantId] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("user_id")) || "merchant_001"
  );
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);

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

  const filtered =
    filter === "All"
      ? transactions
      : transactions.filter((tx) => tx.classification === filter);

  const riskColor = (cls?: string) => {
    switch (cls) {
      case "Valid": return "risk-valid";
      case "Likely Honest Conflict": return "risk-honest";
      case "Suspicious": return "risk-suspicious";
      case "Likely Fraud": return "risk-fraud";
      default: return "bg-slate-700/50 text-slate-400";
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
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Transaction Risk Monitor</h1>
              <p className="text-xs text-slate-400 mt-1">
                Real-time AI fraud analysis • {transactions.length} transactions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {anomalies.length} anomalies (24h)
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Feed
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === f
                    ? "bg-[#3abff8]/20 text-[#3abff8] border border-[#3abff8]/30"
                    : "bg-[#1b2427] text-slate-400 border border-slate-800 hover:text-white"
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
            <thead className="bg-[#1b2427] sticky top-0 z-10">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Tx ID</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Sender</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Amount</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Time</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Risk</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((tx) => (
                <tr
                  key={tx.transaction_id}
                  onClick={() => setSelected(tx)}
                  className={`cursor-pointer hover:bg-[#27343a] transition ${
                    selected?.transaction_id === tx.transaction_id ? "bg-[#27343a]" : ""
                  }`}
                >
                  <td className="px-5 py-3 text-xs font-mono text-slate-400">
                    {tx.transaction_id.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-3 text-sm">{tx.sender_id}</td>
                  <td className="px-5 py-3 text-sm font-semibold">₹{tx.amount}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">
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
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
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
        <div className="w-96 border-l border-slate-800 bg-[#1b2427] overflow-y-auto flex-shrink-0">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Transaction Detail</h3>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Risk Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute w-32 h-32 rounded-full border-[6px] border-slate-800" />
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
              <p className="text-xs text-slate-400">{selected.classification}</p>
            </div>

            {/* AI Reasoning */}
            <div className="bg-[#111618] rounded-xl p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#3abff8] text-lg">psychology</span>
                <span className="text-xs font-semibold text-[#3abff8] uppercase tracking-wider">AI Analysis</span>
              </div>
              {parseFlags(selected.risk_flags).length > 0 ? (
                <ul className="space-y-2">
                  {parseFlags(selected.risk_flags).map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="material-symbols-outlined text-amber-400 text-sm mt-0.5">flag</span>
                      {flag.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No risk flags detected. Transaction appears clean.</p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">TX ID</span>
                <span className="font-mono text-xs">{selected.transaction_id.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sender</span>
                <span>{selected.sender_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Receiver</span>
                <span>{selected.receiver_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount</span>
                <span className="font-semibold">₹{selected.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Time</span>
                <span>{new Date(selected.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Synced</span>
                <span className={selected.synced ? "text-emerald-400" : "text-amber-400"}>
                  {selected.synced ? "Yes" : "Pending"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition">
                Mark Safe
              </button>
              <button className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition">
                Freeze Funds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
