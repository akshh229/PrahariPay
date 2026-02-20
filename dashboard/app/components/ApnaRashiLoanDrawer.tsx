"use client";

import { useMemo, useState } from "react";
import {
  applyLoanApnaRashi,
  ApplyLoanApnaRashiResponse,
  ConfidenceScoreResponse,
  LoanConfidenceBand,
} from "../services/api";

interface ApnaRashiLoanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  confidence: ConfidenceScoreResponse | null;
}

const tenorOptions = [3, 6, 9, 12];

function toLoanBand(confidence: ConfidenceScoreResponse | null): LoanConfidenceBand {
  if (!confidence || confidence.credit_score.is_insufficient_data) {
    return "INSUFFICIENT_DATA";
  }

  const rawBand = confidence.credit_score.band;
  if (rawBand === "Excellent" || rawBand === "Good") return "HIGH";
  if (rawBand === "Fair") return "MEDIUM";
  return "LOW";
}

function normalizeScore(score: number): number {
  const normalized = Math.round(((score - 300) / 600) * 100);
  return Math.max(0, Math.min(100, normalized));
}

export default function ApnaRashiLoanDrawer({
  isOpen,
  onClose,
  confidence,
}: ApnaRashiLoanDrawerProps) {
  const [requestedAmount, setRequestedAmount] = useState<string>("100000");
  const [requestedTenor, setRequestedTenor] = useState<number>(6);
  const [consent, setConsent] = useState(false);
  const [showSharedData, setShowSharedData] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ApplyLoanApnaRashiResponse | null>(null);

  const loanBand = useMemo(() => toLoanBand(confidence), [confidence]);
  const normalizedScore = useMemo(() => {
    if (!confidence || confidence.credit_score.is_insufficient_data) return 0;
    return normalizeScore(confidence.credit_score.score);
  }, [confidence]);

  const eligibilityText = useMemo(() => {
    if (loanBand === "HIGH") {
      return "You may be eligible for up to ₹1.5L short-term working capital from Apna Rashi Bank.";
    }
    if (loanBand === "MEDIUM") {
      return "You may be eligible for ₹50k - ₹1L short-term working capital from Apna Rashi Bank.";
    }
    if (loanBand === "LOW") {
      return "You may be eligible for up to ₹50k; approval and limits may be restricted.";
    }
    return "We need more transaction history before estimating a strong limit.";
  }, [loanBand]);

  const recommendationText = useMemo(() => {
    if (loanBand === "HIGH") return "You may be eligible for a higher limit and longer tenure.";
    if (loanBand === "MEDIUM") return "You may be eligible for a moderate loan amount.";
    if (loanBand === "LOW") return "You may still apply, but approval and limits may be restricted.";
    return "We need more history to give a strong recommendation.";
  }, [loanBand]);

  const factorRows = (confidence?.credit_score.factors || []).slice(0, 3);

  const closeAndReset = () => {
    setError("");
    setSubmitting(false);
    setShowSharedData(false);
    setConsent(false);
    setSuccess(null);
    onClose();
  };

  const handleSubmit = async () => {
    setError("");
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      setError("Enter a valid loan amount.");
      return;
    }
    if (!tenorOptions.includes(requestedTenor)) {
      setError("Choose a valid tenure option.");
      return;
    }
    if (!consent) {
      setError("Consent is required to continue.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await applyLoanApnaRashi({
        requested_amount: Number(requestedAmount),
        requested_tenor_months: requestedTenor,
        consent: true,
      });
      setSuccess(response);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to send application";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div className="h-full w-full max-w-xl bg-[var(--color-bg-card)] border-l border-[var(--color-border-subtle)] shadow-2xl overflow-y-auto">
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] sticky top-0 bg-[var(--color-bg-card)] z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Loan pre-check with Apna Rashi Bank</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                We’ll use your PrahariPay Confidence Score and recent cash flow to estimate eligibility. Final decisions are made by Apna Rashi Bank.
              </p>
            </div>
            <button
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              onClick={closeAndReset}
              aria-label="Close loan drawer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {success ? (
            <div className="pp-card rounded-xl p-4 border border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-semibold">Application sent to Apna Rashi Bank</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                You’ll receive an update inside PrahariPay and/or via SMS or email from Apna Rashi Bank.
              </p>
              <div className="mt-3 text-xs space-y-1">
                <p><span className="text-[var(--color-text-secondary)]">Application ID:</span> {success.application_id}</p>
                <p><span className="text-[var(--color-text-secondary)]">Status:</span> Pending bank review</p>
              </div>
              <button
                onClick={closeAndReset}
                className="mt-4 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <section className="pp-card rounded-xl p-4 border border-[var(--color-border-subtle)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Summary at a glance</h3>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Your PrahariPay Confidence Score</p>
                    <p className="text-3xl font-bold leading-none">{normalizedScore}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{loanBand.replace("_", " ")}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-secondary)]">
                    Partner: Apna Rashi Bank
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-3">{recommendationText}</p>
                <div className="mt-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] p-3">
                  <p className="text-xs">{eligibilityText}</p>
                </div>
              </section>

              <section className="pp-card rounded-xl p-4 border border-[var(--color-border-subtle)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Basic inputs</h3>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[11px] text-[var(--color-text-secondary)]">Business type</label>
                    <input
                      readOnly
                      value="Merchant"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--color-text-secondary)]">Desired loan amount</label>
                    <input
                      type="number"
                      min={1}
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--color-text-secondary)]">Desired tenure</label>
                    <select
                      value={requestedTenor}
                      onChange={(e) => setRequestedTenor(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-xs"
                    >
                      {tenorOptions.map((month) => (
                        <option key={month} value={month}>{month} months</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="pp-card rounded-xl p-4 border border-[var(--color-border-subtle)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Confidence & factors</h3>
                <div className="mt-3 space-y-2">
                  {factorRows.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No factor data yet.</p>
                  ) : (
                    factorRows.map((factor) => (
                      <div key={factor.name} className="rounded-lg border border-[var(--color-border-subtle)] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{factor.name}</p>
                          <span className={`text-[10px] ${factor.impact === "positive" ? "text-[#1f8d52]" : factor.impact === "negative" ? "text-[#b33636]" : "text-[var(--color-text-secondary)]"}`}>
                            {factor.impact}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{factor.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="pp-card rounded-xl p-4 border border-[var(--color-border-subtle)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Consent</h3>
                <label className="mt-3 flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I agree to share my PrahariPay transaction summary and Confidence Score with Apna Rashi Bank for this loan evaluation.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSharedData((prev) => !prev)}
                  className="mt-2 text-[11px] text-[var(--color-primary)] hover:underline"
                >
                  What data is shared?
                </button>
                {showSharedData && (
                  <ul className="mt-2 text-[11px] text-[var(--color-text-secondary)] list-disc pl-5 space-y-1">
                    <li>Aggregated cash-flow metrics</li>
                    <li>PrahariPay Confidence Score and band</li>
                    <li>Top confidence factors</li>
                    <li>No raw card numbers or sensitive card details</li>
                  </ul>
                )}
              </section>

              {error && (
                <div className="rounded-lg border border-[#efc2c2] bg-[#fff1f1] p-3 text-xs text-[#b33636]">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pb-2">
                <button
                  onClick={closeAndReset}
                  className="px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send application to Apna Rashi Bank"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}