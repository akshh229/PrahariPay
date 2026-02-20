"use client";

import { useEffect, useState } from "react";
import {
  approveRecovery,
  fetchPendingRecoveries,
  fetchRecoveryStatus,
  requestRecovery,
} from "../services/api";

interface RecoveryRequest {
  recovery_id: string;
  user_id: string;
  status: string;
  approvals: number;
  required_approvals: number;
  created_at: string;
  expires_at?: string;
}

export default function RecoveryPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [recoveryUserId, setRecoveryUserId] = useState("");
  const [newPublicKey, setNewPublicKey] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) setRecoveryUserId(storedUserId);
    loadRecoveries();
  }, []);

  const loadRecoveries = async () => {
    try {
      const pending = await fetchPendingRecoveries();
      setRequests(pending || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (recoveryId: string) => {
    setSelectedRequest(recoveryId);
    setShowModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedRequest || !pin) return;
    try {
      await approveRecovery(selectedRequest);
      await fetchRecoveryStatus(selectedRequest);
      setShowModal(false);
      setPin("");
      await loadRecoveries();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInitiateRecovery = async () => {
    if (!recoveryUserId.trim()) return;
    try {
      const result = await requestRecovery(
        recoveryUserId.trim(),
        newPublicKey.trim() || undefined
      );
      setRecoveryMessage(`Recovery initiated: ${result.recovery_id}`);
      await loadRecoveries();
    } catch {
      setRecoveryMessage("Failed to initiate recovery request.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-(--color-border-subtle) bg-(--color-bg-app)">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Security Recovery Center</h1>
            <p className="text-xs text-(--color-text-secondary) mt-1">
              Security recovery center for your service and guardian approvals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--color-bg-card) text-(--color-text-secondary) text-xs border border-(--color-border-subtle) hover:text-(--color-text-primary) transition">
              <span className="material-symbols-outlined text-sm">history</span>
              Audit Log
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Account Health */}
          <div className="col-span-12 lg:col-span-5 space-y-5">
            <div className="pp-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Initiate Recovery</h3>
                <span className="text-[10px] text-(--color-primary)">Live Endpoint</span>
              </div>
              <div className="space-y-3">
                <input
                  value={recoveryUserId}
                  onChange={(e) => setRecoveryUserId(e.target.value)}
                  placeholder="User ID"
                  className="w-full px-3 py-2 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-xs text-(--color-text-primary)"
                />
                <input
                  value={newPublicKey}
                  onChange={(e) => setNewPublicKey(e.target.value)}
                  placeholder="New public key (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-xs text-(--color-text-primary)"
                />
                <button
                  onClick={handleInitiateRecovery}
                  className="w-full py-2.5 rounded-lg pp-btn-primary text-xs font-bold transition"
                >
                  Request Recovery
                </button>
                {recoveryMessage && (
                  <p className="text-[10px] text-(--color-text-secondary)">{recoveryMessage}</p>
                )}
              </div>
            </div>

            {/* Account Health Card */}
            <div className="pp-card rounded-2xl p-6 relative overflow-hidden">
              <span className="material-symbols-outlined absolute right-4 top-4 text-7xl text-[#cfc7b6]/40">gpp_good</span>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                <span className="text-sm font-semibold text-emerald-400">Secure</span>
              </div>

              {/* Health Ring */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <svg width="140" height="140" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e7e0d1" strokeWidth="2.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="#e56a00"
                      strokeWidth="2.5"
                      strokeDasharray="98 2"
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                      style={{ filter: "drop-shadow(0 0 4px rgba(229,106,0,0.35))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">98%</p>
                      <p className="text-[10px] text-(--color-text-secondary)">Health Score</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f8f4ec] rounded-lg p-3 text-center border border-(--color-border-subtle)">
                  <p className="text-[10px] text-(--color-text-muted) uppercase">Guardians Active</p>
                  <p className="text-lg font-bold mt-1">3<span className="text-(--color-text-muted) text-sm">/5</span></p>
                </div>
                <div className="bg-[#f8f4ec] rounded-lg p-3 text-center border border-(--color-border-subtle)">
                  <p className="text-[10px] text-(--color-text-muted) uppercase">Last Backup</p>
                  <p className="text-lg font-bold mt-1">2h <span className="text-(--color-text-muted) text-sm">ago</span></p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-(--color-border-subtle)">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1f8d52] animate-pulse" />
                  <span className="text-[10px] text-(--color-text-secondary)">Guardian network online</span>
                </div>
                <a href="/guardians" className="text-[10px] text-(--color-primary) hover:underline flex items-center gap-1">
                  Manage Guardians
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </a>
              </div>
            </div>

            {/* History Log */}
            <div className="pp-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">History Log</h3>
                <button className="w-7 h-7 rounded-md bg-[#f8f4ec] border border-(--color-border-subtle) flex items-center justify-center hover:border-[#d6c7ab] transition">
                  <span className="material-symbols-outlined text-(--color-primary) text-sm">add</span>
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle)">
                  <span className="material-symbols-outlined text-(--color-primary) text-lg">lock_reset</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Password Reset</p>
                    <p className="text-[10px] text-(--color-text-secondary)">Nov 12, 2023</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                    Resolved
                  </span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) opacity-60">
                  <span className="material-symbols-outlined text-(--color-text-muted) text-lg">phonelink_lock</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">Device Auth</p>
                    <p className="text-[10px] text-(--color-text-secondary)">Oct 05, 2023</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#efebe2] text-(--color-text-secondary)">
                    Archived
                  </span>
                </div>
              </div>
              <button className="w-full mt-4 py-2 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) transition">
                View Full Registry
              </button>
            </div>
          </div>

          {/* Right Column - Pending Approvals */}
          <div className="col-span-12 lg:col-span-7">
            <div className="pp-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-(--color-border-subtle)">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold">Pending Approvals</h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#f7e6d4] text-(--color-primary) text-[10px] font-bold">
                        {requests.length} REQ
                      </span>
                    </div>
                    <p className="text-[10px] text-(--color-text-secondary) mt-1">
                      Requests where you are listed as a trusted Guardian
                    </p>
                  </div>
                  <button className="w-8 h-8 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) flex items-center justify-center">
                    <span className="material-symbols-outlined text-(--color-text-secondary) text-sm">filter_list</span>
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {loading ? (
                  <p className="text-sm text-(--color-text-muted) text-center py-8">Loading recovery requests...</p>
                ) : requests.length === 0 ? (
                  <p className="text-sm text-(--color-text-muted) text-center py-8">No pending recovery requests</p>
                ) : requests.map((req) => (
                  <div
                    key={req.recovery_id}
                    className="rounded-xl border overflow-hidden transition border-[#e3d5be] bg-[#fffdf9]"
                  >
                    <div className="flex">
                      <div className="w-1 bg-gradient-to-b from-[#e56a00] to-[#cf5f00] rounded-l flex-shrink-0" />
                      <div className="flex-1 p-4">
                        {/* User info row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#f7e6d4] text-(--color-primary) flex items-center justify-center text-sm font-bold">
                              {req.user_id.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{req.user_id}</p>
                              <p className="text-[10px] text-(--color-text-secondary)">Recovery Request</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#b56a00]">Action Required</span>
                        </div>

                        {/* Request details */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] text-(--color-text-muted)">Status</p>
                            <p className="text-xs font-semibold mt-0.5">{req.status}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-(--color-text-muted)">Approvals</p>
                            <p className="text-xs font-mono mt-0.5">{req.approvals}/{req.required_approvals}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-(--color-text-muted)">Created</p>
                            <p className="text-xs mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                          <button className="flex-1 py-2.5 rounded-lg border border-[#f2cdcd] bg-[#fdecec] text-[#b33636] text-xs font-semibold transition">
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(req.recovery_id)}
                            className="flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition pp-btn-primary"
                          >
                            <span className="material-symbols-outlined text-sm">fingerprint</span>
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Identity Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-(--color-bg-card) rounded-2xl border border-(--color-border-subtle) w-full max-w-md p-6">
            <div className="flex flex-col items-center mb-5">
              <span className="material-symbols-outlined text-amber-400 text-4xl mb-3">gpp_maybe</span>
              <h3 className="text-lg font-bold">Confirm Identity</h3>
              <p className="text-xs text-(--color-text-secondary) mt-1 text-center">
                Verify your identity to approve this recovery request
              </p>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <p className="text-[10px] text-red-400 leading-relaxed">
                <strong>Liability Warning:</strong> By approving, you confirm the requester&apos;s
                identity and accept responsibility under the guardian protocol.
              </p>
            </div>

            <div className="mb-5">
              <label className="text-xs text-(--color-text-secondary) block mb-2">Guardian PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                className="w-full text-center text-2xl tracking-[0.8em] py-3 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-(--color-text-primary)
                  focus:border-[#d7b68d] focus:ring-1 focus:ring-[#f4dfc4] outline-none"
                placeholder="••••••"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setPin(""); }}
                className="flex-1 py-2.5 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-(--color-text-secondary) text-xs font-semibold hover:text-(--color-text-primary) transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproval}
                disabled={!pin}
                className="flex-1 py-2.5 rounded-lg pp-btn-primary text-xs font-bold transition disabled:opacity-50"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
