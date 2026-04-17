"use client";

export const dynamic = "force-dynamic";

import { listFlaggedBookingsComputed } from "@/lib/api";
import type { FlaggedBookingsComputedRow } from "@/lib/api";
import { formatIst } from "@/lib/time";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type FlagReason =
  | "candidate_duplicate_active"
  | "rack_duplicate_active"
  | "retrieve_duplicate";

function fmtReason(r: string): string {
  return r.replaceAll("_", " ");
}

function matchesSearch(
  search: string,
  v: {
    bookingId: string;
    rackId: string;
    candidateId: string;
    operatorId: string;
  },
): boolean {
  const s = search.trim().toLowerCase();
  if (!s) return true;
  return (
    v.bookingId.toLowerCase().includes(s) ||
    v.rackId.toLowerCase().includes(s) ||
    v.candidateId.toLowerCase().includes(s) ||
    v.operatorId.toLowerCase().includes(s)
  );
}

export default function FlaggedBookingsPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [more, setMore] = useState<{
    rows: FlaggedBookingsComputedRow[];
    nextCursor: string | null;
    loading: boolean;
  }>({ rows: [], nextCursor: null, loading: false });
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState<"" | FlagReason>("");

  const q = useQuery({
    queryKey: ["flagged-bookings", cursor],
    queryFn: () => listFlaggedBookingsComputed({ limit: 100, cursor }),
  });

  const baseRows = useMemo(() => q.data?.rows ?? [], [q.data]);
  const allRows = useMemo(
    () => [...baseRows, ...more.rows],
    [baseRows, more.rows],
  );
  const nextCursor = more.nextCursor ?? q.data?.nextCursor ?? null;

  // Some bookings can remain `flagged` even when they are no longer part of a
  // duplicate-active set (e.g. if the counterpart booking was completed/deleted).
  // Treat these as "retrieve duplicates" for dashboard review.
  const allRowsWithDerivedReasons = useMemo(() => {
    return allRows.map((r) => {
      if (r.reasons.length > 0) return r;
      return { ...r, reasons: ["retrieve_duplicate"] };
    });
  }, [allRows]);

  async function loadMore() {
    if (more.loading) return;
    if (!nextCursor) return;
    setMore((m) => ({ ...m, loading: true }));
    try {
      const res = await listFlaggedBookingsComputed({
        limit: 100,
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

  const filtered = useMemo(() => {
    return allRowsWithDerivedReasons.filter((r) => {
      if (only && !r.reasons.includes(only)) return false;
      return matchesSearch(search, {
        bookingId: r.booking.id,
        rackId: r.booking.rackId,
        candidateId: r.booking.candidateId,
        operatorId: r.booking.operatorId,
      });
    });
  }, [allRowsWithDerivedReasons, only, search]);

  const candidateGroups = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; rows: typeof filtered; updatedAt: number }
    >();
    for (const r of filtered) {
      if (!r.reasons.includes("candidate_duplicate_active")) continue;
      const key = r.booking.candidateId || "—";
      const prev = byKey.get(key);
      const ts = new Date(r.booking.updatedAt ?? r.booking.createdAt).getTime();
      if (!prev) {
        byKey.set(key, { key, rows: [r], updatedAt: ts });
      } else {
        prev.rows.push(r);
        prev.updatedAt = Math.max(prev.updatedAt, ts);
      }
    }
    return [...byKey.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [filtered]);

  const rackGroups = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; rows: typeof filtered; updatedAt: number }
    >();
    for (const r of filtered) {
      if (!r.reasons.includes("rack_duplicate_active")) continue;
      const key = r.booking.rackId || "—";
      const prev = byKey.get(key);
      const ts = new Date(r.booking.updatedAt ?? r.booking.createdAt).getTime();
      if (!prev) {
        byKey.set(key, { key, rows: [r], updatedAt: ts });
      } else {
        prev.rows.push(r);
        prev.updatedAt = Math.max(prev.updatedAt, ts);
      }
    }
    return [...byKey.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [filtered]);

  const retrieveDuplicates = useMemo(() => {
    return filtered
      .filter((r) => r.reasons.includes("retrieve_duplicate"))
      .slice()
      .sort((a, b) => {
        const at = new Date(
          a.booking.updatedAt ?? a.booking.createdAt,
        ).getTime();
        const bt = new Date(
          b.booking.updatedAt ?? b.booking.createdAt,
        ).getTime();
        return bt - at;
      });
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Flagged bookings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Active mappings that share a candidate ID or rack ID across multiple
          bookings. Resolve with operators in the field.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Conflicts</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCursor(undefined);
                setSearch("");
                setOnly("");
                setMore({ rows: [], nextCursor: null, loading: false });
              }}
              className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={!cursor && !search && !only && more.rows.length === 0}
            >
              Reset
            </button>
            <button
              onClick={loadMore}
              className="h-9 rounded-md bg-zinc-900 px-3 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={!nextCursor || more.loading || q.isLoading}
            >
              {more.loading ? "Loading…" : nextCursor ? "Load more" : "No more"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Booking ID, rack, candidate, operator…"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div className="w-full md:w-64">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Reason
            </label>
            <select
              value={only}
              onChange={(e) => setOnly(e.target.value as "" | FlagReason)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All</option>
              <option value="candidate_duplicate_active">
                Candidate duplicate
              </option>
              <option value="rack_duplicate_active">Rack duplicate</option>
              <option value="retrieve_duplicate">Retrieve duplicate</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="text-sm font-semibold">Candidate duplicates</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Groups: {candidateGroups.length} • Rows:{" "}
              {
                filtered.filter((r) =>
                  r.reasons.includes("candidate_duplicate_active"),
                ).length
              }
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {candidateGroups.map((g) => (
                <div
                  key={g.key}
                  className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      Candidate: {g.key}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {g.rows.length} booking(s)
                    </div>
                  </div>
                  <div className="mt-2 overflow-auto">
                    <table className="min-w-[520px] w-full text-left text-xs">
                      <thead className="border-b border-zinc-200 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        <tr>
                          <th className="py-1 pr-3">Updated</th>
                          <th className="py-1 pr-3">Rack</th>
                          <th className="py-1 pr-3">Operator</th>
                          <th className="py-1 pr-3">Status</th>
                          <th className="py-1 pr-3">Booking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows
                          .slice()
                          .sort((a, b) => {
                            const at = new Date(
                              a.booking.updatedAt ?? a.booking.createdAt,
                            ).getTime();
                            const bt = new Date(
                              b.booking.updatedAt ?? b.booking.createdAt,
                            ).getTime();
                            return bt - at;
                          })
                          .map((r) => (
                            <tr
                              key={r.booking.id}
                              className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                            >
                              <td className="py-1 pr-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                                {formatIst(
                                  r.booking.updatedAt ?? r.booking.createdAt,
                                )}
                              </td>
                              <td className="py-1 pr-3 font-mono">
                                {r.booking.rackId}
                              </td>
                              <td className="py-1 pr-3 font-mono">
                                {r.booking.operatorId}
                              </td>
                              <td className="py-1 pr-3">{r.booking.status}</td>
                              <td className="py-1 pr-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                {r.booking.id}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Reasons: {fmtReason("candidate_duplicate_active")}
                  </div>
                </div>
              ))}
              {q.isLoading ? (
                <div className="py-6 text-xs text-zinc-500">Loading…</div>
              ) : null}
              {q.isError ? (
                <div className="py-6 text-xs text-red-600">
                  Failed to load flagged bookings
                </div>
              ) : null}
              {!q.isLoading && !q.isError && candidateGroups.length === 0 ? (
                <div className="py-6 text-xs text-zinc-500">
                  No candidate duplicates.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="text-sm font-semibold">Rack duplicates</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Groups: {rackGroups.length} • Rows:{" "}
              {
                filtered.filter((r) =>
                  r.reasons.includes("rack_duplicate_active"),
                ).length
              }
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {rackGroups.map((g) => (
                <div
                  key={g.key}
                  className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      Rack: {g.key}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {g.rows.length} booking(s)
                    </div>
                  </div>
                  <div className="mt-2 overflow-auto">
                    <table className="min-w-[520px] w-full text-left text-xs">
                      <thead className="border-b border-zinc-200 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        <tr>
                          <th className="py-1 pr-3">Updated</th>
                          <th className="py-1 pr-3">Candidate</th>
                          <th className="py-1 pr-3">Operator</th>
                          <th className="py-1 pr-3">Status</th>
                          <th className="py-1 pr-3">Booking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows
                          .slice()
                          .sort((a, b) => {
                            const at = new Date(
                              a.booking.updatedAt ?? a.booking.createdAt,
                            ).getTime();
                            const bt = new Date(
                              b.booking.updatedAt ?? b.booking.createdAt,
                            ).getTime();
                            return bt - at;
                          })
                          .map((r) => (
                            <tr
                              key={r.booking.id}
                              className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                            >
                              <td className="py-1 pr-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                                {formatIst(
                                  r.booking.updatedAt ?? r.booking.createdAt,
                                )}
                              </td>
                              <td className="py-1 pr-3 font-mono">
                                {r.booking.candidateId}
                              </td>
                              <td className="py-1 pr-3 font-mono">
                                {r.booking.operatorId}
                              </td>
                              <td className="py-1 pr-3">{r.booking.status}</td>
                              <td className="py-1 pr-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                {r.booking.id}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Reasons: {fmtReason("rack_duplicate_active")}
                  </div>
                </div>
              ))}
              {q.isLoading ? (
                <div className="py-6 text-xs text-zinc-500">Loading…</div>
              ) : null}
              {q.isError ? (
                <div className="py-6 text-xs text-red-600">
                  Failed to load flagged bookings
                </div>
              ) : null}
              {!q.isLoading && !q.isError && rackGroups.length === 0 ? (
                <div className="py-6 text-xs text-zinc-500">
                  No rack duplicates.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-sm font-semibold">Retrieve duplicates</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Bookings still marked <span className="font-mono">flagged</span> but
            not currently part of a candidate/rack duplicate-active group.
          </div>
          <div className="mt-3 overflow-auto">
            <table className="min-w-[820px] w-full text-left text-xs">
              <thead className="border-b border-zinc-200 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="py-1 pr-3">Updated</th>
                  <th className="py-1 pr-3">Rack</th>
                  <th className="py-1 pr-3">Candidate</th>
                  <th className="py-1 pr-3">Operator</th>
                  <th className="py-1 pr-3">Status</th>
                  <th className="py-1 pr-3">Booking</th>
                </tr>
              </thead>
              <tbody>
                {retrieveDuplicates.map((r) => (
                  <tr
                    key={r.booking.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="py-1 pr-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                      {formatIst(r.booking.updatedAt ?? r.booking.createdAt)}
                    </td>
                    <td className="py-1 pr-3 font-mono">{r.booking.rackId}</td>
                    <td className="py-1 pr-3 font-mono">
                      {r.booking.candidateId}
                    </td>
                    <td className="py-1 pr-3 font-mono">
                      {r.booking.operatorId}
                    </td>
                    <td className="py-1 pr-3">{r.booking.status}</td>
                    <td className="py-1 pr-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {r.booking.id}
                    </td>
                  </tr>
                ))}
                {!q.isLoading &&
                !q.isError &&
                retrieveDuplicates.length === 0 ? (
                  <tr>
                    <td className="py-6 text-xs text-zinc-500" colSpan={6}>
                      None.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Showing {filtered.length} row(s) loaded.
        </div>
      </div>
    </div>
  );
}
