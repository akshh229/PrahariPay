"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchProfile, fetchTrustScore, generateKeys, type UserProfile } from "../services/api";

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`w-10 h-5 rounded-full transition-all flex items-center ${
        enabled ? "bg-(--color-primary) justify-end" : "bg-[#ccc3b3] justify-start"
      }`}
    >
      <div className="w-4 h-4 rounded-full bg-white mx-0.5" />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [offlineTransacting, setOfflineTransacting] = useState(true);
  const [aiFraudDetection, setAiFraudDetection] = useState(true);
  const [autoSettlement, setAutoSettlement] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [notificationLevel, setNotificationLevel] = useState("critical");
  const [showKey, setShowKey] = useState(false);
  const [username, setUsername] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("username")) || "Merchant"
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trustAdjustment, setTrustAdjustment] = useState<number>(0);
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<string>("");

  useEffect(() => {
    const loadProfile = async () => {
      const profileData = await fetchProfile();
      if (!profileData) return;
      setProfile(profileData);
      setUsername(profileData.username);
      const adjustment = await fetchTrustScore(profileData.id);
      setTrustAdjustment(adjustment ?? 0);
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    router.push("/login");
  };

  const publicKey = profile?.public_key || "No public key generated";
  const trustScore = Math.max(
    0,
    Math.min(100, Math.round((profile?.trust_score ?? 50) + trustAdjustment * 100))
  );

  const handleRotateKeys = async () => {
    try {
      const result = await generateKeys();
      setGeneratedPrivateKey(result.private_key);
      setProfile((prev) => (prev ? { ...prev, public_key: result.public_key } : prev));
      setShowKey(true);
      setKeyStatus("Keys rotated successfully.");
    } catch {
      setKeyStatus("Failed to rotate keys.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-(--color-border-subtle) bg-(--color-bg-app)">
        <div className="flex items-center gap-2 text-xs text-(--color-text-secondary) mb-2">
          <span>Dashboard</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-(--color-text-primary)">Settings</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Account Settings</h1>
            <p className="text-xs text-(--color-text-secondary) mt-1">
              Manage your cryptographic identity, security keys, and network preferences
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-(--color-border-subtle) text-(--color-text-secondary) text-xs hover:text-(--color-text-primary) transition">
            <span className="material-symbols-outlined text-sm">history</span>
            View Audit Logs
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Profile & Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2 pp-card rounded-2xl p-6 relative overflow-hidden">
            {/* Decorative orb */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#f7e6d4] rounded-full blur-3xl" />

            <div className="flex items-start gap-6 relative">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-[#f7e6d4] text-(--color-primary) flex items-center justify-center text-2xl font-bold">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1f8d52] border-2 border-[#fff]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold">{username}</h2>
                  <span className="material-symbols-outlined text-(--color-primary) text-lg">verified</span>
                </div>
                <p className="text-xs font-mono text-(--color-text-muted) mb-3">
                  did:prahari:{profile?.id || "unknown"}
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#f8f4ec] text-[10px] text-(--color-text-secondary) border border-(--color-border-subtle)">
                    Electronics
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#f8f4ec] text-[10px] text-(--color-text-secondary) border border-(--color-border-subtle)">
                    Bangalore, IN
                  </span>
                </div>
              </div>

              {/* AI Trust Score */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <svg width="80" height="80" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e7e0d1" strokeWidth="2" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" stroke="#e56a00" strokeWidth="2"
                      strokeDasharray={`${trustScore} ${100 - trustScore}`} strokeLinecap="round" transform="rotate(-90 18 18)"
                      style={{ filter: "drop-shadow(0 0 3px rgba(229,106,0,0.35))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold">{trustScore}</p>
                      <p className="text-[8px] text-(--color-text-secondary)">TRUST</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Network Standing */}
          <div className="pp-card rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#e56a00] to-[#cf5f00]" />
            <div className="p-5">
              <span className="material-symbols-outlined text-(--color-primary) text-2xl mb-2">leaderboard</span>
              <p className="text-2xl font-bold mt-2">Trust {trustScore}%</p>
              <p className="text-xs text-(--color-text-secondary) mt-1">Live score from AI anomaly engine</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-(--color-border-subtle)">
                <span className="text-[10px] text-(--color-text-muted)">Adjustment: {trustAdjustment >= 0 ? "+" : ""}{(trustAdjustment * 100).toFixed(1)}%</span>
                <button className="text-[10px] text-(--color-primary) hover:underline">View Report</button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cryptographic Keys */}
          <div className="pp-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-(--color-primary)">key</span>
                <h3 className="text-sm font-semibold">Cryptographic Keys</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#e9f8ef] text-[#1f8d52] text-[10px] font-semibold">
                ACTIVE
              </span>
            </div>

            {/* Public Key */}
            <div className="mb-4">
              <p className="text-[10px] text-(--color-text-muted) uppercase tracking-wider mb-2">Public Key</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle)">
                <span className="text-xs font-mono text-(--color-text-secondary) truncate flex-1">{publicKey}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(publicKey)}
                  className="flex-shrink-0 w-7 h-7 rounded bg-[#fff] border border-(--color-border-subtle) flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-primary) transition"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>

            {/* Private Key Zone */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-red-400 text-sm">warning</span>
                <span className="text-xs font-semibold text-red-400">Private Key Zone</span>
              </div>
              <p className="text-[10px] text-(--color-text-secondary) mb-3">
                Never share your private key. It provides full access to your account.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5 hover:bg-red-500/10 transition"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  {showKey ? "Hide Key" : "Reveal Key"}
                </button>
                <button
                  onClick={handleRotateKeys}
                  className="px-3 py-1.5 rounded-lg border border-(--color-border-subtle) text-(--color-text-secondary) text-xs flex items-center gap-1.5 hover:text-(--color-text-primary) transition"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Rotate Keys
                </button>
              </div>
              {keyStatus && (
                <p className="text-[10px] text-(--color-text-secondary) mt-2">{keyStatus}</p>
              )}
              {showKey && (
                <div className="mt-3 p-2 rounded bg-[#fff] border border-(--color-border-subtle)">
                  <p className="text-xs font-mono text-red-400 break-all">
                    {generatedPrivateKey || "Private key will appear here only immediately after rotation."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Network & Protocol */}
          <div className="space-y-5">
            <div className="pp-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-(--color-primary)">hub</span>
                <h3 className="text-sm font-semibold">Network & Protocol</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Offline Transacting</p>
                    <p className="text-[10px] text-(--color-text-secondary)">Enable P2P transactions without internet</p>
                  </div>
                  <Toggle
                    enabled={offlineTransacting}
                    onToggle={() => setOfflineTransacting(!offlineTransacting)}
                    label="Toggle offline transacting"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Real-time AI Fraud Detection</p>
                    <p className="text-[10px] text-(--color-text-secondary)">AI-powered risk scoring on transactions</p>
                  </div>
                  <Toggle
                    enabled={aiFraudDetection}
                    onToggle={() => setAiFraudDetection(!aiFraudDetection)}
                    label="Toggle AI fraud detection"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Auto-Settlement</p>
                    <p className="text-[10px] text-(--color-text-secondary)">Automatically settle transactions daily</p>
                  </div>
                  <Toggle
                    enabled={autoSettlement}
                    onToggle={() => setAutoSettlement(!autoSettlement)}
                    label="Toggle auto settlement"
                  />
                </div>
              </div>
            </div>

            {/* General Preferences */}
            <div className="pp-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-(--color-primary)">settings</span>
                <h3 className="text-sm font-semibold">General Preferences</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-(--color-text-muted) uppercase tracking-wider block mb-1.5">
                    Primary Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    aria-label="Primary currency"
                    className="w-full px-3 py-2 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-sm text-(--color-text-primary) outline-none focus:border-[#d7b68d] transition"
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USDC">USDC — USD Coin</option>
                    <option value="USDT">USDT — Tether</option>
                    <option value="PRH">PRH — Prahari Token</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-(--color-text-muted) uppercase tracking-wider block mb-1.5">
                    Notification Level
                  </label>
                  <select
                    value={notificationLevel}
                    onChange={(e) => setNotificationLevel(e.target.value)}
                    aria-label="Notification level"
                    className="w-full px-3 py-2 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-sm text-(--color-text-primary) outline-none focus:border-[#d7b68d] transition"
                  >
                    <option value="critical">Critical Security Only</option>
                    <option value="all">All Transactions</option>
                    <option value="daily">Daily Summary</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Guardian Recovery */}
          <div className="pp-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-(--color-primary)">shield_person</span>
              <h3 className="text-sm font-semibold">Guardian Recovery</h3>
            </div>
            <p className="text-[10px] text-(--color-text-secondary) mb-4">
              Trusted contacts who can help recover your account using social recovery protocol.
            </p>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                  JD
                </div>
                <div>
                  <p className="text-xs font-semibold">John Doe (Legal)</p>
                  <p className="text-[10px] text-[#1f8d52]">Verified</p>
                </div>
              </div>
              <button className="text-(--color-text-muted) hover:text-(--color-text-primary) transition">
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </button>
            </div>
            <button className="w-full py-2.5 rounded-lg border border-dashed border-[#d7b68d] text-xs text-(--color-text-secondary) hover:text-(--color-primary) transition flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Add New Guardian
            </button>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-[#f2cdcd] bg-[#fff4f4] p-5">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-4">Danger Zone</h3>
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-lg bg-[#f8f4ec] border border-(--color-border-subtle) text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) transition"
              >
                Log Out
              </button>
              <div className="border-t border-red-500/10" />
              <button className="w-full py-2.5 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition">
                Delete Merchant Account
              </button>
              <p className="text-[10px] text-(--color-text-muted)">
                This action is irreversible. All keys will be revoked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
