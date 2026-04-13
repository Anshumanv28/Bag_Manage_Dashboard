"use client";

export const dynamic = "force-dynamic";

import { createOperator, listOperators, type Operator } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

function normalizeErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Request failed";
}

export default function OperatorsPage() {
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["operators"],
    queryFn: () => listOperators(),
  });

  const operators = useMemo(() => listQ.data?.operators ?? [], [listQ.data]);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const createM = useMutation({
    mutationFn: () => createOperator({ phone, name, password }),
    onSuccess: async () => {
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["operators"] });
    },
  });

  const createDisabled =
    createM.isPending ||
    phone.trim().length < 3 ||
    name.trim().length < 1 ||
    password.length < 6;

  const sorted = useMemo(() => {
    const copy: Operator[] = [...operators];
    copy.sort((a, b) => a.phone.localeCompare(b.phone));
    return copy;
  }, [operators]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Operators</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create and manage operator accounts (admin).
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Create operator</div>

        <form
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (createDisabled) return;
            createM.mutate();
          }}
        >
          <div className="md:col-span-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9990001114"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              autoComplete="off"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Op4"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              autoComplete="off"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 chars"
              type="password"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              autoComplete="new-password"
            />
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={createDisabled}
              className="h-9 w-full rounded-md bg-zinc-900 px-3 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {createM.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>

        {createM.isError ? (
          <div className="mt-2 text-xs text-red-600">
            {normalizeErrorMessage(createM.error)}
          </div>
        ) : null}
        {createM.isSuccess ? (
          <div className="mt-2 text-xs text-green-700 dark:text-green-400">
            Created operator {createM.data.operator.phone}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">All operators</div>
          <button
            onClick={() => listQ.refetch()}
            className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={listQ.isFetching}
          >
            {listQ.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-[700px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Name</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((op) => (
                <tr
                  key={op.phone}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {op.phone}
                  </td>
                  <td className="py-2 pr-4">{op.name}</td>
                </tr>
              ))}
              {listQ.isLoading ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={2}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {listQ.isError ? (
                <tr>
                  <td className="py-6 text-red-600" colSpan={2}>
                    Failed to load operators
                  </td>
                </tr>
              ) : null}
              {!listQ.isLoading && !listQ.isError && sorted.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={2}>
                    No operators yet.
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

