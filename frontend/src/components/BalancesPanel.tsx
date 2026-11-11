"use client";

import { amountToSatang, formatSatang } from "@/lib/money";
import { formatThaiBaht } from "@/lib/format";
import type { Balances } from "@/lib/types";
import { SectionHeading } from "@/components/SectionHeading";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface BalancesPanelProps {
  balances: Balances | null;
  activeUser: string;
  loading: boolean;
}

export function BalancesPanel({ balances, activeUser, loading }: BalancesPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-line px-4 pt-4 pb-3">
        <SectionHeading
          title="Balances"
          className="mb-0"
          meta={<span className="font-mono text-[11px] text-ink-muted">THB</span>}
        />
      </div>

      {loading && !balances ? (
        <div className="space-y-2 p-4" aria-label="Loading balances">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-10 rounded-lg bg-raised" />
          ))}
        </div>
      ) : !balances || balances.members.length === 0 ? (
        <p className="px-4 py-6 text-[13px] text-ink-soft">
          Record an expense to see who owes what
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px] text-left text-[13px]">
            <thead className="border-b border-line bg-cream text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Member
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Total paid
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Net balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {balances.members.map((line) => {
                const satang = amountToSatang(line.balance);
                const positive = satang > 0;
                const negative = satang < 0;
                const isActive = line.username === activeUser;
                return (
                  <tr key={line.username} className={isActive ? "bg-accent-subtle/60" : undefined}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar username={line.username} size="sm" />
                        <span className="text-[13px] font-medium text-ink">
                          {titleCase(line.username)}
                        </span>
                        {isActive ? (
                          <span className="text-[10px] font-semibold text-accent-dark">you</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] tabular-nums text-ink-soft">
                      {formatThaiBaht(line.paid)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex min-w-[84px] justify-center rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold tabular-nums ${
                          positive
                            ? "bg-positive-bg text-positive"
                            : negative
                              ? "bg-negative-bg text-negative"
                              : "bg-raised text-ink-soft"
                        }`}
                      >
                        {positive ? "+" : negative ? "−" : ""}
                        {formatSatang(Math.abs(satang))} ฿
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-line bg-cream">
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-positive">
                  {formatThaiBaht(balances.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
