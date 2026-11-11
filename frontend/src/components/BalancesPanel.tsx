"use client";

import { amountToSatang, formatMoneyAmount, formatSatang } from "@/lib/money";
import type { Balances } from "@/lib/types";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface BalancesPanelProps {
  balances: Balances | null;
  activeUser: string;
  loading: boolean;
}

export function BalancesPanel({ balances, activeUser, loading }: BalancesPanelProps) {
  return (
    <section className="rounded-[14px] border border-line bg-card p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-medium text-ink">Balances</h2>
        {balances ? (
          <span className="font-mono text-[12px] text-ink-muted">{balances.currency}</span>
        ) : null}
      </div>

      {loading && !balances ? (
        <div className="mt-2 space-y-1" aria-label="Loading balances">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-12 rounded-[8px] bg-raised" />
          ))}
        </div>
      ) : !balances || balances.members.length === 0 ? (
        <p className="mt-2 rounded-[8px] border border-dashed border-line-strong px-3 py-4 text-[13px] text-ink-muted">
          Record an expense to see who owes what
        </p>
      ) : (
        <div className="divide-y divide-line/70">
          {balances.members.map((line) => {
            const satang = amountToSatang(line.balance);
            const positive = satang > 0;
            const negative = satang < 0;
            return (
              <div key={line.username} className="flex items-center gap-2.5 py-2.5">
                <Avatar username={line.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-medium leading-5 text-ink">
                    {titleCase(line.username)}
                    {line.username === activeUser ? (
                      <span
                        aria-label="you"
                        title="You"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      />
                    ) : null}
                  </p>
                  <p
                    className="truncate font-mono text-[11px] leading-4 text-ink-muted"
                    title={`Paid ${formatMoneyAmount(line.paid)} · owes ${formatMoneyAmount(line.owed)}`}
                  >
                    paid {formatMoneyAmount(line.paid)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-mono text-[13px] font-medium tabular-nums ${
                      positive ? "text-positive" : negative ? "text-negative" : "text-ink-muted"
                    }`}
                  >
                    {positive ? "+" : negative ? "−" : ""}
                    {formatSatang(Math.abs(satang))}
                  </p>
                  <p
                    className={`text-[11px] leading-4 ${
                      positive ? "text-positive" : negative ? "text-negative" : "text-ink-muted"
                    }`}
                  >
                    {positive ? "Gets back" : negative ? "Owes" : "Settled"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-[12px]">
        <span className="text-ink-muted">Total</span>
        <span className="font-mono font-medium tabular-nums text-ink">
          {formatMoneyAmount(balances?.total ?? "0.00")} THB
        </span>
      </div>
    </section>
  );
}
