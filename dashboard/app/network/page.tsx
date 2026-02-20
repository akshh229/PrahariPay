"use client";

import { useEffect, useState } from "react";
import {
  fetchGossipReconstruction,
  fetchGossipStats,
  fetchMerchantTransactions,
  submitGossip,
  type GossipStats,
} from "../services/api";

interface LogEntry {
  hash: string;
  time: string;
  method: string;
  nodeId: string;
  color: string;
}

const COLORS = ["#2a9d8f", "#37b37e", "#e56a00", "#f3c87a", "#ef8b2c"];

interface PeerNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  type: "gateway" | "standard" | "high-bandwidth" | "offline";
}

export default function NetworkPage() {
  const [stats, setStats] = useState<GossipStats | null>(null);
  const [showOffline, setShowOffline] = useState(true);
  const [viewMode, setViewMode] = useState<"live" | "historic">("live");
  const [merchantId] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("user_id")) || "merchant_001"
  );
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [recentTransactionIds, setRecentTransactionIds] = useState<string[]>([]);
  const [gossipStatus, setGossipStatus] = useState("");
  const [peers, setPeers] = useState<PeerNode[]>([
    { id: "gw", label: "You", x: 50, y: 50, size: 40, color: "#e56a00", type: "gateway" },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const statData = await fetchGossipStats();
        setStats(statData);

        const txs = await fetchMerchantTransactions(merchantId);
        const recentTxs = (txs || []).slice(0, 6);
        setRecentTransactionIds(recentTxs.map((tx) => tx.transaction_id));
        const recon = await Promise.all(
          recentTxs.map((tx) => fetchGossipReconstruction(tx.transaction_id))
        );

        const logs: LogEntry[] = recentTxs.map((tx, i) => {
          const reconstruction = recon[i];
          const hops = Number(reconstruction?.hops || 0);
          return {
            hash: `#${tx.transaction_id.slice(0, 8)}`,
            time: `${Math.max(1, Math.round((Date.now() - new Date(tx.timestamp).getTime()) / 1000))}s ago`,
            method: reconstruction ? `Gossip (${hops} hops)` : "Ledger Sync",
            nodeId: (reconstruction?.source_peer_id as string) || tx.sender_id,
            color: reconstruction ? "#3abff8" : "#64748b",
          };
        });
        setLogEntries(logs);

        const uniqueSenders = Array.from(new Set(recentTxs.map((tx) => tx.sender_id))).slice(0, 6);
        const dynamicPeers: PeerNode[] = uniqueSenders.map((sender, i) => {
          const angle = (i / Math.max(1, uniqueSenders.length)) * Math.PI * 2;
          const x = 50 + Math.cos(angle) * 28;
          const y = 50 + Math.sin(angle) * 28;
          return {
            id: `peer-${i}`,
            label: sender.slice(0, 6),
            x,
            y,
            size: 8 + (i % 3),
            color: COLORS[i % COLORS.length],
            type: i === 0 ? "high-bandwidth" : "standard",
          };
        });
        setPeers([
          { id: "gw", label: "You", x: 50, y: 50, size: 40, color: "#e56a00", type: "gateway" },
          ...dynamicPeers,
        ]);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [merchantId]);

  const filteredPeers = showOffline
    ? peers
    : peers.filter((p) => p.type !== "offline");

  const handleBroadcastGossip = async () => {
    const transactionId = recentTransactionIds[0];
    if (!transactionId) {
      setGossipStatus("No transaction available for gossip broadcast.");
      return;
    }

    try {
      await submitGossip({
        message_id: `msg-${Date.now()}`,
        transaction_id: transactionId,
        source_peer_id: merchantId,
        payload: { source: "dashboard", mode: viewMode },
        hops: 1,
      });
      setGossipStatus("Gossip broadcast submitted.");
    } catch {
      setGossipStatus("Failed to submit gossip broadcast.");
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-(--color-bg-app)">
      {/* Left Panel */}
      <aside className="w-96 border-r border-(--color-border-subtle) bg-(--color-bg-sidebar) flex flex-col overflow-y-auto flex-shrink-0">
        {/* Header */}
        <div className="px-5 py-4 border-b border-(--color-border-subtle)">
          <div className="flex items-center gap-2 text-xs text-(--color-text-secondary) mb-3">
            <span>Dashboard</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-(--color-text-primary)">Gossip Status</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Network Status</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e9f8ef] text-[#1f8d52] border border-[#caebd7] text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1f8d52] animate-pulse" />
              Live
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-5 space-y-3">
          <div className="pp-card rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-(--color-primary)">chat_bubble</span>
              <div>
                <p className="text-[10px] text-(--color-text-muted) uppercase tracking-wider">Gossip Messages</p>
                <p className="text-xl font-bold">{stats?.total_messages?.toLocaleString() || "0"}</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-[#ece5d8] rounded-full overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#1f8d52] to-[#37b37e]" />
            </div>
          </div>

          <div className="pp-card rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[#b56a00]">sync_alt</span>
              <div>
                <p className="text-[10px] text-(--color-text-muted) uppercase tracking-wider">Unique Txns Synced</p>
                <p className="text-xl font-bold">{stats?.unique_transactions || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#1f8d52]">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              +5% from previous
            </div>
          </div>

          <div className="pp-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#b56a00]">hub</span>
              <div>
                <p className="text-[10px] text-(--color-text-muted) uppercase tracking-wider">Active Peers</p>
                <p className="text-xl font-bold">{stats?.active_peers ?? stats?.unique_transactions ?? 0}</p>
              </div>
            </div>
            <p className="text-[10px] text-(--color-text-secondary) mt-2">
              Avg hops: {stats?.avg_hops?.toFixed(1) || "—"}
            </p>
          </div>
        </div>

        {/* Propagation Log */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold">Propagation Log</h3>
            <button className="text-[10px] text-(--color-primary) hover:underline">View All</button>
          </div>
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#ddd4c3]" />
            <div className="space-y-4">
              {logEntries.map((log, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 border-[#f6f4ee] flex-shrink-0 -ml-[7.5px] z-10"
                    style={{ backgroundColor: log.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-(--color-primary)">{log.hash}</span>
                      <span className="text-[10px] text-(--color-text-muted)">{log.time}</span>
                    </div>
                    <p className="text-[10px] text-(--color-text-secondary) mt-0.5">
                      {log.method} → Node {log.nodeId}
                    </p>
                  </div>
                </div>
              ))}
              {logEntries.length === 0 && (
                <p className="text-[10px] text-(--color-text-muted)">No reconstructed gossip entries yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Offline Resilience */}
        <div className="px-5 pb-5 mt-auto">
          <div className="rounded-xl border border-(--color-border-subtle) bg-(--color-bg-card) p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-(--color-primary) text-lg">offline_bolt</span>
            <div>
              <p className="text-xs font-semibold">Offline Resilience</p>
              <p className="text-[10px] text-(--color-text-secondary) mt-1 leading-relaxed">
                Gossip protocol ensures transactions propagate even without internet
                using BLE mesh and Wi-Fi Direct.
              </p>
              <button className="text-[10px] text-(--color-primary) mt-2 hover:underline flex items-center gap-1">
                Read Documentation
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Right: Network Visualization */}
      <div className="flex-1 relative bg-(--color-bg-app) overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(229,106,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(229,106,0,0.15) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Controls */}
        <div className="relative z-10 p-4 flex items-center justify-between max-w-[1200px] w-full mx-auto">
          <div className="flex bg-(--color-bg-card) rounded-lg border border-(--color-border-subtle) overflow-hidden">
            <button
              onClick={() => setViewMode("live")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "live"
                  ? "bg-[#f7e6d4] text-(--color-primary)"
                  : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
              }`}
            >
              Live View
            </button>
            <button
              onClick={() => setViewMode("historic")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "historic"
                  ? "bg-[#f7e6d4] text-(--color-primary)"
                  : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
              }`}
            >
              Historic Playback
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleBroadcastGossip}
              className="px-4 py-2 rounded-full pp-btn-primary text-xs font-semibold transition"
            >
              Broadcast Gossip
            </button>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] text-(--color-text-secondary)">Show Offline</span>
              <button
                onClick={() => setShowOffline(!showOffline)}
                className={`w-8 h-4 rounded-full transition-all flex items-center ${
                  showOffline ? "bg-(--color-primary) justify-end" : "bg-[#ccc3b3] justify-start"
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-white mx-0.5" />
              </button>
            </label>
          </div>
        </div>
        {gossipStatus && (
          <p className="relative z-10 px-4 max-w-[1200px] w-full mx-auto text-[10px] text-(--color-text-secondary)">{gossipStatus}</p>
        )}

        {/* Network Topology */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-[600px] h-[600px]">
            {/* Connection lines */}
            {filteredPeers
              .filter((p) => p.id !== "gw")
              .map((peer) => (
                <line
                  key={`line-${peer.id}`}
                  x1={50}
                  y1={50}
                  x2={peer.x}
                  y2={peer.y}
                  stroke={peer.type === "offline" ? "#334155" : peer.color}
                  strokeWidth="0.3"
                  strokeDasharray={peer.type === "offline" ? "1,1" : "0"}
                  opacity={peer.type === "offline" ? 0.4 : 0.6}
                />
              ))}

            {/* Peer nodes */}
            {filteredPeers.map((peer) => (
              <g key={peer.id}>
                {/* Ping animation for gateway */}
                {peer.type === "gateway" && (
                  <>
                    <circle cx={peer.x} cy={peer.y} r="6" fill="none" stroke="#e56a00" strokeWidth="0.3" opacity="0.2">
                      <animate attributeName="r" from="6" to="15" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.2" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={peer.x} cy={peer.y} r="6" fill="none" stroke="#e56a00" strokeWidth="0.3" opacity="0.2">
                      <animate attributeName="r" from="6" to="15" dur="2s" begin="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.2" to="0" dur="2s" begin="1s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
                {/* Node circle */}
                <circle
                  cx={peer.x}
                  cy={peer.y}
                  r={peer.size / 10}
                  fill={peer.color}
                  opacity={peer.type === "offline" ? 0.4 : 1}
                />
                {/* Label */}
                <text
                  x={peer.x}
                  y={peer.y + peer.size / 10 + 2.5}
                  textAnchor="middle"
                  fontSize="2"
                  fill={peer.type === "offline" ? "#9f9789" : "#6f6b62"}
                >
                  {peer.label}
                </text>
                {peer.type === "offline" && (
                  <text x={peer.x} y={peer.y - peer.size / 10 - 1.5} textAnchor="middle" fontSize="1.5" fill="#9f9789">
                    OFFLINE
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#fffdf9]/90 backdrop-blur-md rounded-xl border border-(--color-border-subtle) p-3 z-10">
          <p className="text-[10px] font-semibold text-(--color-text-primary) mb-2">Network Topology</p>
          <div className="space-y-1.5">
            {[
              { color: "#37b37e", label: "High Bandwidth" },
              { color: "#2a9d8f", label: "Standard" },
              { color: "#9f9789", label: "Offline" },
              { color: "#e56a00", label: "Active Stream" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-(--color-text-secondary)">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          {[
            { icon: "add", label: "Zoom in" },
            { icon: "remove", label: "Zoom out" },
            { icon: "my_location", label: "Center" },
          ].map((btn) => (
            <button
              key={btn.icon}
              title={btn.label}
              className="w-8 h-8 rounded-lg bg-(--color-bg-card) border border-(--color-border-subtle) flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-[#d6c7ab] transition"
            >
              <span className="material-symbols-outlined text-sm">{btn.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
