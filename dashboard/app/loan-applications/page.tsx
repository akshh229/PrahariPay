"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchLoanApplications,
  simulateApnaRashiStatusUpdate,
  type LoanApplicationListItem,
} from "../services/api";

const statusPillClass = (status: LoanApplicationListItem["status"]) => {
  switch (status) {
    case "APPROVED":
      return "bg-[#e9f8ef] text-[#1f8d52] border-[#caebd7]";
    case "REJECTED":
      return "bg-[#fdecec] text-[#b33636] border-[#f2cdcd]";
    case "CANCELLED":
      return "bg-[#efebe2] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]";
    default:
      return "bg-[#fff6e8] text-[#b56a00] border-[#f2e2bf]";
  }
};

const bandClass = (band: LoanApplicationListItem["confidence_band"]) => {
  switch (band) {
    case "HIGH":
      return "text-[#1f8d52]";
    case "MEDIUM":
      return "text-[#b56a00]";
    case "LOW":
      return "text-[#b33636]";
    default:
      return "text-[var(--color-text-muted)]";
  }
};

export default function LoanApplicationsPage() {
  const [items, setItems] = useState<LoanApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<LoanApplicationListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string>("");
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setBusy(true);

    setError(false);
    const data = await fetchLoanApplications();
    if (!data) {
      setError(true);
      setLoading(false);
      setBusy(false);
      return;
    }
    setItems(data.applications || []);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
    setBusy(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(false), 15000);
    return () => clearInterval(interval);
  }, [load]);

  const copyApplicationId = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.application_id);
      setActionMessage("Application ID copied.");
    } catch {
      setActionMessage("Could not copy automatically. Please copy manually.");
    }
  };

  const exportSummary = () => {
    if (!selected) return;
    const lines = [
      "PrahariPay Loan Application Summary",
      "",
      `Application ID: ${selected.application_id}`,
      `Partner: ${selected.partner}`,
      `Status: ${selected.status}`,
      `Requested Amount: ₹${selected.requested_amount.toLocaleString()}`,
      `Requested Tenure: ${selected.requested_tenor_months} months`,
      `Confidence Score: ${selected.confidence_score}`,
      `Confidence Band: ${selected.confidence_band}`,
      `Submitted: ${selected.created_at ? new Date(selected.created_at).toLocaleString() : "-"}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-application-${selected.application_id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setActionMessage("Application summary exported.");
  };

  const simulateStatusChange = async (
    status: LoanApplicationListItem["status"],
  ) => {
    if (!selected) return;
    try {
      setSimulating(true);
      await simulateApnaRashiStatusUpdate({
        application_id: selected.application_id,
        status,
      });
      setSelected((prev) => (prev ? { ...prev, status } : prev));
      await load(false);
      setActionMessage(`Status updated to ${status.replace("_", " ")}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to simulate status update";
      setActionMessage(msg);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-6 py-4 border-b border-(--color-border-subtle) bg-(--color-bg-app)">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Loan Applications</h1>
            <p className="text-xs text-(--color-text-secondary) mt-1">
              Track your Apna Rashi Bank loan applications and review status updates.
            </p>
            {lastUpdated && (
              <p className="text-[10px] text-(--color-text-muted) mt-1">Last updated: {lastUpdated}</p>
            )}
          </div>
          <button
            onClick={() => load(false)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-(--color-border-subtle) text-xs font-semibold text-(--color-text-secondary) hover:text-(--color-text-primary)"
          >
            {busy ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="pp-card rounded-2xl p-5 text-sm text-(--color-text-secondary)">
            Loading applications...
          </div>
        ) : error ? (
          <div className="pp-card rounded-2xl p-5 text-sm text-[#b33636]">
            Unable to load loan applications right now.
          </div>
        ) : items.length === 0 ? (
          <div className="pp-card rounded-2xl p-6 text-center">
            <span className="material-symbols-outlined text-3xl text-(--color-text-muted)">receipt_long</span>
            <p className="text-sm font-semibold mt-2">No applications yet</p>
            <p className="text-xs text-(--color-text-secondary) mt-1">
              Start from Spend Insights to apply for a loan with Apna Rashi Bank.
            </p>
          </div>
        ) : (
          <div className="pp-card rounded-2xl overflow-hidden border border-(--color-border-subtle)">
            <table className="w-full">
              <thead className="bg-[#ece7db]">
                <tr>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-(--color-text-muted)">Application</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-(--color-text-muted)">Amount</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-(--color-text-muted)">Tenure</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-(--color-text-muted)">Confidence</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-(--color-text-muted)">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-(--color-text-muted)">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border-subtle) bg-(--color-bg-card)">
                {items.map((item) => (
                  <tr
                    key={item.application_id}
                    onClick={() => setSelected(item)}
                    className={`hover:bg-[#f8f4ec] transition cursor-pointer ${selected?.application_id === item.application_id ? "bg-[#f8f4ec]" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <p className="text-xs font-mono">{item.application_id.slice(0, 8)}...</p>
                      <p className="text-[10px] text-(--color-text-secondary)">{item.partner}</p>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold">₹{item.requested_amount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm">{item.requested_tenor_months} months</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold">{item.confidence_score}</p>
                      <p className={`text-[10px] font-semibold ${bandClass(item.confidence_band)}`}>{item.confidence_band}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusPillClass(item.status)}`}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-(--color-text-secondary)">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {selected && (
        <aside className="w-96 border-l border-(--color-border-subtle) bg-(--color-bg-card) overflow-y-auto shrink-0">
          <div className="p-5 border-b border-(--color-border-subtle) flex items-center justify-between">
            <h3 className="font-semibold text-sm">Application Detail</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-(--color-text-muted) hover:text-(--color-text-primary)"
              aria-label="Close application detail"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="pp-card rounded-xl p-4 border border-(--color-border-subtle)">
              <p className="text-[10px] uppercase tracking-wider text-(--color-text-muted)">Status</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusPillClass(selected.status)}`}>
                  {selected.status.replace("_", " ")}
                </span>
                <span className="text-[10px] text-(--color-text-secondary)">
                  {selected.created_at ? new Date(selected.created_at).toLocaleString() : "-"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-(--color-text-secondary)">Application ID</span>
                <span className="font-mono text-xs">{selected.application_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-(--color-text-secondary)">Partner</span>
                <span>{selected.partner}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-(--color-text-secondary)">Requested amount</span>
                <span className="font-semibold">₹{selected.requested_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-(--color-text-secondary)">Tenure</span>
                <span>{selected.requested_tenor_months} months</span>
              </div>
            </div>

            <div className="pp-card rounded-xl p-4 border border-(--color-border-subtle)">
              <p className="text-[10px] uppercase tracking-wider text-(--color-text-muted)">Confidence snapshot</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-2xl font-bold leading-none">{selected.confidence_score}</p>
                <p className={`text-xs font-semibold ${bandClass(selected.confidence_band)}`}>
                  {selected.confidence_band}
                </p>
              </div>
              <p className="text-[11px] text-(--color-text-secondary) mt-2">
                Confidence values are captured at submission time for bank underwriting review.
              </p>
            </div>

            <div className="pp-card rounded-xl p-4 border border-(--color-border-subtle)">
              <p className="text-[10px] uppercase tracking-wider text-(--color-text-muted)">Quick actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={copyApplicationId}
                  className="px-3 py-1.5 rounded-lg border border-(--color-border-subtle) text-xs font-semibold"
                >
                  Copy Application ID
                </button>
                <button
                  onClick={exportSummary}
                  className="px-3 py-1.5 rounded-lg bg-(--color-primary) text-white text-xs font-semibold"
                >
                  Export Summary
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-(--color-border-subtle)">
                <p className="text-[10px] uppercase tracking-wider text-(--color-text-muted)">Dev simulator</p>
                <p className="text-[11px] text-(--color-text-secondary) mt-1">
                  Simulate Apna Rashi callback status updates for demos.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => simulateStatusChange("PENDING_BANK")}
                    disabled={simulating}
                    className="px-2.5 py-1 rounded-md border border-(--color-border-subtle) text-[10px] font-semibold disabled:opacity-60"
                  >
                    Set Pending
                  </button>
                  <button
                    onClick={() => simulateStatusChange("APPROVED")}
                    disabled={simulating}
                    className="px-2.5 py-1 rounded-md bg-[#1f8d52] text-white text-[10px] font-semibold disabled:opacity-60"
                  >
                    Set Approved
                  </button>
                  <button
                    onClick={() => simulateStatusChange("REJECTED")}
                    disabled={simulating}
                    className="px-2.5 py-1 rounded-md bg-[#b33636] text-white text-[10px] font-semibold disabled:opacity-60"
                  >
                    Set Rejected
                  </button>
                </div>
              </div>
              {actionMessage && (
                <p className="text-[11px] text-(--color-text-secondary) mt-2">{actionMessage}</p>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
