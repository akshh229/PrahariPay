"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AIInsight, AIInsightSeverity, AIInsightType } from "../services/api";

/* ── colour / style mapping ──────────────────────────────────────── */
const SEVERITY_STYLES: Record<
  AIInsightSeverity,
  { color: string; bg: string; border: string }
> = {
  high: { color: "#b33636", bg: "#fdecec", border: "#e8a0a0" },
  medium: { color: "#b56a00", bg: "#fff5e6", border: "#e8c98a" },
  low: { color: "#4a7c59", bg: "#eaf5ed", border: "#b3d4be" },
  info: { color: "#1f8d52", bg: "#eaf5ed", border: "#b3d4be" },
};

const TYPE_DEFAULTS: Record<AIInsightType, { icon: string; label: string }> = {
  anomaly: { icon: "warning", label: "Anomaly" },
  budget: { icon: "account_balance_wallet", label: "Budget" },
  prediction: { icon: "speed", label: "Forecast" },
  positive: { icon: "thumb_up", label: "Positive" },
  recurring: { icon: "autorenew", label: "Recurring" },
  savings: { icon: "savings", label: "Savings" },
  category_shift: { icon: "swap_horiz", label: "Category" },
  trend: { icon: "trending_up", label: "Trend" },
};

/* ── component ───────────────────────────────────────────────────── */
interface AIInsightsFeedProps {
  insights: AIInsight[];
  isLoading: boolean;
  hasError?: boolean;
}

export default function AIInsightsFeed({
  insights,
  isLoading,
  hasError = false,
}: AIInsightsFeedProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = insights.filter((i) => !dismissed.has(i.id));

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set(prev).add(id));

  const reviewInsight = (insight: AIInsight) => {
    const params = new URLSearchParams();
    params.set("focus", insight.type);
    if (insight.category) {
      params.set("category", insight.category);
    }

    if (insight.type === "budget" || insight.type === "savings" || insight.type === "category_shift") {
      router.push(`/spend-analyzer?${params.toString()}`);
      return;
    }

    router.push(`/transactions?${params.toString()}`);
  };

  /* ── loading skeleton ──────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="pp-card rounded-xl p-4 animate-pulse space-y-2"
            >
              <div className="h-3 w-24 bg-[#e9e3d7] rounded" />
              <div className="h-2 w-full bg-[#e9e3d7] rounded" />
              <div className="h-2 w-3/4 bg-[#e9e3d7] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── error state ───────────────────────────────────────────────── */
  if (hasError) {
    return (
      <div>
        <Header />
        <div className="pp-card rounded-xl p-4 text-center text-xs text-[var(--color-text-muted)] mt-3">
          <span className="material-symbols-outlined text-2xl block mb-1 text-[var(--color-text-muted)]">
            cloud_off
          </span>
          Unable to load insights right now. Try refreshing.
        </div>
      </div>
    );
  }

  /* ── empty state ───────────────────────────────────────────────── */
  if (visible.length === 0 && insights.length === 0) {
    return (
      <div>
        <Header />
        <div className="pp-card rounded-xl p-5 text-center mt-3">
          <span className="material-symbols-outlined text-3xl text-[#1f8d52] block mb-1">
            check_circle
          </span>
          <p className="text-xs font-semibold">All Clear</p>
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
            No anomalies detected. Your spending looks healthy.
          </p>
        </div>
      </div>
    );
  }

  /* ── all-dismissed state ──────────────────────────────────────── */
  if (visible.length === 0) {
    return (
      <div>
        <Header count={insights.length} dismissedCount={dismissed.size} />
        <div className="pp-card rounded-xl p-4 text-center text-xs text-[var(--color-text-muted)] mt-3">
          All insights dismissed.{" "}
          <button
            onClick={() => setDismissed(new Set())}
            className="text-[var(--color-primary)] hover:underline ml-1"
          >
            Undo all
          </button>
        </div>
      </div>
    );
  }

  /* ── main feed ─────────────────────────────────────────────────── */
  return (
    <div>
      <Header count={visible.length} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
      {visible.map((insight) => {
        const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
        const iconName =
          insight.icon || TYPE_DEFAULTS[insight.type]?.icon || "info";

        return (
          <div
            key={insight.id}
            className="pp-card rounded-xl p-4 transition-all group"
            style={{ borderLeft: `3px solid ${style.border}` }}
          >
            <div className="flex items-start gap-3">
              {/* icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: style.bg }}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ color: style.color }}
                >
                  {iconName}
                </span>
              </div>

              {/* body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold">{insight.title}</h4>
                  <TypeBadge type={insight.type} />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  {insight.message}
                </p>

                {/* percentage chip */}
                {insight.pct_change != null && (
                  <span
                    className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: insight.pct_change < 0 ? "#1f8d52" : "#b56a00",
                      backgroundColor:
                        insight.pct_change < 0 ? "#eaf5ed" : "#fff5e6",
                    }}
                  >
                    {insight.pct_change > 0 ? "+" : ""}
                    {insight.pct_change.toFixed(1)}%
                  </span>
                )}

                {/* action buttons */}
                <div className="flex items-center gap-2 mt-2">
                  {insight.actionable && (
                    <button
                      onClick={() => reviewInsight(insight)}
                      className="px-3 py-1 rounded-md text-[10px] font-semibold transition"
                      style={{
                        backgroundColor: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      Review
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(insight.id)}
                    className="px-3 py-1 rounded-md text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────────── */

function Header({
  count,
  dismissedCount,
}: {
  count?: number;
  dismissedCount?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">
        auto_awesome
      </span>
      <h3 className="text-sm font-semibold">AI Insights Feed</h3>
      {count != null && (
        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
          {count} insight{count !== 1 ? "s" : ""}
          {dismissedCount ? ` · ${dismissedCount} dismissed` : ""}
        </span>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: AIInsightType }) {
  const def = TYPE_DEFAULTS[type];
  if (!def) return null;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f0ebe3] text-[var(--color-text-muted)] font-medium">
      {def.label}
    </span>
  );
}
