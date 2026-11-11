"use client";

import { useState } from "react";

import { formatMoneyAmount } from "@/lib/money";
import type { SettleUp, Transfer } from "@/lib/types";
import { titleCase } from "@/components/UserSwitcher";

interface SettleUpPanelProps {
  settleUp: SettleUp | null;
  activeUser: string;
  loading: boolean;
  onRecordPayment: (transfer: Transfer) => Promise<void>;
}

function transferKey(transfer: Transfer): string {
  return `${transfer.from_user}-${transfer.to_user}-${transfer.amount}`;
}

export function SettleUpPanel({
  settleUp,
  activeUser,
  loading,
  onRecordPayment,
}: SettleUpPanelProps) {
  const [recording, setRecording] = useState<string | null>(null);

  async function record(transfer: Transfer) {
    setRecording(transferKey(transfer));
    try {
      await onRecordPayment(transfer);
    } finally {
      setRecording(null);
    }
  }

  const count = settleUp?.transaction_count ?? 0;

  return (
    <section className="rounded-3xl border border-emerald-950/10 bg-emerald-950 p-5 text-emerald-50 shadow-[0_18px_50px_-30px_rgba(2,44,34,0.8)]">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold">Settle up</h2>
        <span className="rounded-full bg-emerald-800/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
          {count} {count === 1 ? "transfer" : "transfers"}
        </span>
      </div>

      {loading && !settleUp ? (
        <div className="h-20 animate-pulse rounded-xl bg-emerald-900/70" />
      ) : !settleUp ? (
        <p className="text-xs leading-5 text-emerald-200/70">
          Balances appear once an expense is recorded.
        </p>
      ) : count === 0 ? (
        <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/50 px-4 py-5 text-center">
          <p className="text-2xl" aria-hidden>
            ✓
          </p>
          <p className="mt-1 text-sm font-semibold">Everyone is square.</p>
          <p className="mt-1 text-[11px] text-emerald-200/70">No repayments needed right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {settleUp.transactions.map((transfer) => {
            const isMine = transfer.from_user === activeUser;
            const isBusy = recording === transferKey(transfer);
            return (
              <div
                key={transferKey(transfer)}
                className="rounded-2xl border border-emerald-800/70 bg-emerald-900/55 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="font-semibold text-white">
                      {titleCase(transfer.from_user)}
                    </span>
                    <span aria-hidden className="text-emerald-400">
                      →
                    </span>
                    <span className="font-semibold text-white">{titleCase(transfer.to_user)}</span>
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-emerald-100">
                    {formatMoneyAmount(transfer.amount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-emerald-300/60">
                    THB · suggested
                  </span>
                  {isMine ? (
                    <button
                      type="button"
                      onClick={() => void record(transfer)}
                      disabled={isBusy}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-950 transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {isBusy ? "Recording…" : "Mark paid"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-300/60">
                      waiting on {titleCase(transfer.from_user)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-[10px] leading-4 text-emerald-300/55">
            Greedy min cash-flow. Recording a repayment updates every balance instantly.
          </p>
        </div>
      )}
    </section>
  );
}
