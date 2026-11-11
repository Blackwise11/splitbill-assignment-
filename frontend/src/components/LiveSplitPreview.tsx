"use client";

import { Check } from "lucide-react";

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

function remainderNamesText(names: string[]): string {
  if (names.length === 0) return "";
  return names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
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
  const remainderCount =
    mode === "equal" && hasTotal && rows.length > 0 ? totalSatang % rows.length : 0;
  const remainderNames = rows.slice(0, remainderCount).map((row) => titleCase(row.username));
  const allocated = totalSatang === null ? 0 : totalSatang - remainingSatang;
  const progress =
    mode === "exact" && totalSatang !== null && totalSatang > 0
      ? Math.min(100, Math.max(0, (allocated / totalSatang) * 100))
      : 0;

  return (
    <div
      className="rounded-[12px] border border-ink/15 bg-[#faf5ea] p-4 shadow-[0_8px_24px_rgba(33,28,22,0.06)]"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-ink-soft">Split preview</p>
          <p className="mt-1 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums text-ink">
            {hasTotal ? formatSatang(totalSatang) : "0.00"}
            <span className="ml-1.5 text-[12px] font-normal tracking-normal text-ink-muted">
              THB
            </span>
          </p>
        </div>
        <span className="rounded-[4px] border border-line-strong px-1.5 py-0.5 text-[11px] text-ink-soft">
          {mode === "equal" ? "Equal" : "Exact"} · {rows.length}{" "}
          {rows.length === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="mt-3 border-t border-dashed border-line-strong pt-1">
        {rows.length === 0 ? (
          <p className="px-1 py-4 text-[12px] leading-5 text-ink-muted">
            {emptyMessage ?? "Choose at least one member to preview the split"}
          </p>
        ) : (
          <div className="divide-y divide-line/70">
            {rows.map((row) => (
              <div key={row.username} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-[13px] text-ink-soft">{titleCase(row.username)}</span>
                <span
                  className={`shrink-0 font-mono text-[13px] font-medium tabular-nums ${
                    row.invalid ? "text-negative" : "text-ink"
                  }`}
                >
                  {row.invalid ? "Invalid" : `${formatSatang(row.amountSatang)} THB`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {mode === "equal" ? (
        <div className="mt-3 border-t border-dashed border-line-strong pt-3">
          <p className="flex items-start gap-1.5 text-[12px] leading-5 text-ink-muted">
            {remainderCount > 0 ? (
              <>
                <span className="shrink-0 font-mono font-medium text-accent">
                  +{formatSatang(remainderCount)}
                </span>
                <span>remainder to {remainderNamesText(remainderNames)}</span>
              </>
            ) : (
              <span>
                {hasTotal ? "Each member gets an equal share" : "Enter an amount to preview the split"}
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="mt-3 border-t border-dashed border-line-strong pt-3">
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="text-ink-muted">
              {!hasTotal
                ? "Enter an amount"
                : exactComplete
                  ? "Fully allocated"
                  : remainingSatang < 0
                    ? "Over-allocated"
                    : "Remaining"}
            </span>
            <span
              className={`font-mono font-medium tabular-nums ${
                !hasTotal
                  ? "text-ink-muted"
                  : exactComplete
                    ? "text-positive"
                    : remainingSatang < 0
                      ? "text-negative"
                      : "text-accent"
              }`}
            >
              {hasTotal ? `${formatSatang(Math.abs(remainingSatang))} THB` : "—"}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-raised">
            <div
              className={`h-full rounded-full ${
                exactComplete ? "bg-positive" : remainingSatang < 0 ? "bg-negative" : "bg-accent"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
        <p className="text-[11px] leading-4 text-ink-muted">
          {mode === "equal"
            ? hasTotal
              ? "Remainder follows member order"
              : "Amounts in THB"
            : "Shares must equal the total"}
        </p>
        {hasTotal && (mode === "equal" || exactComplete) ? (
          <span className="inline-flex -rotate-2 items-center gap-1 rounded-[4px] border-2 border-ink/60 px-2 py-1 font-mono text-[11px] font-medium text-ink/80">
            <Check size={16} strokeWidth={1.5} aria-hidden />
            Balanced
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function shareRows(shares: Share[]): PreviewRow[] {
  return shares.map((share) => ({
    username: share.username,
    amountSatang: share.amountSatang,
  }));
}
