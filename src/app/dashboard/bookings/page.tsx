"use client";

export const dynamic = "force-dynamic";

import { FiltersBar, defaultFilters, type FiltersValue } from "@/components/Filters";
import { listBookings } from "@/lib/api";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

function toIso(dtLocal: string): string {
  return new Date(dtLocal).toISOString();
}

export default function BookingsPage() {
  const [filters, setFilters] = useState<FiltersValue>(() => defaultFilters());
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const statusParam: "active" | "complete" | undefined =
    filters.status === "" ? undefined : filters.status;

  const range = useMemo(() => {
    // The default 24h createdAt window can hide older bookings.
    // - "All": show across all time (no createdAt filter)
    // - "Active": show across all time (active bookings can be long-lived)
    // - "Complete": keep the time window (useful for dashboard slices)
    if (!statusParam || statusParam === "active") return {};
    return { from: toIso(filters.from), to: toIso(filters.to) };
  }, [filters.from, filters.to, statusParam]);

  const q = useQuery({
    queryKey: ["bookings", filters, cursor],
    queryFn: () =>
      listBookings({
        ...range,
        status: statusParam,
        operatorId: filters.operatorId || undefined,
        rackId: filters.rackId || undefined,
        candidateId: filters.candidateId || undefined,
        limit: 100,
        cursor,
      }),
  });

  const rows = q.data?.bookings ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Bookings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Filter and browse bookings. Pagination uses a server cursor.
        </p>
      </div>

      <FiltersBar
        value={filters}
        onChange={(v) => {
          setFilters(v);
          setCursor(undefined);
        }}
        showBucket={false}
        showSearch
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Results</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(undefined)}
              className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={!cursor}
            >
              First page
            </button>
            <button
              onClick={() => setCursor(q.data?.nextCursor ?? undefined)}
              className="h-9 rounded-md bg-zinc-900 px-3 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={!q.data?.nextCursor}
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Rack</th>
                <th className="py-2 pr-4">Candidate</th>
                <th className="py-2 pr-4">Deposit operator</th>
                <th className="py-2 pr-4">Return operator</th>
                <th className="py-2 pr-4">Completed</th>
                <th className="py-2 pr-4">ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        b.status === "active"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
                      ].join(" ")}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{b.rackId}</td>
                  <td className="py-2 pr-4">{b.candidateId}</td>
                  <td className="py-2 pr-4">{b.operatorId}</td>
                  <td className="py-2 pr-4">{b.returnOperatorId ?? "—"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {b.completedAt ? new Date(b.completedAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {b.id}
                  </td>
                </tr>
              ))}
              {q.isLoading ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {q.isError ? (
                <tr>
                  <td className="py-6 text-red-600" colSpan={8}>
                    Failed to load bookings
                  </td>
                </tr>
              ) : null}
              {!q.isLoading && !q.isError && rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={8}>
                    No results for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

