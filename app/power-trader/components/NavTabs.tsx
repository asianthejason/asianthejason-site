// app/components/NavTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/power-trader", label: "Supply Cushion" },
  { href: "/power-trader/nearest-neighbour", label: "Nearest Neighbour" },
  { href: "/power-trader/renewables", label: "Renewables" },
  { href: "/power-trader/interties", label: "Interties" },
  { href: "/power-trader/capability", label: "Market Capability" },
  { href: "/power-trader/load-forecast", label: "Load & Price Forecast" },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 overflow-x-auto rounded-2xl border border-slate-700/40 bg-slate-950/45 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl" aria-label="Power Trader tools">
      <ul className="flex min-w-max gap-1 text-sm">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={pathname === tab.href ? "page" : undefined}
              className={`inline-flex min-h-9 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                pathname === tab.href
                  ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/15"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${pathname === tab.href ? "bg-slate-950" : "bg-slate-600"}`} />
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
