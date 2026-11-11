"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { formatThaiBaht } from "@/lib/format";
import type { SettleUp, Transfer } from "@/lib/types";
import { SectionHeading } from "@/components/SectionHeading";
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
    <section className="rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-line px-4 pt-4 pb-3">
        <SectionHeading
          title="Settle up"
          className="mb-0"
          meta={
            <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] text-ink-soft">
              {count} {count === 1 ? "transfer" : "transfers"}
            </span>
          }
        />
      </div>

      {loading && !settleUp ? (
        <div className="p-4">
          <div className="h-16 rounded-lg bg-raised" />
        </div>
      ) : !settleUp ? (
        <p className="px-4 py-5 text-[13px] text-ink-soft">Balances appear after an expense</p>
      ) : count === 0 ? (
        <div className="flex items-start gap-2.5 px-4 py-4">
          <CheckCircle2
            size={16}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-positive"
            aria-hidden
          />
          <div>
            <p className="text-[13px] font-semibold text-ink">Everyone is square</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">Nothing to settle right now</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {settleUp.transactions.map((transfer) => {
            const isMine = transfer.from_user === activeUser;
            const isBusy = recording === transferKey(transfer);
            return (
              <div key={transferKey(transfer)} className="px-4 py-3">
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
                  <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-ink">
                    {formatThaiBaht(transfer.amount)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-ink-muted">Suggested transfer</span>
                  {isMine ? (
                    <button
                      type="button"
                      onClick={() => void record(transfer)}
                      disabled={isBusy}
                      className="h-7 rounded-md bg-ink px-2.5 text-[11px] font-semibold text-card transition-colors duration-150 hover:bg-stone-800 disabled:opacity-60"
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
