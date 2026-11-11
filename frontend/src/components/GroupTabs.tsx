"use client";

import { RefreshCw } from "lucide-react";

import type { Group } from "@/lib/types";

interface GroupTabsProps {
  groups: Group[];
  selectedGroupId: number | null;
  loading: boolean;
  onSelect: (groupId: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function GroupTabs({
  groups,
  selectedGroupId,
  loading,
  onSelect,
  onRefresh,
  refreshing = false,
}: GroupTabsProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:inline">
        Groups
      </span>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-line bg-card p-1 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {loading ? (
          <>
            <div className="h-7 w-28 rounded-full bg-raised" />
            <div className="h-7 w-24 rounded-full bg-raised" />
          </>
        ) : groups.length === 0 ? (
          <span className="px-3 py-1.5 text-[12px] text-ink-muted">No groups</span>
        ) : (
          groups.map((group) => {
            const selected = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(group.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
                  selected
                    ? "bg-ink text-card"
                    : "text-ink-soft hover:bg-raised hover:text-ink"
                }`}
              >
                <span className="whitespace-nowrap">{group.name}</span>
                <span
                  className={`font-mono text-[10px] ${
                    selected ? "text-card/60" : "text-ink-muted"
                  }`}
                >
                  {group.member_count}
                </span>
              </button>
            );
          })
        )}
      </div>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh group data"
          title="Refresh group data"
          className="shrink-0 rounded-full border border-line bg-card p-1.5 text-ink-soft transition-colors duration-150 hover:bg-raised hover:text-ink disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            strokeWidth={1.5}
            aria-hidden
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      ) : null}
    </div>
  );
}
