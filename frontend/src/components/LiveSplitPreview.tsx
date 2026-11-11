"use client";

import { formatSatang, type Share } from "@/lib/money";
import type { SplitType } from "@/lib/types";
import { titleCase } from "@/components/UserSwitcher";

export interface PreviewRow {
  username: string;
  amountSatang: number;
  invalid?: boolean;
}

interface LiveSplitPreviewProps {
  mode: SplitType;
  totalSatang: number | null;
  rows: PreviewRow[];
  remainingSatang: number;
  emptyMessage?: string;
}

export function LiveSplitPreview({
  mode,
  totalSatang,
  rows,
  remainingSatang,
  emptyMessage,
}: LiveSplitPreviewProps) {
  const hasTotal = totalSatang !== null && totalSatang > 0;
  const exactComplete = hasTotal && remainingSatang === 0;

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
            Live split preview
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-900">
            {hasTotal ? formatSatang(totalSatang) : "0.00"} THB total
          </p>
        </div>
        <span className="rounded-full border border-emerald-900/10 bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
          {mode === "equal" ? "Equal" : "Exact"} · {rows.length}{" "}
          {rows.length === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 px-3 py-4 text-center text-xs text-stone-500">
            {emptyMessage ?? "Choose at least one member to preview the split."}
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.username}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200/60"
            >
              <span className="truncate text-sm text-stone-700">{titleCase(row.username)}</span>
              <span
                className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                  row.invalid ? "text-rose-600" : "text-stone-900"
                }`}
              >
                {row.invalid ? "Invalid" : `${formatSatang(row.amountSatang)} THB`}
              </span>
            </div>
          ))
        )}
      </div>

      {mode === "exact" ? (
        <div
          className={`mt-4 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${
            !hasTotal
              ? "bg-stone-200/70 text-stone-600"
              : exactComplete
                ? "bg-emerald-100 text-emerald-900"
                : remainingSatang < 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-900"
          }`}
        >
          <span>
            {!hasTotal
              ? "Enter an amount to allocate"
              : exactComplete
                ? "Fully allocated"
                : remainingSatang < 0
                  ? "Over-allocated"
                  : "Remaining"}
          </span>
          <span className="font-mono tabular-nums">
            {hasTotal ? `${formatSatang(Math.abs(remainingSatang))} THB` : "—"}
          </span>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-emerald-100 px-3 py-2.5 text-xs font-semibold text-emerald-900">
          <span>
            {rows.length === 0 ? "Select at least one member" : "All members accounted for"}
          </span>
          <span className="font-mono tabular-nums">
            {hasTotal ? `${formatSatang(totalSatang)} THB` : "—"}
          </span>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-4 text-stone-500">
        Satang-precise. Remainders go +0.01 THB to members in the order shown.
      </p>
    </div>
  );
}

export function shareRows(shares: Share[]): PreviewRow[] {
  return shares.map((share) => ({
    username: share.username,
    amountSatang: share.amountSatang,
  }));
}
