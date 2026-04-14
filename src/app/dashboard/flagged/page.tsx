"use client";

export const dynamic = "force-dynamic";

import { listFlaggedBookings, type FlaggedBookingRow } from "@/lib/api";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function FlaggedBookingsPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const q = useQuery({
    queryKey: ["flagged-bookings", cursor],
    queryFn: () => listFlaggedBookings({ limit: 100, cursor }),
  });

  const rows = useMemo(() => q.data?.flagged ?? [], [q.data]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Flagged bookings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Active mappings that share a candidate ID or rack ID across multiple bookings. Resolve with operators in the field.
        </p>
      </div>

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
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Flagged at</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Booking</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Rack</th>
                <th className="py-2 pr-4">Candidate</th>
                <th className="py-2 pr-4">Deposit operator</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: FlaggedBookingRow) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.reason}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.bookingId}</td>
                  <td className="py-2 pr-4">{r.booking.status}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.booking.rackId}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.booking.candidateId}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.booking.operatorId}</td>
                </tr>
              ))}
              {q.isLoading ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {q.isError ? (
                <tr>
                  <td className="py-6 text-red-600" colSpan={7}>
                    Failed to load flagged bookings
                  </td>
                </tr>
              ) : null}
              {!q.isLoading && !q.isError && rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={7}>
                    No flagged bookings.
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
