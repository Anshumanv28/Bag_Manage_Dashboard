"use client";

export const dynamic = "force-dynamic";

import { FiltersBar, defaultFilters, type FiltersValue } from "@/components/Filters";
import { StatCard } from "@/components/StatCard";
import {
  bookingSummary,
  bookingTimeseries,
  activitiesSummary,
  syncTimeseries,
} from "@/lib/api";
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
  // Treat the datetime-local as local time and convert to ISO.
  return new Date(dtLocal).toISOString();
}

function fmtBucketLabel(s: string): string {
  // backend returns text; keep it readable
  return s.replace("T", " ").replace(/:\d\d(\.\d+)?$/, "");
}

export default function DashboardOverviewPage() {
  const [filters, setFilters] = useState<FiltersValue>(() => defaultFilters());

  const range = useMemo(
    () => ({ from: toIso(filters.from), to: toIso(filters.to) }),
    [filters.from, filters.to],
  );

  const summaryQ = useQuery({
    queryKey: ["bookingSummary", filters],
    queryFn: () =>
      bookingSummary({
        ...range,
        status: filters.status || undefined,
        operatorId: filters.operatorId || undefined,
      }),
  });

  const tsQ = useQuery({
    queryKey: ["bookingTimeseries", filters],
    queryFn: () =>
      bookingTimeseries({
        ...range,
        bucket: filters.bucket,
        timezone: "UTC",
        status: filters.status || undefined,
        operatorId: filters.operatorId || undefined,
      }),
  });

  const syncQ = useQuery({
    queryKey: ["syncTimeseries", filters],
    queryFn: () =>
      syncTimeseries({
        ...range,
        bucket: filters.bucket,
        timezone: "UTC",
        operatorId: filters.operatorId || undefined,
      }),
  });

  const actQ = useQuery({
    queryKey: ["activitiesSummary", filters],
    queryFn: () =>
      activitiesSummary({
        ...range,
        operatorId: filters.operatorId || undefined,
      }),
  });

  const chartData = useMemo(() => {
    const created = tsQ.data?.created ?? [];
    const completed = tsQ.data?.completed ?? [];
    const byBucket = new Map<string, { bucket: string; created: number; completed: number }>();
    for (const p of created) {
      byBucket.set(p.bucket, { bucket: p.bucket, created: p.count, completed: 0 });
    }
    for (const p of completed) {
      const cur = byBucket.get(p.bucket);
      if (cur) cur.completed = p.count;
      else byBucket.set(p.bucket, { bucket: p.bucket, created: 0, completed: p.count });
    }
    return Array.from(byBucket.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [tsQ.data]);

  const syncData = syncQ.data?.series ?? [];
  const counts = actQ.data?.counts;
  const completionRatio = useMemo(() => {
    const active = summaryQ.data?.active ?? 0;
    const complete = summaryQ.data?.complete ?? 0;
    if (!summaryQ.data) return null;
    if (active === 0) return complete > 0 ? Infinity : 0;
    return complete / active;
  }, [summaryQ.data]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Bookings and sync activity with operator/date/time filtering.
        </p>
      </div>

      <FiltersBar value={filters} onChange={setFilters} showSearch={false} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="Total bookings"
          value={summaryQ.data ? String(summaryQ.data.total) : summaryQ.isLoading ? "…" : "—"}
        />
        <StatCard
          label="Active bookings"
          value={summaryQ.data ? String(summaryQ.data.active) : summaryQ.isLoading ? "…" : "—"}
        />
        <StatCard
          label="Completed bookings"
          value={summaryQ.data ? String(summaryQ.data.complete) : summaryQ.isLoading ? "…" : "—"}
        />
        <StatCard
          label="Avg completion (min)"
          value={
            summaryQ.data
              ? summaryQ.data.avgCompletionMinutes === null
                ? "—"
                : summaryQ.data.avgCompletionMinutes.toFixed(1)
              : summaryQ.isLoading
                ? "…"
                : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard
          label="Complete/active ratio"
          value={
            completionRatio === null
              ? summaryQ.isLoading
                ? "…"
                : "—"
              : completionRatio === Infinity
                ? "∞"
                : completionRatio.toFixed(2)
          }
          sublabel={
            summaryQ.data ? `${summaryQ.data.complete} complete / ${summaryQ.data.active} active` : undefined
          }
        />
        <StatCard
          label="Candidate scans"
          value={counts ? String(counts.candidate_scanned) : actQ.isLoading ? "…" : "—"}
        />
        <StatCard
          label="Rack scans"
          value={counts ? String(counts.rack_scanned) : actQ.isLoading ? "…" : "—"}
        />
        <StatCard
          label="Deposit confirms"
          value={counts ? String(counts.deposit_confirmed) : actQ.isLoading ? "…" : "—"}
        />
        <StatCard
          label="Return confirms"
          value={counts ? String(counts.return_confirmed) : actQ.isLoading ? "…" : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 text-sm font-semibold">Bookings over time</div>
          <div className="h-64">
            <ClientOnly
              fallback={<div className="h-full w-full rounded-md bg-zinc-50 dark:bg-zinc-900" />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tickFormatter={fmtBucketLabel} minTickGap={16} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => fmtBucketLabel(String(v))} />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ClientOnly>
          </div>
          {tsQ.isError ? (
            <div className="mt-2 text-xs text-red-600">Failed to load bookings timeseries</div>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 text-sm font-semibold">Sync activity</div>
          <div className="h-64">
            <ClientOnly
              fallback={<div className="h-full w-full rounded-md bg-zinc-50 dark:bg-zinc-900" />}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={syncData}>
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
                </LineChart>
              </ResponsiveContainer>
            </ClientOnly>
          </div>
          {syncQ.isError ? (
            <div className="mt-2 text-xs text-red-600">Failed to load sync timeseries</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

