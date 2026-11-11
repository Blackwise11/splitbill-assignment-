"use client";

import { ChevronRight, RefreshCw } from "lucide-react";

import type { Group } from "@/lib/types";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface GroupListProps {
  groups: Group[];
  selectedGroupId: number | null;
  loading: boolean;
  onSelect: (groupId: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function GroupList({
  groups,
  selectedGroupId,
  loading,
  onSelect,
  onRefresh,
  refreshing = false,
}: GroupListProps) {
  return (
    <section className="rounded-[14px] border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-medium text-ink">Your groups</h2>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] text-ink-muted">
            {groups.length} {groups.length === 1 ? "group" : "groups"}
          </span>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh group data"
              title="Refresh group data"
              className="rounded-[6px] p-0.5 text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink disabled:opacity-50"
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
      </div>

      {loading ? (
        <div className="space-y-2" aria-label="Loading groups">
          {[0, 1].map((key) => (
            <div key={key} className="h-[66px] rounded-[10px] bg-raised" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-line-strong px-3 py-4 text-[13px] text-ink-muted">
          You are not in any groups yet
        </p>
      ) : (
        <div className="space-y-1">
          {groups.map((group) => {
            const selected = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(group.id)}
                className={`group relative w-full rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 ${
                  selected
                    ? "bg-ink text-paper"
                    : "text-ink hover:bg-raised/80"
                }`}
              >
                {selected ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-2.5 left-0 w-[2px] rounded-full bg-accent"
                  />
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium leading-5">{group.name}</p>
                    <p
                      className={`mt-0.5 text-[12px] leading-4 ${
                        selected ? "text-paper/70" : "text-ink-muted"
                      }`}
                    >
                      {group.member_count} members
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden
                    className={`mt-0.5 shrink-0 ${
                      selected ? "text-paper/50" : "text-ink-muted/50"
                    }`}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {group.members.slice(0, 4).map((member) => (
                      <span
                        key={member}
                        title={titleCase(member)}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[9px] font-medium ${
                          selected
                            ? "border-paper/25 bg-paper/15 text-paper"
                            : "border-line bg-raised text-ink-soft"
                        }`}
                      >
                        {member.slice(0, 1)}
                      </span>
                    ))}
                  </div>
                  <span
                    className={`truncate text-[11px] ${
                      selected ? "text-paper/70" : "text-ink-muted"
                    }`}
                  >
                    {group.members.map(titleCase).join(", ")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function GroupSignal({ group }: { group: Group }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex -space-x-1">
        {group.members.map((member) => (
          <Avatar key={member} username={member} size="sm" />
        ))}
      </div>
      <span className="text-[13px] text-ink-soft">{group.members.map(titleCase).join(", ")}</span>
    </div>
  );
}
