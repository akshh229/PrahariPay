"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview", icon: "dashboard", fill: true },
  { href: "/transactions", label: "Transactions", icon: "receipt_long" },
  { href: "/generate-qr", label: "Receive Payment", icon: "qr_code_2" },
  { href: "/spend-analyzer", label: "Spend Insights", icon: "analytics" },
  { href: "/analytics", label: "Analytics", icon: "monitoring" },
  { href: "/network", label: "Network", icon: "hub" },
  { href: "/recovery", label: "Recovery", icon: "shield" },
  { href: "/guardians", label: "Guardians", icon: "group" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full flex flex-col border-r border-slate-800 bg-[#111618] hidden md:flex flex-shrink-0 z-20">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#3abff8] to-blue-600 flex items-center justify-center text-white font-bold text-xl">
          P
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">PrahariPay</h1>
          <p className="text-xs text-slate-400">Merchant Portal</p>
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
                  ? "bg-[#27343a] text-[#3abff8] font-medium"
                  : "text-slate-400 hover:bg-[#27343a] hover:text-white"
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
        <div className="mt-auto pt-4 border-t border-slate-800">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === "/settings"
                ? "bg-[#27343a] text-[#3abff8] font-medium"
                : "text-slate-400 hover:bg-[#27343a] hover:text-white"
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
