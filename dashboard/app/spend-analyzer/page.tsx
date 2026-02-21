"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchConfidenceScore,
  fetchLedger,
  fetchProfile,
  fetchSpendAnalysis,
  fetchAIInsights,
  fetchSpendSummary,
  ConfidenceScoreResponse,
  seedDemoActivityForUser,
  AIInsight,
} from "../services/api";
import ConfidenceScoreCard from "../components/ConfidenceScoreCard";
import AIInsightsFeed from "../components/AIInsightsFeed";
import ApnaRashiLoanDrawer from "../components/ApnaRashiLoanDrawer";

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

interface TimeBucket {
  label: string;
  amount: number;
}

const buildSpendTimeSeries = (
  transactions: Array<{ sender_id: string; amount: number; timestamp: string }>,
  userId: string,
  period: "daily" | "weekly" | "monthly"
): TimeBucket[] => {
  const now = new Date();
  const nowMs = now.getTime();

  const cfg =
    period === "daily"
      ? { bucketCount: 6, totalMs: 24 * 60 * 60 * 1000 }
      : period === "weekly"
      ? { bucketCount: 7, totalMs: 7 * 24 * 60 * 60 * 1000 }
      : { bucketCount: 6, totalMs: 30 * 24 * 60 * 60 * 1000 };

  const startMs = nowMs - cfg.totalMs;
  const bucketMs = cfg.totalMs / cfg.bucketCount;

  const labels = Array.from({ length: cfg.bucketCount }, (_, i) => {
    const d = new Date(startMs + i * bucketMs);
    if (period === "daily") return `${d.getHours().toString().padStart(2, "0")}:00`;
    if (period === "weekly") return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });

  const amounts = new Array<number>(cfg.bucketCount).fill(0);

  transactions
    .filter((tx) => tx.sender_id === userId)
    .forEach((tx) => {
      const ts = new Date(tx.timestamp).getTime();
      if (!Number.isFinite(ts) || ts < startMs || ts > nowMs) return;
      const idx = Math.min(cfg.bucketCount - 1, Math.floor((ts - startMs) / bucketMs));
      amounts[idx] += Number(tx.amount || 0);
    });

  return labels.map((label, i) => ({ label, amount: amounts[i] }));
};

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: "#e56a00",
  TRANSPORT: "#f29c52",
  UTILITIES: "#f3c87a",
  ENTERTAINMENT: "#37b37e",
  HEALTH: "#2a9d8f",
  TRANSFER: "#ef8b2c",
  OTHER: "#a39b8b",
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
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<SpendSummary | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(true);
  const [insightsError, setInsightsError] = useState<boolean>(false);
  const [confidenceScore, setConfidenceScore] = useState<ConfidenceScoreResponse | null>(null);
  const [confidenceLoading, setConfidenceLoading] = useState<boolean>(true);
  const [confidenceAuthRequired, setConfidenceAuthRequired] = useState<boolean>(false);
  const [confidenceError, setConfidenceError] = useState<boolean>(false);
  const [loanDrawerOpen, setLoanDrawerOpen] = useState<boolean>(false);
  const [timeSeries, setTimeSeries] = useState<TimeBucket[]>([]);
  const [highlightSection, setHighlightSection] = useState<"spend" | "budget" | null>(null);
  const seedAttemptedRef = useRef<boolean>(false);
  const spendCardRef = useRef<HTMLDivElement | null>(null);
  const budgetCardRef = useRef<HTMLDivElement | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [budgets] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string>("merchant_001");

  useEffect(() => {
    const resolveUser = async () => {
      if (typeof window === "undefined") return;

      const localUserId = localStorage.getItem("user_id");
      const token = localStorage.getItem("access_token");

      if (token) {
        const profile = await fetchProfile();
        if (profile?.id) {
          localStorage.setItem("user_id", profile.id);
          setUserId(profile.id);
          return;
        }
      }

      if (localUserId) {
        setUserId(localUserId);
        return;
      }

      setUserId("merchant_001");
    };

    resolveUser();
  }, []);

  useEffect(() => {
    seedAttemptedRef.current = false;
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      try {
        setConfidenceLoading(true);
        setConfidenceAuthRequired(false);
        setConfidenceError(false);
        setInsightsLoading(true);
        setInsightsError(false);

        const analysis = await fetchSpendAnalysis(userId);
        if (analysis) {
          setSummary(analysis.summary);
        }

        const [sumData, confidenceData, insightsData, ledgerData] = await Promise.all([
          fetchSpendSummary(userId, period),
          fetchConfidenceScore(userId, 6),
          fetchAIInsights(userId, period),
          fetchLedger(userId),
        ]);

        let finalSummary = sumData || analysis?.summary || null;
        let finalConfidence = confidenceData;
        let finalInsights = insightsData;
        let finalLedger = ledgerData;

        const isSummaryEmpty = !finalSummary || finalSummary.total_amount <= 0;
        const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("access_token"));
        if (hasToken && isSummaryEmpty && !seedAttemptedRef.current) {
          const seedRes = await seedDemoActivityForUser(userId, 24);
          seedAttemptedRef.current = true;
          if (seedRes?.created_count && seedRes.created_count > 0) {
            const [seededSummary, seededConfidence, seededInsights, seededLedger] = await Promise.all([
              fetchSpendSummary(userId, period),
              fetchConfidenceScore(userId, 6),
              fetchAIInsights(userId, period),
              fetchLedger(userId),
            ]);
            finalSummary = seededSummary || finalSummary;
            finalConfidence = seededConfidence || finalConfidence;
            finalInsights = seededInsights || finalInsights;
            finalLedger = seededLedger || finalLedger;
          }
        }

        setSummary(finalSummary);
        setTimeSeries(buildSpendTimeSeries(finalLedger?.transactions || [], userId, period));
        setConfidenceScore(finalConfidence);
        setAiInsights(finalInsights?.insights ?? []);
        if (!finalConfidence) {
          setConfidenceError(true);
        }
        if (!finalInsights) {
          setInsightsError(true);
        }
      } catch (e) {
        console.error(e);
        setConfidenceError(true);
        setInsightsError(true);
      } finally {
        setConfidenceLoading(false);
        setInsightsLoading(false);
      }
    };
    load();
  }, [period, userId]);

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (!focus) return;

    const target =
      focus === "budget" || focus === "savings" || focus === "category_shift"
        ? "budget"
        : "spend";

    const element = target === "budget" ? budgetCardRef.current : spendCardRef.current;
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightSection(target);
      const timer = setTimeout(() => setHighlightSection(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const donutGradient = () => {
    if (!summary?.breakdown?.length) return "conic-gradient(#e9e3d7 0deg 360deg)";
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

  const breakdownCount = timeSeries.length;
  const maxSeriesAmount = Math.max(...timeSeries.map((point) => point.amount), 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Spend Insights</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              AI-driven analysis of your transaction flow
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period picker */}
            <div className="flex bg-[var(--color-bg-card)] rounded-full border border-[var(--color-border-subtle)] overflow-hidden">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition ${
                    period === p
                      ? "bg-[#f7e6d4] text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#d7b68d] text-[var(--color-primary)] text-xs font-semibold hover:bg-[#f8ecdf] transition">
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
            <div
              ref={spendCardRef}
              className={`pp-card rounded-2xl p-5 transition-all ${highlightSection === "spend" ? "ring-2 ring-[#e8c98a]" : ""}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Spend Over Time</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Total: ₹{summary?.total_amount?.toFixed(0) || "0"}
                    {summary?.trend_pct !== null && summary?.trend_pct !== undefined && (
                      <span className={`ml-2 ${summary.trend_pct < 0 ? "text-[#1f8d52]" : "text-[#b56a00]"}`}>
                        {summary.trend_pct > 0 ? "+" : ""}{summary.trend_pct.toFixed(1)}%
                      </span>
                    )}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">trending_up</span>
              </div>
              {/* Bar Chart */}
              <div
                className={`flex items-end gap-3 h-40 overflow-x-auto pb-1 ${
                  breakdownCount <= 2 ? "justify-center" : ""
                }`}
              >
                {timeSeries.map((point, i) => (
                  <div key={i} className="min-w-[72px] max-w-[96px] w-full flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[var(--color-text-secondary)]">₹{point.amount.toFixed(0)}</span>
                    <div
                      className="w-full rounded-t-md transition-all hover:scale-y-105 origin-bottom"
                      style={{
                        height: `${Math.max(8, maxSeriesAmount > 0 ? (point.amount / maxSeriesAmount) * 140 : 0)}px`,
                        backgroundColor: "#a39b8b",
                      }}
                    />
                    <span className="text-[9px] text-[var(--color-text-muted)] truncate w-full text-center">
                      {point.label}
                    </span>
                  </div>
                ))}
                {timeSeries.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
                    No spend data yet
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown + Budget Status */}
            <div className="grid grid-cols-2 gap-6">
              {/* Donut Chart */}
              <div
                ref={budgetCardRef}
                className={`pp-card rounded-2xl p-5 transition-all ${highlightSection === "budget" ? "ring-2 ring-[#e8c98a]" : ""}`}
              >
                <h3 className="text-sm font-semibold mb-4">Category Breakdown</h3>
                <div className="flex items-center gap-5">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <div
                      className="w-32 h-32 rounded-full"
                      style={{ background: donutGradient() }}
                    />
                    <div className="absolute inset-4 bg-[var(--color-bg-card)] rounded-full flex items-center justify-center border border-[var(--color-border-subtle)]">
                      <div className="text-center">
                        <p className="text-lg font-bold">₹{summary?.total_amount?.toFixed(0) || "0"}</p>
                        <p className="text-[10px] text-[var(--color-text-secondary)]">Total</p>
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
                        <span className="text-[var(--color-text-secondary)] flex-1 truncate">
                          {CATEGORY_LABELS[cat.category] || cat.category}
                        </span>
                        <span className="font-semibold">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Status */}
              <div className="pp-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Budget Status</h3>
                  <button className="text-[10px] text-[var(--color-primary)] hover:underline">Edit Limits</button>
                </div>
                <div className="space-y-4">
                  {(summary?.breakdown || []).slice(0, 4).map((cat, i) => {
                    const limit = budgets[cat.category] || cat.budget_limit || 5000;
                    const pct = Math.min(100, (cat.amount / limit) * 100);
                    const color =
                      pct > 90 ? "#b33636" : pct > 70 ? "#b56a00" : CATEGORY_COLORS[cat.category] || "#e56a00";
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--color-text-secondary)]">
                            {CATEGORY_LABELS[cat.category] || cat.category}
                          </span>
                          <span style={{ color }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#ece5d8] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!summary?.breakdown || summary.breakdown.length === 0) && (
                    <p className="text-xs text-[var(--color-text-muted)]">No budget data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Confidence Score */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <ConfidenceScoreCard
              data={confidenceScore}
              isLoading={confidenceLoading}
              authRequired={confidenceAuthRequired}
              hasError={confidenceError}
              onApplyLoan={() => setLoanDrawerOpen(true)}
            />
          </div>
        </div>

        {/* AI Insights Feed - full width grid */}
        <div className="mt-6">
          <AIInsightsFeed
            insights={aiInsights}
            isLoading={insightsLoading}
            hasError={insightsError}
          />
        </div>
      </div>

      <ApnaRashiLoanDrawer
        isOpen={loanDrawerOpen}
        onClose={() => setLoanDrawerOpen(false)}
        confidence={confidenceScore}
      />
    </div>
  );
}
