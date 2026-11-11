"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createPayment,
  deleteExpense,
  errorMessage,
  getBalances,
  getExpenses,
  getGroups,
  getSettleUp,
  newIdempotencyKey,
} from "@/lib/api";
import type { Balances, Expense, Group, SettleUp, Transfer, User } from "@/lib/types";
import { BalancesPanel } from "@/components/BalancesPanel";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseTable } from "@/components/ExpenseTable";
import { GroupList, GroupSignal } from "@/components/GroupList";
import { SettleUpPanel } from "@/components/SettleUpPanel";
import { UserSwitcher, titleCase } from "@/components/UserSwitcher";

export default function SplitBillApp() {
  const [user, setUser] = useState<User>("alice");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [settleUp, setSettleUp] = useState<SettleUp | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const groupsRequest = useRef(0);
  const dataRequest = useRef(0);

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

  const refreshData = useCallback(async (groupId: number, actor: string) => {
    const requestId = ++dataRequest.current;
    setDataLoading(true);
    try {
      const [expenseResult, balanceResult, settlementResult] = await Promise.all([
        getExpenses(groupId, actor),
        getBalances(groupId, actor),
        getSettleUp(groupId, actor),
      ]);
      if (requestId !== dataRequest.current) return;
      setExpenses(expenseResult.expenses);
      setBalances(balanceResult);
      setSettleUp(settlementResult);
    } catch (caught: unknown) {
      if (requestId === dataRequest.current) setError(errorMessage(caught));
    } finally {
      if (requestId === dataRequest.current) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId === null) {
      dataRequest.current += 1;
      return;
    }
    // Client-side fetch effect: the loading flag is intentionally updated here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshData(selectedGroupId, user);
  }, [refreshData, selectedGroupId, user]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function handleSelectGroup(groupId: number) {
    if (groupId === selectedGroupId) return;
    dataRequest.current += 1;
    setSelectedGroupId(groupId);
    setExpenses([]);
    setBalances(null);
    setSettleUp(null);
    setError(null);
    setDataLoading(true);
  }

  function handleUserChange(nextUser: User) {
    if (nextUser === user) return;
    groupsRequest.current += 1;
    dataRequest.current += 1;
    setUser(nextUser);
    setGroups([]);
    setGroupsLoading(true);
    setSelectedGroupId(null);
    setExpenses([]);
    setBalances(null);
    setSettleUp(null);
    setDataLoading(false);
    setError(null);
    setNotice(null);
  }

  async function handleCreated() {
    if (selectedGroupId === null) return;
    await refreshData(selectedGroupId, user);
    setNotice("Expense recorded. Every share is allocated to the exact satang.");
  }

  async function handleDelete(expenseId: number) {
    if (selectedGroupId === null) return;
    try {
      await deleteExpense(selectedGroupId, expenseId, user);
      await refreshData(selectedGroupId, user);
      setNotice("Expense deleted. It is retained as a soft-delete audit row.");
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    }
  }

  async function handleRecordPayment(transfer: Transfer) {
    if (selectedGroupId === null) return;
    try {
      await createPayment(
        selectedGroupId,
        user,
        {
          from_user: transfer.from_user,
          to_user: transfer.to_user,
          amount: transfer.amount,
          note: "Recorded from settle-up suggestion",
        },
        newIdempotencyKey(),
      );
      await refreshData(selectedGroupId, user);
      setNotice(
        `Repayment from ${titleCase(transfer.from_user)} to ${titleCase(transfer.to_user)} recorded.`,
      );
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    }
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
        <ErrorBanner message={notice} tone="success" onDismiss={() => setNotice(null)} />
      </div>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-16 pt-5 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <GroupList
            groups={groups}
            selectedGroupId={selectedGroupId}
            loading={groupsLoading}
            onSelect={handleSelectGroup}
          />
          {selectedGroup ? (
            <>
              <BalancesPanel
                balances={balances}
                activeUser={user}
                loading={dataLoading}
              />
              <SettleUpPanel
                settleUp={settleUp}
                activeUser={user}
                loading={dataLoading}
                onRecordPayment={handleRecordPayment}
              />
            </>
          ) : null}
        </aside>

        <section className="space-y-5">
          {selectedGroup ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200/80 bg-white/60 px-5 py-4 backdrop-blur">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
                    Active group · #{selectedGroup.id}
                  </p>
                  <h2 className="mt-0.5 font-serif text-2xl font-semibold tracking-tight text-stone-950">
                    {selectedGroup.name}
                  </h2>
                  <div className="mt-2">
                    <GroupSignal group={selectedGroup} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dataLoading ? (
                    <span className="flex items-center gap-2 text-[11px] font-medium text-stone-500">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-800" />
                      Syncing
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void refreshData(selectedGroup.id, user)}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600 shadow-sm transition hover:border-emerald-800/30 hover:text-emerald-900"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className={dataLoading ? "opacity-70 transition-opacity duration-200" : ""}>
                <ExpenseForm
                  key={`${selectedGroup.id}-${user}`}
                  group={selectedGroup}
                  activeUser={user}
                  onCreated={handleCreated}
                />
              </div>

              <ExpenseTable
                expenses={expenses}
                activeUser={user}
                loading={dataLoading}
                onDelete={handleDelete}
              />
            </>
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
                  : "Pick one of your groups on the left to see balances and record an expense."}
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
