"use client";

export const dynamic = "force-dynamic";

import { FiltersBar, defaultFilters, type FiltersValue } from "@/components/Filters";
import { StatCard } from "@/components/StatCard";
import { syncEvents, syncLatest, syncTimeseries } from "@/lib/api";
import { formatIst } from "@/lib/time";
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

export default function SyncPage() {
  const [filters, setFilters] = useState<FiltersValue>(() => defaultFilters());
  const [localSearch, setLocalSearch] = useState("");
  const [errorsFirst, setErrorsFirst] = useState(true);

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
        timezone: "Asia/Kolkata",
        operatorId: filters.operatorId || undefined,
        deviceId: filters.deviceId || undefined,
      }),
  });

  const latestQ = useQuery({
    queryKey: ["syncLatest", filters.operatorId],
    queryFn: () =>
      syncLatest({
        limit: 200,
        operatorId: filters.operatorId || undefined,
        activeOnly: false,
      }),
  });

  const eventsQ = useQuery({
    queryKey: ["syncEvents", range, filters.operatorId, filters.deviceId],
    queryFn: () =>
      syncEvents({
        ...range,
        operatorId: filters.operatorId || undefined,
        deviceId: filters.deviceId || undefined,
        limit: 200,
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

  const latestRows = useMemo(() => latestQ.data?.rows ?? [], [latestQ.data]);
  const eventRows = useMemo(() => eventsQ.data?.rows ?? [], [eventsQ.data]);
  const [more, setMore] = useState<{
    rows: typeof eventRows;
    nextCursor: string | null;
    loading: boolean;
  }>({ rows: [], nextCursor: null, loading: false });

  const allRows = useMemo(() => [...eventRows, ...more.rows], [eventRows, more.rows]);
  const nextCursor = more.nextCursor ?? eventsQ.data?.nextCursor ?? null;

  const filteredRows = useMemo(() => {
    const s = localSearch.trim().toLowerCase();
    const base = !s
      ? allRows
      : allRows.filter((r) => {
          return (
            r.id.toLowerCase().includes(s) ||
            r.operatorId.toLowerCase().includes(s) ||
            r.deviceId.toLowerCase().includes(s)
          );
        });
    const sorted = [...base];
    if (errorsFirst) {
      sorted.sort((a, b) => {
        const ae = a.errorCount > 0 ? 1 : 0;
        const be = b.errorCount > 0 ? 1 : 0;
        if (ae !== be) return be - ae;
        return b.createdAt.localeCompare(a.createdAt);
      });
    } else {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
  }, [allRows, errorsFirst, localSearch]);

  async function loadMore() {
    if (more.loading) return;
    if (!nextCursor) return;
    setMore((m) => ({ ...m, loading: true }));
    try {
      const res = await syncEvents({
        ...range,
        operatorId: filters.operatorId || undefined,
        deviceId: filters.deviceId || undefined,
        limit: 200,
        cursor: nextCursor,
      });
      setMore((m) => ({
        rows: [...m.rows, ...res.rows],
        nextCursor: res.nextCursor,
        loading: false,
      }));
    } catch {
      setMore((m) => ({ ...m, loading: false }));
    }
  }

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
        showDeviceId
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
                <XAxis
                  dataKey="bucket"
                  tickFormatter={(v) => formatIst(String(v))}
                  minTickGap={16}
                />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(v) => formatIst(String(v))} />
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

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Latest sync per operator</div>
          <button
            onClick={() => latestQ.refetch()}
            className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={latestQ.isFetching}
          >
            {latestQ.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Last sync</th>
                <th className="py-2 pr-4">Operator</th>
                <th className="py-2 pr-4">Device</th>
                <th className="py-2 pr-4">Mutations</th>
                <th className="py-2 pr-4">OK</th>
                <th className="py-2 pr-4">Errors</th>
              </tr>
            </thead>
            <tbody>
              {latestRows.map((r) => (
                <tr
                  key={r.operatorId}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  role="button"
                  tabIndex={0}
                  onClick={() => setFilters((f) => ({ ...f, operatorId: r.operatorId }))}
                >
                  <td className="py-2 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {formatIst(r.createdAt)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.operatorId}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.deviceId}</td>
                  <td className="py-2 pr-4">{r.mutationCount}</td>
                  <td className="py-2 pr-4">{r.okCount}</td>
                  <td className="py-2 pr-4">{r.errorCount}</td>
                </tr>
              ))}
              {latestQ.isLoading ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {latestQ.isError ? (
                <tr>
                  <td className="py-6 text-red-600" colSpan={6}>
                    Failed to load latest sync rows
                  </td>
                </tr>
              ) : null}
              {!latestQ.isLoading && !latestQ.isError && latestRows.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={6}>
                    No sync events found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">All sync events</div>
          <button
            onClick={() => {
              setMore({ rows: [], nextCursor: null, loading: false });
              eventsQ.refetch();
            }}
            className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={eventsQ.isFetching}
          >
            {eventsQ.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Search</label>
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Event ID, operator, device…"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={errorsFirst}
                onChange={(e) => setErrorsFirst(e.target.checked)}
              />
              Errors first
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Operator</th>
                <th className="py-2 pr-4">Device</th>
                <th className="py-2 pr-4">Mutations</th>
                <th className="py-2 pr-4">OK</th>
                <th className="py-2 pr-4">Errors</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {formatIst(r.createdAt)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.id}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.operatorId}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.deviceId}</td>
                  <td className="py-2 pr-4">{r.mutationCount}</td>
                  <td className="py-2 pr-4">{r.okCount}</td>
                  <td className="py-2 pr-4">{r.errorCount}</td>
                </tr>
              ))}
              {eventsQ.isLoading ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {eventsQ.isError ? (
                <tr>
                  <td className="py-6 text-red-600" colSpan={7}>
                    Failed to load sync events
                  </td>
                </tr>
              ) : null}
              {!eventsQ.isLoading && !eventsQ.isError && allRows.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={7}>
                    No sync events found in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={loadMore}
            className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!nextCursor || more.loading}
          >
            {more.loading ? "Loading…" : nextCursor ? "Load more" : "No more"}
          </button>
        </div>
      </div>
    </div>
  );
}

