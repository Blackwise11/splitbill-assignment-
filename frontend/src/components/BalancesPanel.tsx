"use client";

import { formatMoneyAmount, amountToSatang, formatSatang } from "@/lib/money";
import type { Balances } from "@/lib/types";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface BalancesPanelProps {
  balances: Balances | null;
  activeUser: string;
  loading: boolean;
}

export function BalancesPanel({ balances, activeUser, loading }: BalancesPanelProps) {
  return (
    <section className="rounded-3xl border border-stone-200/80 bg-white/90 p-5 shadow-[0_18px_50px_-35px_rgba(28,25,23,0.6)] backdrop-blur">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-stone-900">Balances</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Net
        </span>
      </div>

      {loading && !balances ? (
        <div className="space-y-2.5" aria-label="Loading balances">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : !balances || balances.members.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
          Record an expense to see who owes what.
        </p>
      ) : (
        <div className="space-y-2">
          {balances.members.map((line) => {
            const satang = amountToSatang(line.balance);
            const positive = satang > 0;
            const negative = satang < 0;
            return (
              <div
                key={line.username}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  line.username === activeUser
                    ? "border-emerald-900/15 bg-emerald-50/70"
                    : "border-stone-200/80 bg-white"
                }`}
              >
                <Avatar username={line.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-stone-800">
                    {titleCase(line.username)}
                    {line.username === activeUser ? (
                      <span className="rounded bg-emerald-900 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                        you
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[10px] text-stone-500">
                    paid {formatMoneyAmount(line.paid)} · owes {formatMoneyAmount(line.owed)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono text-sm font-bold tabular-nums ${
                      positive ? "text-emerald-700" : negative ? "text-rose-600" : "text-stone-400"
                    }`}
                  >
                    {positive ? "+" : negative ? "−" : ""}
                    {formatSatang(Math.abs(satang))}
                  </p>
                  <p
                    className={`text-[9px] font-semibold uppercase tracking-wide ${
                      positive ? "text-emerald-600" : negative ? "text-rose-500" : "text-stone-400"
                    }`}
                  >
                    {positive ? "gets back" : negative ? "owes" : "settled"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3 text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Zero-sum invariant
        </span>
        <span className="font-mono font-semibold text-stone-700">
          {formatMoneyAmount(balances?.total ?? "0.00")} THB
        </span>
      </div>
    </section>
  );
}
