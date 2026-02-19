"use client";

import { useEffect, useState } from "react";
import {
  fetchMerchantSummary,
  fetchMerchantTransactions,
  type MerchantSummary,
  type Transaction,
} from "../services/api";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<MerchantSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantId] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("user_id")) || "merchant_001"
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryData, transactionsData] = await Promise.all([
          fetchMerchantSummary(merchantId),
          fetchMerchantTransactions(merchantId),
        ]);
        setSummary(summaryData);
        setTransactions(transactionsData || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [merchantId]);

  // Build risk distribution from transactions (backend doesn't return risk_summary)
  const exportCSV = () => {
    if (transactions.length === 0) return;
    const header = "Transaction ID,Sender,Receiver,Amount,Timestamp,Risk Score,Classification,Synced\n";
    const rows = transactions.map((t) =>
      `${t.transaction_id},${t.sender_id},${t.receiver_id},${t.amount},${t.timestamp},${t.risk_score ?? ""},${t.classification ?? ""},${t.synced}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "praharipay_analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskDistribution: Record<string, number> = {};
  transactions.forEach((tx) => {
    const cls = tx.classification || "Unknown";
    riskDistribution[cls] = (riskDistribution[cls] || 0) + 1;
  });
  const totalCount = Object.values(riskDistribution).reduce((a, b) => a + b, 0) || 1;

  const riskColors: Record<string, string> = {
    Valid: "#10b981",
    "Likely Honest Conflict": "#3abff8",
    Suspicious: "#fbbf24",
    "Likely Fraud": "#f87171",
  };

  // SVG donut data
  const donutSegments = Object.entries(riskDistribution).map(([label, count]) => ({
    label,
    count: count as number,
    pct: ((count as number) / totalCount) * 100,
    color: riskColors[label] || "#64748b",
  }));

  let cumulativeOffset = 0;
  const donutPaths = donutSegments.map((seg) => {
    const offset = cumulativeOffset;
    cumulativeOffset += seg.pct;
    return { ...seg, offset };
  });

  // Sparkline data from recent transactions
  const sparklinePoints = transactions
    .slice(-20)
    .map((tx, i) => ({ x: i * (400 / 20), y: 120 - Math.min(120, tx.amount / 50) }));

  const sparklinePath =
    sparklinePoints.length > 1
      ? `M ${sparklinePoints.map((p) => `${p.x},${p.y}`).join(" L ")}`
      : "";

  const recentTx = transactions.slice(-6).reverse();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Analytics Summary</h1>
            <p className="text-xs text-slate-400 mt-1">
              Performance metrics and risk classification overview
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3abff8]/10 text-[#3abff8] text-xs font-semibold hover:bg-[#3abff8]/20 transition"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export Report
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#3abff8]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#3abff8]">payments</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Volume</p>
                <p className="text-xl font-bold">₹{summary?.total_amount?.toLocaleString() || "0"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              vs previous period
            </div>
          </div>

          <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-400">receipt_long</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Transactions</p>
                <p className="text-xl font-bold">{summary?.total_transactions || 0}</p>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {transactions.filter((t) => t.synced).length} synced online
            </div>
          </div>

          <div className="bg-[#1b2427] rounded-xl border border-red-500/20 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-400">gpp_maybe</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Flagged Risks</p>
                <p className="text-xl font-bold text-red-400">{summary?.flagged_transactions || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs text-red-400">Action Required</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-12 gap-6">
          {/* Transaction Volume Line Chart */}
          <div className="col-span-12 lg:col-span-8 bg-[#1b2427] rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Transaction Volume</h3>
              <span className="material-symbols-outlined text-slate-500 text-lg">more_vert</span>
            </div>
            <div className="h-36">
              {sparklinePath ? (
                <svg viewBox="0 0 400 130" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3abff8" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3abff8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d={`${sparklinePath} L ${sparklinePoints[sparklinePoints.length - 1]?.x},130 L 0,130 Z`}
                    fill="url(#lineGrad)"
                  />
                  {/* Line */}
                  <path d={sparklinePath} fill="none" stroke="#3abff8" strokeWidth="2" />
                  {/* Dots */}
                  {sparklinePoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#3abff8" opacity="0.8" />
                  ))}
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  No transaction data yet
                </div>
              )}
            </div>
          </div>

          {/* AI Guardian Insights */}
          <div className="col-span-12 lg:col-span-4 bg-[#1b2427] rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#3abff8] text-lg">auto_awesome</span>
              <h3 className="text-sm font-semibold">AI Guardian Insights</h3>
            </div>
            <div className="space-y-3">
              {(summary?.flagged_transactions || 0) > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <span className="material-symbols-outlined text-amber-400 text-lg">warning</span>
                  <div>
                    <p className="text-xs font-semibold">Risk Detected</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {summary?.flagged_transactions} transactions flagged for review
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <span className="material-symbols-outlined text-emerald-400 text-lg">sync_saved_locally</span>
                <div>
                  <p className="text-xs font-semibold">Sync Status</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {transactions.filter((t) => t.synced).length} of {transactions.length} transactions synced
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#3abff8]/5 border border-[#3abff8]/10">
                <span className="material-symbols-outlined text-[#3abff8] text-lg">query_stats</span>
                <div>
                  <p className="text-xs font-semibold">Spend Analysis</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Volume trending normally across categories
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-12 gap-6">
          {/* Risk Classification Donut */}
          <div className="col-span-12 lg:col-span-4 bg-[#1b2427] rounded-xl border border-slate-800 p-5">
            <h3 className="text-sm font-semibold mb-4">Risk Classification</h3>
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg width="160" height="160" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                  {donutPaths.map((seg, i) => (
                    <circle
                      key={i}
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="3"
                      strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                      strokeDashoffset={`${-seg.offset}`}
                      transform="rotate(-90 18 18)"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xl font-bold">{totalCount}</p>
                    <p className="text-[10px] text-slate-400">Total</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                {donutSegments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-slate-400">{seg.label}</span>
                    <span className="font-semibold ml-auto">{seg.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="col-span-12 lg:col-span-8 bg-[#1b2427] rounded-xl border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold">Recent Transactions</h3>
              <a href="/transactions" className="text-[10px] text-[#3abff8] hover:underline">View All →</a>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-[#111618]">
                  <th className="text-left px-5 py-2 text-[10px] text-slate-500 uppercase tracking-wider">TX ID</th>
                  <th className="text-left px-5 py-2 text-[10px] text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-2 text-[10px] text-slate-500 uppercase tracking-wider">Sender</th>
                  <th className="text-left px-5 py-2 text-[10px] text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentTx.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-[#27343a] transition">
                    <td className="px-5 py-3 text-xs font-mono text-slate-400">
                      #{tx.transaction_id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold">₹{tx.amount}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{tx.sender_id}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.classification === "Valid"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : tx.classification === "Suspicious"
                            ? "bg-amber-500/10 text-amber-400"
                            : tx.classification === "Likely Fraud"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-slate-700/50 text-slate-400"
                        }`}
                      >
                        {tx.classification || "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="material-symbols-outlined text-slate-600 text-lg cursor-pointer hover:text-slate-400">
                        more_vert
                      </span>
                    </td>
                  </tr>
                ))}
                {recentTx.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-sm text-slate-500">
                      No transactions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
