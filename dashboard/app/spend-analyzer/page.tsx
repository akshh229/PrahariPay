"use client";

import { useEffect, useState } from "react";
import {
  fetchSpendAnalysis,
  fetchSpendAlerts,
  fetchSpendSummary,
} from "../services/api";

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  budget_limit?: number | null;
}

interface SpendSummary {
  period: string;
  total_amount: number;
  currency: string;
  trend_pct: number;
  trend_direction: string;
  breakdown: CategoryBreakdown[];
}

interface SpendAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  created_at: string;
  category?: string;
}

interface InsightCard {
  type: "anomaly" | "forecast" | "positive" | "recurring" | "info";
  title: string;
  message: string;
  icon: string;
  color: string;
  borderColor: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: "#3abff8",
  TRANSPORT: "#f87171",
  UTILITIES: "#fbbf24",
  ENTERTAINMENT: "#a78bfa",
  HEALTH: "#34d399",
  TRANSFER: "#fb923c",
  OTHER: "#64748b",
};

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Food & Inventory",
  TRANSPORT: "Transport",
  UTILITIES: "Utilities",
  ENTERTAINMENT: "Entertainment",
  HEALTH: "Health",
  TRANSFER: "Transfers",
  OTHER: "Other",
};

export default function SpendAnalyzerPage() {
  const [summary, setSummary] = useState<SpendSummary | null>(null);
  const [alerts, setAlerts] = useState<SpendAlert[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [budgets] = useState<Record<string, number>>({});
  const [userId] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("user_id")) || "merchant_001"
  );

  useEffect(() => {
    const load = async () => {
      try {
        const analysis = await fetchSpendAnalysis(userId);
        if (analysis) {
          setSummary(analysis.summary);
          setAlerts(Array.isArray(analysis.alerts) ? analysis.alerts : []);
        }

        const [sumData, alertData] = await Promise.all([
          fetchSpendSummary(userId, period),
          fetchSpendAlerts(userId),
        ]);
        setSummary(sumData || analysis?.summary || null);
        setAlerts(Array.isArray(alertData) ? alertData : analysis?.alerts || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [period, userId]);

  const generateInsights = (): InsightCard[] => {
    const insights: InsightCard[] = [];

    alerts.forEach((alert) => {
      if (alert.severity === "high") {
        insights.push({
          type: "anomaly",
          title: "Budget Exceeded",
          message: alert.message,
          icon: "warning",
          color: "rose-500",
          borderColor: "border-l-rose-500",
        });
      } else {
        insights.push({
          type: "forecast",
          title: "Budget Warning",
          message: alert.message,
          icon: "data_usage",
          color: "amber-500",
          borderColor: "border-l-amber-500",
        });
      }
    });

    if (summary && summary.trend_pct !== null) {
      insights.push({
        type: summary.trend_pct < 0 ? "positive" : "forecast",
        title: summary.trend_pct < 0 ? "Spending Down" : "Spend Trend",
        message: `Overall spending ${summary.trend_pct < 0 ? "decreased" : "increased"} by ${Math.abs(summary.trend_pct).toFixed(1)}% compared to the previous period.`,
        icon: summary.trend_pct < 0 ? "trending_down" : "trending_up",
        color: summary.trend_pct < 0 ? "[#3abff8]" : "amber-500",
        borderColor: summary.trend_pct < 0 ? "border-l-[#3abff8]" : "border-l-amber-500",
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "info",
        title: "All Clear",
        message: "No anomalies detected. Your spending is within normal patterns.",
        icon: "check_circle",
        color: "emerald-500",
        borderColor: "border-l-emerald-500",
      });
    }

    return insights;
  };

  const donutGradient = () => {
    if (!summary?.breakdown?.length) return "conic-gradient(#1b2427 0deg 360deg)";
    let deg = 0;
    const stops: string[] = [];
    summary.breakdown.forEach((cat) => {
      const color = CATEGORY_COLORS[cat.category] || "#64748b";
      const slice = (cat.percentage / 100) * 360;
      stops.push(`${color} ${deg}deg ${deg + slice}deg`);
      deg += slice;
    });
    return `conic-gradient(${stops.join(", ")})`;
  };

  const insights = generateInsights();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">AI Spend Analyzer</h1>
            <p className="text-xs text-slate-400 mt-1">
              AI-powered insights into your spending patterns
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period picker */}
            <div className="flex bg-[#1b2427] rounded-lg border border-slate-800 overflow-hidden">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition ${
                    period === p
                      ? "bg-[#3abff8]/20 text-[#3abff8]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3abff8]/10 text-[#3abff8] text-xs font-semibold hover:bg-[#3abff8]/20 transition">
              <span className="material-symbols-outlined text-sm">download</span>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Charts */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Spend Over Time */}
            <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Spend Over Time</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total: ₹{summary?.total_amount?.toFixed(0) || "0"}
                    {summary?.trend_pct !== null && summary?.trend_pct !== undefined && (
                      <span className={`ml-2 ${summary.trend_pct < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {summary.trend_pct > 0 ? "+" : ""}{summary.trend_pct.toFixed(1)}%
                      </span>
                    )}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[#3abff8] text-lg">trending_up</span>
              </div>
              {/* Bar Chart */}
              <div className="flex items-end gap-2 h-40">
                {(summary?.breakdown || []).map((cat, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400">₹{cat.amount.toFixed(0)}</span>
                    <div
                      className="w-full rounded-t-md transition-all hover:scale-y-110 origin-bottom"
                      style={{
                        height: `${Math.max(8, (cat.percentage / 100) * 140)}px`,
                        backgroundColor: CATEGORY_COLORS[cat.category] || "#64748b",
                      }}
                    />
                    <span className="text-[9px] text-slate-500 truncate w-full text-center">
                      {(CATEGORY_LABELS[cat.category] || cat.category).slice(0, 6)}
                    </span>
                  </div>
                ))}
                {(!summary?.breakdown || summary.breakdown.length === 0) && (
                  <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                    No spend data yet
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown + Budget Status */}
            <div className="grid grid-cols-2 gap-6">
              {/* Donut Chart */}
              <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5">
                <h3 className="text-sm font-semibold mb-4">Category Breakdown</h3>
                <div className="flex items-center gap-5">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <div
                      className="w-32 h-32 rounded-full"
                      style={{ background: donutGradient() }}
                    />
                    <div className="absolute inset-4 bg-[#1b2427] rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-lg font-bold">₹{summary?.total_amount?.toFixed(0) || "0"}</p>
                        <p className="text-[10px] text-slate-400">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {(summary?.breakdown || []).map((cat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[cat.category] || "#64748b" }}
                        />
                        <span className="text-slate-400 flex-1 truncate">
                          {CATEGORY_LABELS[cat.category] || cat.category}
                        </span>
                        <span className="font-semibold">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Status */}
              <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Budget Status</h3>
                  <button className="text-[10px] text-[#3abff8] hover:underline">Edit Limits</button>
                </div>
                <div className="space-y-4">
                  {(summary?.breakdown || []).slice(0, 4).map((cat, i) => {
                    const limit = budgets[cat.category] || cat.budget_limit || 5000;
                    const pct = Math.min(100, (cat.amount / limit) * 100);
                    const color =
                      pct > 90 ? "#ef4444" : pct > 70 ? "#fbbf24" : CATEGORY_COLORS[cat.category] || "#3abff8";
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">
                            {CATEGORY_LABELS[cat.category] || cat.category}
                          </span>
                          <span style={{ color }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!summary?.breakdown || summary.breakdown.length === 0) && (
                    <p className="text-xs text-slate-500">No budget data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column - AI Insights Feed */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#3abff8] text-lg">auto_awesome</span>
              <h3 className="text-sm font-semibold">AI Insights Feed</h3>
            </div>
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`bg-[#1b2427] rounded-xl border border-slate-800 border-l-2 ${insight.borderColor} p-4 transition hover:border-slate-700`}
                style={{ opacity: i >= 4 ? 0.7 : 1 }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-${insight.color}/10 flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-${insight.color} text-lg`}>
                      {insight.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold">{insight.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{insight.message}</p>
                    {insight.type === "anomaly" && (
                      <div className="flex gap-2 mt-3">
                        <button className="px-3 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[10px] font-semibold hover:bg-rose-500/20 transition">
                          Action Required
                        </button>
                        <button className="px-3 py-1 rounded-md text-slate-400 text-[10px] hover:text-white transition">
                          Ignore
                        </button>
                      </div>
                    )}
                    {insight.type === "forecast" && (
                      <button className="mt-2 text-[10px] text-[#3abff8] hover:underline">
                        View Details →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
