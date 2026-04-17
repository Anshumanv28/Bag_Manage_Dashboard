"use client";

export const dynamic = "force-dynamic";

import {
  createOperator,
  listOperators,
  patchOperator,
  type Operator,
} from "@/lib/api";
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

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10;

  const createM = useMutation({
    mutationFn: () => createOperator({ phone: phoneDigits, name, password }),
    onSuccess: async () => {
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["operators"] });
    },
  });

  const patchM = useMutation({
    mutationFn: (input: {
      phone: string;
      depositEnabled?: boolean;
      retrieveEnabled?: boolean;
    }) => patchOperator(input.phone, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["operators"] });
    },
  });

  const bulkM = useMutation({
    mutationFn: async (input: {
      kind: "deposit" | "retrieve";
      enabled: boolean;
    }) => {
      const ops = (listQ.data?.operators ?? []) as Operator[];
      for (const op of ops) {
        await patchOperator(op.phone, {
          depositEnabled: input.kind === "deposit" ? input.enabled : undefined,
          retrieveEnabled: input.kind === "retrieve" ? input.enabled : undefined,
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["operators"] });
    },
  });

  const createDisabled =
    createM.isPending ||
    !phoneValid ||
    name.trim().length < 1 ||
    password.length < 6;

  const depositAllOn = useMemo(() => {
    if (operators.length === 0) return false;
    return operators.every((o) => (o.depositEnabled ?? true) === true);
  }, [operators]);

  const retrieveAllOn = useMemo(() => {
    if (operators.length === 0) return false;
    return operators.every((o) => (o.retrieveEnabled ?? true) === true);
  }, [operators]);

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
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(next);
              }}
              placeholder="9990001114"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              autoComplete="off"
              inputMode="numeric"
              pattern="[0-9]*"
            />
            {!phoneValid && phone.length > 0 ? (
              <div className="mt-1 text-xs text-red-600">
                Phone must be exactly 10 digits.
              </div>
            ) : null}
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Op4"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              autoComplete="off"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 chars"
              type="password"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              autoComplete="new-password"
            />
            {password.length > 0 && password.length < 6 ? (
              <div className="mt-1 text-xs text-red-600">
                Password must be at least 6 characters.
              </div>
            ) : null}
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
        {patchM.isError ? (
          <div className="mt-2 text-xs text-red-600">
            {normalizeErrorMessage(patchM.error)}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">All operators</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !depositAllOn;
                const ok = window.confirm(
                  `${next ? "Enable" : "Disable"} Deposit for ALL operators?`,
                );
                if (!ok) return;
                bulkM.mutate({ kind: "deposit", enabled: next });
              }}
              className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={listQ.isFetching || bulkM.isPending || patchM.isPending}
            >
              {bulkM.isPending ? "Updating…" : depositAllOn ? "Disable deposit" : "Enable deposit"}
            </button>
            <button
              onClick={() => {
                const next = !retrieveAllOn;
                const ok = window.confirm(
                  `${next ? "Enable" : "Disable"} Retrieve for ALL operators?`,
                );
                if (!ok) return;
                bulkM.mutate({ kind: "retrieve", enabled: next });
              }}
              className="h-9 rounded-md bg-zinc-900 px-3 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={listQ.isFetching || bulkM.isPending || patchM.isPending}
            >
              {bulkM.isPending ? "Updating…" : retrieveAllOn ? "Disable retrieve" : "Enable retrieve"}
            </button>
            <button
              onClick={() => listQ.refetch()}
              className="h-9 rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={listQ.isFetching}
            >
              {listQ.isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-[700px] w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Deposit</th>
                <th className="py-2 pr-4">Retrieve</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((op) => {
                const depositOn = op.depositEnabled ?? true;
                const retrieveOn = op.retrieveEnabled ?? true;
                return (
                  <tr
                    key={op.phone}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {op.phone}
                    </td>
                    <td className="py-2 pr-4">{op.name}</td>
                    <td className="py-2 pr-4">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300"
                          checked={depositOn}
                          disabled={patchM.isPending}
                          onChange={(e) =>
                            patchM.mutate({
                              phone: op.phone,
                              depositEnabled: e.target.checked,
                            })
                          }
                        />
                        <span>{depositOn ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td className="py-2 pr-4">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300"
                          checked={retrieveOn}
                          disabled={patchM.isPending}
                          onChange={(e) =>
                            patchM.mutate({
                              phone: op.phone,
                              retrieveEnabled: e.target.checked,
                            })
                          }
                        />
                        <span>{retrieveOn ? "On" : "Off"}</span>
                      </label>
                    </td>
                  </tr>
                );
              })}
              {listQ.isLoading ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {listQ.isError ? (
                <tr>
                  <td className="py-6 text-red-600" colSpan={4}>
                    Failed to load operators
                  </td>
                </tr>
              ) : null}
              {!listQ.isLoading && !listQ.isError && sorted.length === 0 ? (
                <tr>
                  <td className="py-6 text-zinc-500" colSpan={4}>
                    No operators yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {bulkM.isError ? (
          <div className="mt-2 text-xs text-red-600">
            {normalizeErrorMessage(bulkM.error)}
          </div>
        ) : null}
        {bulkM.isSuccess ? (
          <div className="mt-2 text-xs text-green-700 dark:text-green-400">
            Updated all operators.
          </div>
        ) : null}
      </div>
    </div>
  );
}
