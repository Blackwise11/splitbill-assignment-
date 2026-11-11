"use client";

import { useEffect, useRef, useState } from "react";

import { errorMessage, getGroups } from "@/lib/api";
import type { Group, User } from "@/lib/types";
import { ErrorBanner } from "@/components/ErrorBanner";
import { GroupList, GroupSignal } from "@/components/GroupList";
import { UserSwitcher, titleCase } from "@/components/UserSwitcher";

export default function SplitBillApp() {
  const [user, setUser] = useState<User>("alice");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupsRequest = useRef(0);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    const requestId = ++groupsRequest.current;
    let cancelled = false;

    getGroups(user)
      .then((fetched) => {
        if (cancelled || requestId !== groupsRequest.current) return;
        setGroups(fetched);
        setSelectedGroupId((current) => {
          if (current !== null && fetched.some((group) => group.id === current)) return current;
          return fetched[0]?.id ?? null;
        });
      })
      .catch((caught: unknown) => {
        if (!cancelled && requestId === groupsRequest.current) {
          setError(errorMessage(caught));
        }
      })
      .finally(() => {
        if (!cancelled && requestId === groupsRequest.current) setGroupsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleUserChange(nextUser: User) {
    if (nextUser === user) return;
    groupsRequest.current += 1;
    setUser(nextUser);
    setGroups([]);
    setGroupsLoading(true);
    setSelectedGroupId(null);
    setError(null);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#f6f3ec]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-950 font-serif text-2xl font-semibold text-emerald-50 shadow-lg shadow-emerald-950/20">
              ฿
            </span>
            <div>
              <h1 className="font-serif text-xl font-semibold leading-none tracking-tight text-stone-950">
                SplitBill
              </h1>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                Exact to the last satang
              </p>
            </div>
          </div>
          <UserSwitcher activeUser={user} onChange={handleUserChange} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-2 px-4 pt-4 sm:px-6">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      </div>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-16 pt-5 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <GroupList
            groups={groups}
            selectedGroupId={selectedGroupId}
            loading={groupsLoading}
            onSelect={setSelectedGroupId}
          />
        </aside>

        <section className="space-y-5">
          {selectedGroup ? (
            <div className="rounded-3xl border border-stone-200/80 bg-white/70 p-6 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
                Active group · #{selectedGroup.id}
              </p>
              <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-stone-950">
                {selectedGroup.name}
              </h2>
              <div className="mt-4">
                <GroupSignal group={selectedGroup} />
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    Members
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-stone-900">
                    {selectedGroup.member_count}
                  </dd>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    Currency
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-stone-900">THB</dd>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                    Acting as
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-stone-900">{titleCase(user)}</dd>
                </div>
              </dl>
              <p className="mt-6 text-sm leading-6 text-stone-500">
                Select a group to scope every request. Only groups you belong to are ever returned
                by the API.
              </p>
            </div>
          ) : groupsLoading ? (
            <div className="space-y-5" aria-label="Loading workspace">
              <div className="h-28 animate-pulse rounded-3xl bg-white/70" />
              <div className="h-96 animate-pulse rounded-3xl bg-white/70" />
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white/60 px-6 text-center">
              <span className="font-serif text-6xl text-emerald-950/15">฿</span>
              <h2 className="mt-4 font-serif text-2xl font-semibold text-stone-800">
                {groups.length === 0 ? "No groups yet" : "Choose a group"}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                {groups.length === 0
                  ? `${titleCase(user)} is not a member of any group. Switch user to explore another workspace.`
                  : "Pick one of your groups on the left to see who is in it."}
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-stone-200/70 px-4 py-6 text-center text-[10px] uppercase tracking-[0.16em] text-stone-400 sm:px-6">
        Integer-satang accounting · PostgreSQL NUMERIC(12,2) · FastAPI · Next.js
      </footer>
    </div>
  );
}
