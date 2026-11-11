"use client";

import type { Group } from "@/lib/types";
import { Avatar, titleCase } from "@/components/UserSwitcher";

interface GroupListProps {
  groups: Group[];
  selectedGroupId: number | null;
  loading: boolean;
  onSelect: (groupId: number) => void;
}

export function GroupList({ groups, selectedGroupId, loading, onSelect }: GroupListProps) {
  return (
    <section className="rounded-3xl border border-stone-200/80 bg-white/90 p-5 shadow-[0_18px_50px_-35px_rgba(28,25,23,0.6)] backdrop-blur">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-lg font-semibold text-stone-900">Your groups</h2>
        <span className="text-xs font-medium text-stone-500">
          {groups.length} {groups.length === 1 ? "group" : "groups"}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3" aria-label="Loading groups">
          {[0, 1].map((key) => (
            <div key={key} className="h-[74px] animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
          You are not in any groups yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {groups.map((group) => {
            const selected = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(group.id)}
                className={`group w-full rounded-2xl border p-3.5 text-left transition ${
                  selected
                    ? "border-emerald-950 bg-emerald-950 text-white shadow-lg shadow-emerald-950/20"
                    : "border-stone-200 bg-stone-50/70 text-stone-900 hover:-translate-y-0.5 hover:border-emerald-800/40 hover:bg-white hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-5">{group.name}</p>
                    <p
                      className={`mt-0.5 text-xs ${selected ? "text-emerald-200/80" : "text-stone-500"}`}
                    >
                      Group #{group.id} · {group.member_count} members
                    </p>
                  </div>
                  <span
                    className={`text-lg leading-none transition group-hover:translate-x-0.5 ${
                      selected ? "text-emerald-300" : "text-stone-400"
                    }`}
                    aria-hidden
                  >
                    →
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {group.members.slice(0, 4).map((member) => (
                      <span
                        key={member}
                        title={titleCase(member)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-emerald-100 text-[10px] font-bold uppercase text-emerald-950"
                      >
                        {member.slice(0, 1)}
                      </span>
                    ))}
                  </div>
                  <span
                    className={`text-[11px] ${selected ? "text-emerald-100/75" : "text-stone-500"}`}
                  >
                    {group.members.map(titleCase).join(" · ")}
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
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {group.members.map((member) => (
          <Avatar key={member} username={member} size="sm" />
        ))}
      </div>
      <span className="text-sm text-stone-600">{group.members.map(titleCase).join(", ")}</span>
    </div>
  );
}
