"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview", icon: "dashboard", fill: true },
  { href: "/transactions", label: "Transactions", icon: "receipt_long" },
  { href: "/generate-qr", label: "Receive Payment", icon: "qr_code_2" },
  { href: "/spend-analyzer", label: "Spend Insights", icon: "analytics" },
  { href: "/loan-applications", label: "Loan Applications", icon: "account_balance" },
  { href: "/analytics", label: "Analytics", icon: "monitoring" },
  { href: "/network", label: "Network", icon: "hub" },
  { href: "/recovery", label: "Recovery", icon: "shield" },
  { href: "/guardians", label: "Guardians", icon: "group" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full flex flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-sidebar)] hidden md:flex flex-shrink-0 z-20">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-xl shadow-sm">
          P
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-[var(--color-text-primary)]">PrahariPay</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Merchant Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? "bg-[#f3e6d9] text-[var(--color-primary)] font-medium"
                  : "text-[var(--color-text-secondary)] hover:bg-[#f7f2e9] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? "fill" : ""}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Bottom section */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)]">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === "/settings"
                ? "bg-[#f3e6d9] text-[var(--color-primary)] font-medium"
                : "text-[var(--color-text-secondary)] hover:bg-[#f7f2e9] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
