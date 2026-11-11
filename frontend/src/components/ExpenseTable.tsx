"use client";

import { useState } from "react";

import { formatMoneyAmount, formatThaiDateTime } from "@/lib/money";
import type { Expense } from "@/lib/types";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface ExpenseTableProps {
  expenses: Expense[];
  activeUser: string;
  loading: boolean;
  onDelete: (expenseId: number) => Promise<void>;
}

export function ExpenseTable({ expenses, activeUser, loading, onDelete }: ExpenseTableProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function remove(expenseId: number) {
    setDeletingId(expenseId);
    try {
      await onDelete(expenseId);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white/95 shadow-[0_24px_60px_-45px_rgba(28,25,23,0.65)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 px-5 py-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-900">Expense history</h2>
          <p className="text-xs text-stone-500">Newest first · soft-deleted rows are hidden</p>
        </div>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-500">
          {expenses.length} active
        </span>
      </div>

      {loading && expenses.length === 0 ? (
        <div className="space-y-2 p-5" aria-label="Loading expenses">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-3xl" aria-hidden>
            🧾
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-700">No expenses yet.</p>
          <p className="mt-1 text-xs text-stone-500">
            Add the first one above. Every satang will be accounted for.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-stone-50/80 text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Paid by
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Split
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    When
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map((expense) => {
                  const canDelete = expense.paid_by === activeUser;
                  const isConfirming = confirmingId === expense.id;
                  const isDeleting = deletingId === expense.id;
                  return (
                    <tr key={expense.id} className="align-top transition hover:bg-stone-50/70">
                      <td className="max-w-[240px] px-5 py-4">
                        <p className="font-semibold text-stone-900">{expense.description}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-stone-400">
                          #{expense.id}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-2 text-stone-700">
                          <Avatar username={expense.paid_by} size="sm" />
                          <span className="text-xs font-medium">
                            {titleCase(expense.paid_by)}
                            {expense.paid_by === activeUser ? (
                              <span className="ml-1 text-[10px] text-emerald-700">you</span>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <span className="font-mono text-sm font-bold tabular-nums text-stone-900">
                          {formatMoneyAmount(expense.amount)}
                        </span>
                        <span className="ml-1 text-[10px] font-semibold text-stone-400">THB</span>
                      </td>
                      <td className="max-w-[260px] px-3 py-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            expense.split_type === "equal"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {expense.split_type}
                        </span>
                        <p className="mt-1 text-[10px] leading-4 text-stone-500">
                          {Object.entries(expense.shares)
                            .map(
                              ([member, share]) =>
                                `${titleCase(member)} ${formatMoneyAmount(share)}`,
                            )
                            .join(" · ")}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-stone-500">
                        {formatThaiDateTime(expense.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canDelete ? (
                          isConfirming ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                disabled={isDeleting}
                                className="rounded-lg border border-stone-300 px-2 py-1 text-[10px] font-semibold text-stone-600 transition hover:bg-stone-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove(expense.id)}
                                disabled={isDeleting}
                                className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
                              >
                                {isDeleting ? "Deleting…" : "Confirm"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingId(expense.id)}
                              className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-stone-400">payer only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-stone-100 lg:hidden">
            {expenses.map((expense) => {
              const canDelete = expense.paid_by === activeUser;
              const isConfirming = confirmingId === expense.id;
              const isDeleting = deletingId === expense.id;
              return (
                <article key={expense.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900">{expense.description}</p>
                      <p className="mt-0.5 text-[10px] text-stone-500">
                        {titleCase(expense.paid_by)} paid · {formatThaiDateTime(expense.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-stone-900">
                      {formatMoneyAmount(expense.amount)}
                      <span className="ml-1 text-[9px] text-stone-400">THB</span>
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        expense.split_type === "equal"
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {expense.split_type}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {Object.entries(expense.shares)
                        .map(([member, share]) => `${titleCase(member)} ${formatMoneyAmount(share)}`)
                        .join(" · ")}
                    </span>
                  </div>
                  {canDelete ? (
                    <div className="mt-3 flex justify-end gap-1.5">
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={isDeleting}
                            className="rounded-lg border border-stone-300 px-2.5 py-1 text-[10px] font-semibold text-stone-600"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(expense.id)}
                            disabled={isDeleting}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-60"
                          >
                            {isDeleting ? "Deleting…" : "Confirm delete"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(expense.id)}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
