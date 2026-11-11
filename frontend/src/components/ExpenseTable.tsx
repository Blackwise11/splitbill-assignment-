"use client";

import { useState } from "react";
import { ReceiptText, Trash2 } from "lucide-react";

import { formatThaiBaht } from "@/lib/format";
import { formatMoneyAmount, formatThaiDateTime } from "@/lib/money";
import type { Expense } from "@/lib/types";
import { SectionHeading } from "@/components/SectionHeading";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface ExpenseTableProps {
  expenses: Expense[];
  activeUser: string;
  loading: boolean;
  onDelete: (expenseId: number) => Promise<void>;
}

function SplitPills({ expense }: { expense: Expense }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-dark">
        {expense.split_type === "equal" ? "Equal" : "Exact"}
      </span>
      {Object.entries(expense.shares).map(([member, share]) => (
        <span
          key={member}
          className="rounded-full border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-soft"
        >
          {titleCase(member)} {formatMoneyAmount(share)}
        </span>
      ))}
    </div>
  );
}

function DeleteControl({
  expense,
  activeUser,
  confirmingId,
  deletingId,
  setConfirmingId,
  remove,
  compact = false,
}: {
  expense: Expense;
  activeUser: string;
  confirmingId: number | null;
  deletingId: number | null;
  setConfirmingId: (id: number | null) => void;
  remove: (id: number) => Promise<void>;
  compact?: boolean;
}) {
  if (expense.paid_by !== activeUser) {
    return <span className="text-[11px] text-ink-muted">Payer only</span>;
  }

  if (confirmingId === expense.id) {
    const isDeleting = deletingId === expense.id;
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setConfirmingId(null)}
          disabled={isDeleting}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-raised"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void remove(expense.id)}
          disabled={isDeleting}
          className="rounded-md bg-negative px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#be123c] disabled:opacity-60"
        >
          {isDeleting ? "Deleting…" : compact ? "Confirm delete" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmingId(expense.id)}
      className="inline-flex items-center gap-1 rounded-md border border-negative/20 px-2 py-1 text-[11px] font-semibold text-negative transition-colors duration-150 hover:bg-negative-bg"
    >
      <Trash2 size={16} strokeWidth={1.5} aria-hidden />
      Delete
    </button>
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
    <section className="overflow-hidden rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-line px-4 pt-4 pb-3">
        <SectionHeading
          title="Expenses"
          className="mb-0"
          meta={
            <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] text-ink-soft">
              {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
            </span>
          }
        />
      </div>

      {loading && expenses.length === 0 ? (
        <div className="space-y-2 p-4" aria-label="Loading expenses">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 rounded-lg bg-raised" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <ReceiptText size={16} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold text-ink">No expenses yet</p>
          <p className="mt-1 text-[12px] text-ink-soft">Add the first expense above</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead className="border-b border-line bg-cream text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Expense
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Split
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="align-top">
                    <td className="max-w-[210px] px-4 py-3">
                      <p className="text-[13px] font-medium leading-5 text-ink">
                        {expense.description}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                        <Avatar username={expense.paid_by} size="sm" />
                        <span className="text-ink-soft">{titleCase(expense.paid_by)}</span>
                        <span>·</span>
                        <span>{formatThaiDateTime(expense.created_at)}</span>
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12px] font-medium tabular-nums text-ink">
                      {formatThaiBaht(expense.amount)}
                    </td>
                    <td className="max-w-[210px] px-3 py-3">
                      <SplitPills expense={expense} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteControl
                        expense={expense}
                        activeUser={activeUser}
                        confirmingId={confirmingId}
                        deletingId={deletingId}
                        setConfirmingId={setConfirmingId}
                        remove={remove}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-line xl:hidden">
            {expenses.map((expense) => (
              <article key={expense.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{expense.description}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {titleCase(expense.paid_by)} paid · {formatThaiDateTime(expense.created_at)}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink">
                    {formatThaiBaht(expense.amount)}
                  </p>
                </div>
                <div className="mt-2">
                  <SplitPills expense={expense} />
                </div>
                <div className="mt-3 flex justify-end">
                  <DeleteControl
                    expense={expense}
                    activeUser={activeUser}
                    confirmingId={confirmingId}
                    deletingId={deletingId}
                    setConfirmingId={setConfirmingId}
                    remove={remove}
                    compact
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
