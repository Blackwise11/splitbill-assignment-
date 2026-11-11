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
import { GroupSummary } from "@/components/GroupSummary";
import { GroupTabs } from "@/components/GroupTabs";
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
    setNotice("Expense recorded · balances updated");
  }

  async function handleDelete(expenseId: number) {
    if (selectedGroupId === null) return;
    try {
      await deleteExpense(selectedGroupId, expenseId, user);
      await refreshData(selectedGroupId, user);
      setNotice("Expense deleted · balances updated");
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
        `Repayment recorded from ${titleCase(transfer.from_user)} to ${titleCase(transfer.to_user)}`,
      );
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="h-8 w-1.5 -rotate-3 rounded-full bg-accent"
                />
                <div>
                  <p className="text-[20px] font-bold leading-5 tracking-[-0.02em] text-ink">
                    Chowpa
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                    SplitBill
                  </p>
                </div>
              </div>
              <span className="hidden items-center rounded-full border border-accent/30 bg-accent-soft/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-dark md:inline-flex">
                Project brief · SplitBill
              </span>
            </div>
            <UserSwitcher activeUser={user} onChange={handleUserChange} />
          </div>

          <div className="flex items-center gap-3 border-t border-line py-2.5">
            <GroupTabs
              groups={groups}
              selectedGroupId={selectedGroupId}
              loading={groupsLoading}
              onSelect={handleSelectGroup}
              onRefresh={
                selectedGroup ? () => void refreshData(selectedGroup.id, user) : undefined
              }
              refreshing={dataLoading}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] space-y-2 px-4 pt-4 sm:px-6 lg:px-8">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <ErrorBanner message={notice} tone="success" onDismiss={() => setNotice(null)} />
      </div>

      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 pt-5 pb-14 sm:px-6 lg:px-8">
        {selectedGroup ? (
          <>
            <GroupSummary group={selectedGroup} balances={balances} activeUser={user} />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <ExpenseForm
                key={`${selectedGroup.id}-${user}`}
                group={selectedGroup}
                activeUser={user}
                onCreated={handleCreated}
              />

              <div className="space-y-6">
                <BalancesPanel balances={balances} activeUser={user} loading={dataLoading} />
                <SettleUpPanel
                  settleUp={settleUp}
                  activeUser={user}
                  loading={dataLoading}
                  onRecordPayment={handleRecordPayment}
                />
                <ExpenseTable
                  expenses={expenses}
                  activeUser={user}
                  loading={dataLoading}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </>
        ) : groupsLoading ? (
          <div className="space-y-6" aria-label="Loading workspace">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-28 rounded-xl bg-raised" />
              <div className="h-28 rounded-xl bg-raised" />
              <div className="h-28 rounded-xl bg-raised" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="h-96 rounded-xl bg-raised" />
              <div className="h-96 rounded-xl bg-raised" />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-line bg-card px-6 text-center">
            <span className="font-mono text-[42px] leading-none text-accent/30">฿</span>
            <h2 className="mt-3 text-[20px] font-bold text-ink">
              {groups.length === 0 ? "No groups yet" : "Choose a group"}
            </h2>
            <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-soft">
              {groups.length === 0
                ? `${titleCase(user)} is not a member of any group. Switch user to see another workspace`
                : "Pick one of your groups to see balances and record an expense"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
