"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "../services/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isMerchant, setIsMerchant] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    return "Authentication failed";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, password, isMerchant);
        setIsRegister(false);
        setError("");
      }

      // Login
      const data = await login(username, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", data.username);
      router.push("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101d23] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#3abff8]/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-[#3abff8] to-blue-600 items-center justify-center text-white text-3xl font-bold mb-4">
            P
          </div>
          <h1 className="text-2xl font-bold text-white">PrahariPay</h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-Powered Guardian Payment Protocol
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1b2427]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-1">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {isRegister
              ? "Register your merchant identity"
              : "Sign in to your merchant portal"}
          </p>

          {error && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Prahari ID
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#111618] border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-[#3abff8] focus:ring-1 focus:ring-[#3abff8]/30 transition"
                  placeholder="Enter your Prahari ID"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Passphrase
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#111618] border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-[#3abff8] focus:ring-1 focus:ring-[#3abff8]/30 transition"
                  placeholder="Enter passphrase"
                  required
                />
              </div>
            </div>

            {/* Merchant Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Merchant Mode</span>
              <button
                type="button"
                onClick={() => setIsMerchant(!isMerchant)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isMerchant ? "bg-[#3abff8]" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    isMerchant ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#3abff8] text-[#111618] font-semibold hover:bg-[#3abff8]/90 transition disabled:opacity-50 shadow-lg shadow-[#3abff8]/20"
            >
              {loading
                ? "Processing..."
                : isRegister
                ? "Create Account"
                : "Authenticate"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-sm text-[#3abff8] hover:underline"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "New merchant? Create account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
