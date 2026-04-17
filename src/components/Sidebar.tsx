"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/bookings", label: "Bookings" },
  { href: "/dashboard/flagged", label: "Flagged" },
  { href: "/dashboard/sync", label: "Sync" },
  { href: "/dashboard/scan-events", label: "Scan events" },
  { href: "/dashboard/operators", label: "Operators" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Baggage Management
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Analytics Dashboard
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={[
                "rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

