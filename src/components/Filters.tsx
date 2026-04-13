"use client";

import { useQuery } from "@tanstack/react-query";
import { listOperators } from "@/lib/api";

export type FiltersValue = {
  from: string;
  to: string;
  bucket: "hour" | "day";
  status: "" | "active" | "complete";
  operatorId: string;
  rackId: string;
  candidateId: string;
};

function nowIsoLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function isoLocalMinusHours(hours: number): string {
  const d = new Date(Date.now() - hours * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function defaultFilters(): FiltersValue {
  return {
    from: isoLocalMinusHours(24),
    to: nowIsoLocal(),
    bucket: "hour",
    status: "",
    operatorId: "",
    rackId: "",
    candidateId: "",
  };
}

export function FiltersBar({
  value,
  onChange,
  showStatus = true,
  showBucket = true,
  showSearch = false,
}: {
  value: FiltersValue;
  onChange: (next: FiltersValue) => void;
  showStatus?: boolean;
  showBucket?: boolean;
  showSearch?: boolean;
}) {
  const operatorsQ = useQuery({
    queryKey: ["operators"],
    queryFn: listOperators,
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            From
          </span>
          <input
            type="datetime-local"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            To
          </span>
          <input
            type="datetime-local"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Operator
          </span>
          <select
            value={value.operatorId}
            onChange={(e) => onChange({ ...value, operatorId: e.target.value })}
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <option value="">All</option>
            {(operatorsQ.data?.operators ?? []).map((o) => (
              <option key={o.phone} value={o.phone}>
                {o.name} ({o.phone})
              </option>
            ))}
          </select>
          {operatorsQ.isError ? (
            <div className="text-xs text-red-600">Failed to load operators</div>
          ) : null}
        </label>

        {showStatus ? (
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Status
            </span>
            <select
              value={value.status}
              onChange={(e) =>
                onChange({ ...value, status: e.target.value as FiltersValue["status"] })
              }
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="complete">Complete</option>
            </select>
          </label>
        ) : null}

        {showBucket ? (
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Bucket
            </span>
            <select
              value={value.bucket}
              onChange={(e) =>
                onChange({ ...value, bucket: e.target.value as FiltersValue["bucket"] })
              }
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
            </select>
          </label>
        ) : null}

        {showSearch ? (
          <>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Rack ID
              </span>
              <input
                value={value.rackId}
                onChange={(e) => onChange({ ...value, rackId: e.target.value })}
                placeholder="e.g. RACK-01"
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Candidate ID
              </span>
              <input
                value={value.candidateId}
                onChange={(e) => onChange({ ...value, candidateId: e.target.value })}
                placeholder="e.g. ROLL-123"
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}

