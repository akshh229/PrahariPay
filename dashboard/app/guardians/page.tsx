"use client";

import { useEffect, useState } from "react";
import { fetchGuardians, registerGuardians } from "../services/api";

interface Guardian {
  guardian_id: string;
  guardian_name?: string;
  status: string;
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [newGuardianId, setNewGuardianId] = useState("");
  const [error, setError] = useState("");

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    return "Failed to register guardian";
  };

  useEffect(() => {
    loadGuardians();
  }, []);

  const loadGuardians = async () => {
    try {
      const data = await fetchGuardians();
      setGuardians(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!newGuardianId.trim()) return;
    setError("");
    try {
      await registerGuardians([newGuardianId.trim()]);
      setNewGuardianId("");
      setShowRegister(false);
      await loadGuardians();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  };

  const activeCount = guardians.filter((g) => g.status === "active").length;
  const totalCount = guardians.length;

  const renderStars = (status: string) => {
    const score = status === "active" ? 4 : 0;
    if (score === 0) return <span className="text-[10px] text-slate-500">Not Applicable</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className={`material-symbols-outlined text-sm ${s <= score ? "text-[#3abff8]" : "text-slate-700"}`}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Social Recovery Guardians</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System Online
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage your trusted guardians under the{" "}
              <span className="text-[#3abff8] cursor-help border-b border-dotted border-[#3abff8]">
                3-of-5 threshold model
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1b2427] text-slate-300 text-xs border border-slate-800 hover:border-slate-700 transition">
              <span className="material-symbols-outlined text-sm">history</span>
              Activity Log
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3abff8] text-[#111618] text-xs font-bold hover:bg-[#3abff8]/90 transition shadow-lg shadow-[#3abff8]/20"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Register Guardian
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Security Level */}
          <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5 relative overflow-hidden">
            <span className="material-symbols-outlined absolute right-3 top-3 text-5xl text-white/5">security</span>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Security Level</p>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xl font-bold">Strong</p>
              <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-emerald-500 to-[#3abff8]" />
            </div>
          </div>

          {/* Active Guardians */}
          <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5 relative overflow-hidden">
            <span className="material-symbols-outlined absolute right-3 top-3 text-5xl text-white/5">groups</span>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Active Guardians</p>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-xl font-bold">{activeCount}</p>
              <p className="text-xs text-slate-400">/ {totalCount} Registered</p>
            </div>
            <div className="flex gap-1">
              {guardians.map((g, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${
                    g.status === "active" ? "bg-[#3abff8]" : "bg-[#27343a]"
                  }`}
                />
              ))}
              <div className="flex-1 h-1.5 rounded-full bg-[#27343a]" />
            </div>
          </div>

          {/* Recovery Threshold */}
          <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5 relative overflow-hidden">
            <span className="material-symbols-outlined absolute right-3 top-3 text-5xl text-white/5">key</span>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recovery Threshold</p>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xl font-bold">3 of 5</p>
              <span className="px-2 py-0.5 rounded-full bg-[#3abff8]/10 text-[#3abff8] text-[10px] font-semibold">
                STANDARD
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Minimum guardians needed to restore access.</p>
          </div>
        </div>

        {/* Guardians Table */}
        <div className="bg-[#1b2427] rounded-xl border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold">Registered Guardians</h3>
            <div className="flex gap-1.5">
              <button className="w-8 h-8 rounded-lg bg-[#111618] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition">
                <span className="material-symbols-outlined text-sm">filter_list</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-[#111618] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition">
                <span className="material-symbols-outlined text-sm">sort</span>
              </button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-[#111618]">
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Guardian</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">ID</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Trust Score</th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">Loading guardians...</td></tr>
              ) : guardians.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">No guardians registered yet</td></tr>
              ) : guardians.map((g) => (
                <tr
                  key={g.guardian_id}
                  className={`hover:bg-[#27343a] transition ${g.status !== "active" ? "opacity-75" : ""}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3abff8] to-purple-600 flex items-center justify-center text-sm font-bold">
                        {(g.guardian_name || g.guardian_id).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{g.guardian_name || g.guardian_id}</p>
                        <p className="text-[10px] text-slate-400">Guardian</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono text-slate-400">{g.guardian_id.slice(0, 12)}...</span>
                  </td>
                  <td className="px-5 py-4">{renderStars(g.status)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        g.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {g.status === "active" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      {g.status.charAt(0).toUpperCase() + g.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="text-slate-600 hover:text-slate-400 transition">
                      <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
            <span className="text-[10px] text-slate-500">
              Showing 1-{guardians.length} of {guardians.length} guardians
            </span>
            <div className="flex gap-1">
              <button disabled className="px-3 py-1 rounded text-[10px] bg-[#111618] text-slate-600 border border-slate-800">
                Previous
              </button>
              <button disabled className="px-3 py-1 rounded text-[10px] bg-[#111618] text-slate-600 border border-slate-800">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Offline Footer */}
        <div className="flex items-center gap-3 text-slate-500 text-xs opacity-50">
          <span className="material-symbols-outlined text-sm">wifi_off</span>
          Offline-First Protocol Active. Changes sync automatically when online.
        </div>
      </div>

      {/* Register Guardian Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1b2427] rounded-2xl border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Register Guardian</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the user ID of the person you want to add as a trusted guardian.
            </p>
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}
            <input
              type="text"
              value={newGuardianId}
              onChange={(e) => setNewGuardianId(e.target.value)}
              placeholder="Guardian User ID"
              className="w-full px-4 py-3 rounded-xl bg-[#111618] border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-[#3abff8] text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRegister(false); setError(""); }}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-[#27343a] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                className="flex-1 py-2.5 rounded-lg bg-[#3abff8] text-[#111618] text-xs font-bold hover:bg-[#3abff8]/90 transition"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
