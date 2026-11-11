"use client";

import { useState } from "react";
import { ReceiptText, Trash2 } from "lucide-react";

import { formatMoneyAmount, formatThaiDateTime } from "@/lib/money";
import type { Expense } from "@/lib/types";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface ExpenseTableProps {
  expenses: Expense[];
  activeUser: string;
  loading: boolean;
  onDelete: (expenseId: number) => Promise<void>;
}

function SplitTag({ type }: { type: Expense["split_type"] }) {
  return (
    <span className="inline-block rounded-[4px] border border-line px-1.5 py-0.5 text-[10px] capitalize text-ink-soft">
      {type}
    </span>
  );
}

function ShareLine({ shares }: { shares: Record<string, string> }) {
  return (
    <p className="mt-1 truncate font-mono text-[11px] leading-4 text-ink-muted">
      {Object.entries(shares)
        .map(([member, share]) => `${titleCase(member)} ${formatMoneyAmount(share)}`)
        .join(" · ")}
    </p>
  );
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
    <section className="overflow-hidden rounded-[14px] border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[16px] font-medium leading-6 text-ink">Expenses</h2>
          <p className="text-[12px] leading-4 text-ink-muted">
            Newest first · deleted expenses hidden
          </p>
        </div>
        <span className="font-mono text-[12px] text-ink-muted">
          {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
        </span>
      </div>

      {loading && expenses.length === 0 ? (
        <div className="space-y-px bg-line/40" aria-label="Loading expenses">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 bg-card" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <ReceiptText size={16} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
          <p className="mt-2 text-[14px] font-medium text-ink">No expenses yet</p>
          <p className="mt-1 text-[12px] text-ink-muted">Add the first expense above</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-ink-muted">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-[12px] font-medium text-ink-muted">
                    Paid by
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right text-[12px] font-medium text-ink-muted"
                  >
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-[12px] font-medium text-ink-muted">
                    Split
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-[12px] font-medium text-ink-muted">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const canDelete = expense.paid_by === activeUser;
                  const isConfirming = confirmingId === expense.id;
                  const isDeleting = deletingId === expense.id;
                  return (
                    <tr
                      key={expense.id}
                      className="border-b border-line/70 align-top last:border-0"
                    >
                      <td className="max-w-[240px] px-5 py-3.5">
                        <p className="text-[13px] font-medium leading-5 text-ink">
                          {expense.description}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                          #{expense.id}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-2">
                          <Avatar username={expense.paid_by} size="sm" />
                          <span className="text-[12px] text-ink-soft">
                            {titleCase(expense.paid_by)}
                            {expense.paid_by === activeUser ? (
                              <span className="ml-1 text-[11px] text-ink-muted">you</span>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right">
                        <span className="font-mono text-[13px] font-medium tabular-nums text-ink">
                          {formatMoneyAmount(expense.amount)}
                        </span>
                        <span className="ml-1 font-mono text-[10px] text-ink-muted">THB</span>
                      </td>
                      <td className="max-w-[260px] px-3 py-3.5">
                        <SplitTag type={expense.split_type} />
                        <ShareLine shares={expense.shares} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-[12px] text-ink-muted">
                        {formatThaiDateTime(expense.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {canDelete ? (
                          isConfirming ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                disabled={isDeleting}
                                className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-raised"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove(expense.id)}
                                disabled={isDeleting}
                                className="rounded-[6px] bg-negative px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#8c3023] disabled:opacity-60"
                              >
                                {isDeleting ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingId(expense.id)}
                              className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-medium text-negative transition-colors duration-150 hover:bg-negative/5"
                            >
                              <Trash2 size={16} strokeWidth={1.5} aria-hidden />
                              Delete
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-ink-muted">Payer only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-line/70 lg:hidden">
            {expenses.map((expense) => {
              const canDelete = expense.paid_by === activeUser;
              const isConfirming = confirmingId === expense.id;
              const isDeleting = deletingId === expense.id;
              return (
                <article key={expense.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">{expense.description}</p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        {titleCase(expense.paid_by)} paid · {formatThaiDateTime(expense.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-[13px] font-medium tabular-nums text-ink">
                      {formatMoneyAmount(expense.amount)}
                      <span className="ml-1 text-[10px] font-normal text-ink-muted">THB</span>
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SplitTag type={expense.split_type} />
                    <span className="text-[11px] text-ink-muted">
                      {Object.entries(expense.shares)
                        .map(
                          ([member, share]) =>
                            `${titleCase(member)} ${formatMoneyAmount(share)}`,
                        )
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
                            className="rounded-[6px] px-2 py-1 text-[11px] font-medium text-ink-muted"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(expense.id)}
                            disabled={isDeleting}
                            className="rounded-[6px] bg-negative px-2 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                          >
                            {isDeleting ? "Deleting…" : "Confirm delete"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(expense.id)}
                          className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] font-medium text-negative"
                        >
                          <Trash2 size={16} strokeWidth={1.5} aria-hidden />
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
