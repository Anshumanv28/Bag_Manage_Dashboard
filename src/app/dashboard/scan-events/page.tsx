"use client";

export const dynamic = "force-dynamic";

import { FiltersBar, defaultFilters, type FiltersValue } from "@/components/Filters";
import { scanEvents, type ScanEventRow } from "@/lib/api";
import { formatIst } from "@/lib/time";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

function toIso(dtLocal: string): string {
  return new Date(dtLocal).toISOString();
}

export default function ScanEventsPage() {
  const [filters, setFilters] = useState<FiltersValue>(() => defaultFilters());
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [operation, setOperation] = useState<"" | "deposit" | "retrieve">("");
  const [eventType, setEventType] = useState<
    "" | ScanEventRow["eventType"]
  >("");
  const [localSearch, setLocalSearch] = useState("");

  const range = useMemo(
    () => ({ from: toIso(filters.from), to: toIso(filters.to) }),
    [filters.from, filters.to],
  );

  const q = useQuery({
    queryKey: ["scanEvents", filters, operation, eventType, cursor],
    queryFn: () =>
      scanEvents({
        ...range,
        operatorId: filters.operatorId || undefined,
        deviceId: filters.deviceId || undefined,
        operation: operation || undefined,
        eventType: eventType || undefined,
        limit: 200,
        cursor,
      }),
  });

  const rows = useMemo(() => q.data?.rows ?? [], [q.data]);

  const filtered = useMemo(() => {
    const s = localSearch.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        r.id.toLowerCase().includes(s) ||
        r.operatorId.toLowerCase().includes(s) ||
        (r.deviceId ?? "").toLowerCase().includes(s) ||
        (r.rackId ?? "").toLowerCase().includes(s) ||
        (r.candidateId ?? "").toLowerCase().includes(s)
      );
    });
  }, [localSearch, rows]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Scan events</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Raw scan/cancel events from devices.
        </p>
      </div>

      <FiltersBar
        value={filters}
        onChange={(v) => {
          setFilters(v);
          setCursor(undefined);
        }}
        showStatus={false}
        showBucket={false}
        showSearch={false}
        showDeviceId
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Operation</div>
              <select
                value={operation}
                onChange={(e) => {
                  setOperation(e.target.value as typeof operation);
                  setCursor(undefined);
                }}
                className="mt-1 h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="">All</option>
                <option value="deposit">Deposit</option>
                <option value="retrieve">Retrieve</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Event type</div>
              <select
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value as typeof eventType);
                  setCursor(undefined);
                }}
                className="mt-1 h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="">All</option>
                <option value="candidate_scanned">candidate_scanned</option>
                <option value="rack_scanned">rack_scanned</option>
                <option value="deposit_cancelled">deposit_cancelled</option>
                <option value="retrieve_cancelled">retrieve_cancelled</option>
                <option value="scan_rejected">scan_rejected</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full md:w-80">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Search</div>
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="event id, rack, candidate, operator, device…"
                className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
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
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Occurred</th>
                <th className="py-2 pr-4">Operation</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Rack</th>
                <th className="py-2 pr-4">Candidate</th>
                <th className="py-2 pr-4">Operator</th>
                <th className="py-2 pr-4">Device</th>
                <th className="py-2 pr-4">ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400">
                    {formatIst(r.occurredAt)}
                  </td>
                  <td className="py-2 pr-4">{r.operation}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.eventType}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.rackId ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.candidateId ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.operatorId}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.deviceId ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {r.id}
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
                    Failed to load scan events
                  </td>
                </tr>
              ) : null}
              {!q.isLoading && !q.isError && filtered.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={8}>
                    No scan events found in this range.
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

