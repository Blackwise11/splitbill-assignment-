"use client";

import { CheckCircle2 } from "lucide-react";

import { formatThaiBaht } from "@/lib/format";
import { amountToSatang, formatSatang } from "@/lib/money";
import type { Balances, Group } from "@/lib/types";

interface GroupSummaryProps {
  group: Group;
  balances: Balances | null;
  activeUser: string;
}

const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-ink-muted";
const cardClass =
  "rounded-xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]";

export function GroupSummary({ group, balances, activeUser }: GroupSummaryProps) {
  const myLine = balances?.members.find((line) => line.username === activeUser);
  const myBalance = myLine ? amountToSatang(myLine.balance) : 0;
  const positive = myBalance > 0;
  const negative = myBalance < 0;
  const total = balances?.total ?? "0.00";

  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Group summary">
      <article className={cardClass}>
        <span className={labelClass}>Active group</span>
        <h1 className="mt-1 text-[20px] font-bold leading-7 tracking-[-0.01em] text-ink">
          {group.name}
        </h1>
        <p className="mt-1 text-[12px] text-ink-soft">
          {group.member_count} members · THB
        </p>
      </article>

      <article className={cardClass}>
        <span className={labelClass}>Your balance</span>
        <p
          className={`mt-1 font-mono text-[28px] font-medium leading-8 tabular-nums ${
            positive ? "text-positive" : negative ? "text-negative" : "text-ink"
          }`}
        >
          {positive ? "+" : negative ? "−" : ""}
          {formatSatang(Math.abs(myBalance))}
          <span className="ml-1 text-[14px] text-ink-muted">฿</span>
        </p>
        <p
          className={`mt-1 text-[12px] font-medium ${
            positive ? "text-positive" : negative ? "text-negative" : "text-ink-muted"
          }`}
        >
          {positive ? "Owed to you" : negative ? "You owe" : "Settled up"}
        </p>
      </article>

      <article className={cardClass}>
        <span className={labelClass}>Group status</span>
        <p className="mt-1 flex items-center gap-1.5 text-[16px] font-semibold text-positive">
          <CheckCircle2 size={16} strokeWidth={1.5} aria-hidden />
          Zero-sum verified
        </p>
        <p className="mt-1 font-mono text-[12px] text-ink-soft">
          {balances ? formatThaiBaht(total) : "0.00 ฿"}
        </p>
      </article>
    </section>
  );
}
