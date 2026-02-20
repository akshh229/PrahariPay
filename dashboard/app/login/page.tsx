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
    <div className="min-h-screen bg-(--color-bg-app) flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#f7e6d4] blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-(--color-primary) items-center justify-center text-white text-3xl font-bold mb-4 shadow-sm">
            P
          </div>
          <h1 className="text-2xl font-bold text-(--color-text-primary)">PrahariPay</h1>
          <p className="text-sm text-(--color-text-secondary) mt-1">
            AI-Powered Guardian Payment Protocol
          </p>
        </div>

        {/* Card */}
        <div className="bg-(--color-bg-card) border border-(--color-border-subtle) rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-(--color-text-primary) mb-1">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-sm text-(--color-text-secondary) mb-6">
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
              <label className="block text-xs font-medium text-(--color-text-secondary) mb-2 uppercase tracking-wider">
                Prahari ID
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) text-xl">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#f8f4ec] border border-(--color-border-subtle) text-(--color-text-primary) placeholder-[#b9b2a5] focus:outline-none focus:border-[#d7b68d] focus:ring-1 focus:ring-[#f4dfc4] transition"
                  placeholder="Enter your Prahari ID"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-(--color-text-secondary) mb-2 uppercase tracking-wider">
                Passphrase
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) text-xl">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#f8f4ec] border border-(--color-border-subtle) text-(--color-text-primary) placeholder-[#b9b2a5] focus:outline-none focus:border-[#d7b68d] focus:ring-1 focus:ring-[#f4dfc4] transition"
                  placeholder="Enter passphrase"
                  required
                />
              </div>
            </div>

            {/* Merchant Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--color-text-secondary)">Merchant Mode</span>
              <button
                type="button"
                onClick={() => setIsMerchant(!isMerchant)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isMerchant ? "bg-(--color-primary)" : "bg-[#ccc3b3]"
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
              className="w-full py-3 rounded-xl pp-btn-primary font-semibold transition disabled:opacity-50"
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
              className="text-sm text-(--color-primary) hover:underline"
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
