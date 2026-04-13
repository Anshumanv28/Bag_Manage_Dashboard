"use client";

export const dynamic = "force-dynamic";

import { FiltersBar, defaultFilters, type FiltersValue } from "@/components/Filters";
import { StatCard } from "@/components/StatCard";
import { syncTimeseries } from "@/lib/api";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@/components/ClientOnly";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

function toIso(dtLocal: string): string {
  return new Date(dtLocal).toISOString();
}

function fmtBucketLabel(s: string): string {
  return s.replace("T", " ").replace(/:\d\d(\.\d+)?$/, "");
}

export default function SyncPage() {
  const [filters, setFilters] = useState<FiltersValue>(() => defaultFilters());

  const range = useMemo(
    () => ({ from: toIso(filters.from), to: toIso(filters.to) }),
    [filters.from, filters.to],
  );

  const q = useQuery({
    queryKey: ["syncTimeseries", filters],
    queryFn: () =>
      syncTimeseries({
        ...range,
        bucket: filters.bucket,
        timezone: "UTC",
        operatorId: filters.operatorId || undefined,
      }),
  });

  const points = useMemo(() => q.data?.series ?? [], [q.data]);
  const totals = useMemo(() => {
    let events = 0;
    let mutations = 0;
    let ok = 0;
    let err = 0;
    for (const p of points) {
      events += p.eventCount;
      mutations += p.mutationCount;
      ok += p.okCount;
      err += p.errorCount;
    }
    return { events, mutations, ok, err };
  }, [points]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Sync</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Aggregated metrics from `/sync/push` events.
        </p>
      </div>

      <FiltersBar
        value={filters}
        onChange={setFilters}
        showStatus={false}
        showSearch={false}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Sync events" value={q.isLoading ? "…" : String(totals.events)} />
        <StatCard label="Mutations" value={q.isLoading ? "…" : String(totals.mutations)} />
        <StatCard label="OK" value={q.isLoading ? "…" : String(totals.ok)} />
        <StatCard label="Errors" value={q.isLoading ? "…" : String(totals.err)} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 text-sm font-semibold">Events over time</div>
        <div className="h-72">
          <ClientOnly
            fallback={<div className="h-full w-full rounded-md bg-zinc-50 dark:bg-zinc-900" />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tickFormatter={fmtBucketLabel} minTickGap={16} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(v) => fmtBucketLabel(String(v))} />
                <Line
                  type="monotone"
                  dataKey="eventCount"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="errorCount"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="mutationCount"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>
        {q.isError ? (
          <div className="mt-2 text-xs text-red-600">Failed to load sync analytics</div>
        ) : null}
      </div>
    </div>
  );
}

