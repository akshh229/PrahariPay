import { ConfidenceScoreResponse } from "../services/api";

interface ConfidenceScoreCardProps {
  data: ConfidenceScoreResponse | null;
  isLoading: boolean;
  authRequired?: boolean;
  hasError?: boolean;
  onApplyLoan?: () => void;
}

export default function ConfidenceScoreCard({
  data,
  isLoading,
  authRequired = false,
  hasError = false,
  onApplyLoan,
}: ConfidenceScoreCardProps) {
  if (isLoading) {
    return (
      <div className="pp-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold">PrahariPay Confidence Score</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-2">Computing score from recent spend behavior…</p>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="pp-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">lock</span>
          <h3 className="text-sm font-semibold">PrahariPay Confidence Score</h3>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Sign in to view your lender confidence score.
        </p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="pp-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#b56a00] text-lg">warning</span>
          <h3 className="text-sm font-semibold">PrahariPay Confidence Score</h3>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Unable to load confidence score right now. Please try again.
        </p>
      </div>
    );
  }

  if (!data || data.credit_score.is_insufficient_data) {
    return (
      <div className="pp-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">insights</span>
          <h3 className="text-sm font-semibold">PrahariPay Confidence Score</h3>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Not enough transaction history yet. Keep using PrahariPay to unlock lender confidence insights.
        </p>
        {onApplyLoan && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
            <span className="inline-block text-[10px] px-2 py-1 rounded-full bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
              Powered by Apna Rashi Bank
            </span>
            <button
              onClick={onApplyLoan}
              className="w-full mt-3 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 transition"
            >
              Apply for a loan with Apna Rashi Bank
            </button>
          </div>
        )}
      </div>
    );
  }

  const score = data.credit_score.score;
  const band = data.credit_score.band;
  const bandClass =
    band === "Excellent"
      ? "text-[#1f8d52] border-[#1f8d5266] bg-[#1f8d5214]"
      : band === "Good"
        ? "text-[#2a9d8f] border-[#2a9d8f66] bg-[#2a9d8f14]"
        : band === "Fair"
          ? "text-[#b56a00] border-[#b56a0066] bg-[#b56a0014]"
          : "text-[#b33636] border-[#b3363666] bg-[#b3363614]";

  const scoreClass =
    band === "Excellent"
      ? "text-[#1f8d52]"
      : band === "Good"
        ? "text-[#2a9d8f]"
        : band === "Fair"
          ? "text-[#b56a00]"
          : "text-[#b33636]";

  return (
    <div className="pp-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">PrahariPay Confidence Score</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Lender-facing risk confidence</p>
        </div>
        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border ${bandClass}`}>
          {band}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className={`text-3xl font-bold leading-none ${scoreClass}`}>{score}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Range 300 - 900</p>
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] text-right">
          Recommended Limit: ₹{(data.credit_score.recommended_limit || 0).toFixed(0)}
        </p>
      </div>

      <p className="text-xs text-[var(--color-text-secondary)] mt-3 leading-relaxed">{data.credit_score.summary}</p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <MetricChip label="On-time" value={`${data.credit_score.on_time_payment_ratio.toFixed(0)}%`} />
        <MetricChip label="Utilization" value={`${data.credit_score.utilization_pct.toFixed(0)}%`} />
        <MetricChip label="Income Stability" value={`${data.credit_score.income_stability_ratio.toFixed(0)}%`} />
        <MetricChip label="Savings Buffer" value={`${data.credit_score.savings_buffer_ratio.toFixed(0)}%`} />
      </div>

      <div className="mt-4 space-y-2">
        {data.credit_score.factors.slice(0, 3).map((factor) => (
          <div key={factor.name} className="border border-[var(--color-border-subtle)] rounded-lg p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold">{factor.name}</p>
              <span className="text-[10px] text-[var(--color-text-secondary)]">{factor.score}/100</span>
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">{factor.description}</p>
          </div>
        ))}
      </div>

      {onApplyLoan && (
        <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
          <span className="inline-block text-[10px] px-2 py-1 rounded-full bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
            Powered by Apna Rashi Bank
          </span>
          <button
            onClick={onApplyLoan}
            className="w-full mt-3 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:opacity-90 transition"
          >
            Apply for a loan with Apna Rashi Bank
          </button>
        </div>
      )}
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2.5 py-2">
      <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
      <p className="text-xs font-semibold mt-0.5">{value}</p>
    </div>
  );
}
