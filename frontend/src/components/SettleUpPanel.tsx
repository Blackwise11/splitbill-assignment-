"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

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
    <section className="rounded-[14px] border border-line bg-card p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-medium text-ink">Settle up</h2>
        <span className="font-mono text-[12px] text-ink-muted">
          {count} {count === 1 ? "transfer" : "transfers"}
        </span>
      </div>

      {loading && !settleUp ? (
        <div className="mt-2 h-16 rounded-[8px] bg-raised" />
      ) : !settleUp ? (
        <p className="mt-2 text-[13px] text-ink-muted">Balances appear after an expense</p>
      ) : count === 0 ? (
        <div className="mt-2 flex items-start gap-2 py-1">
          <CheckCircle2
            size={16}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-positive"
            aria-hidden
          />
          <div>
            <p className="text-[13px] font-medium text-ink">Everyone is square</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Nothing to settle right now</p>
          </div>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-line/70">
          {settleUp.transactions.map((transfer) => {
            const isMine = transfer.from_user === activeUser;
            const isBusy = recording === transferKey(transfer);
            return (
              <div key={transferKey(transfer)} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink">
                    <span className="truncate">{titleCase(transfer.from_user)}</span>
                    <ArrowRight
                      size={16}
                      strokeWidth={1.5}
                      className="shrink-0 text-ink-muted"
                      aria-hidden
                    />
                    <span className="truncate">{titleCase(transfer.to_user)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[13px] font-medium tabular-nums text-ink">
                    {formatMoneyAmount(transfer.amount)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-ink-muted">Suggested transfer</span>
                  {isMine ? (
                    <button
                      type="button"
                      onClick={() => void record(transfer)}
                      disabled={isBusy}
                      className="h-7 rounded-[6px] bg-ink px-2.5 text-[11px] font-medium text-paper transition-colors duration-150 hover:bg-[#332b22] disabled:opacity-60"
                    >
                      {isBusy ? "Recording…" : "Mark paid"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-ink-muted">Awaiting payment</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
