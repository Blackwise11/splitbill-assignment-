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
      setNotice(`Repayment recorded from ${titleCase(transfer.from_user)} to ${titleCase(transfer.to_user)}`);
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-ink/25 font-mono text-[17px] font-medium text-ink">
              ฿
            </span>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-5 tracking-[-0.01em] text-ink">
                SplitBill
              </p>
              <p className="hidden truncate text-[12px] leading-4 text-ink-muted sm:block">
                Shared expenses, settled to the satang
              </p>
            </div>
          </div>
          <UserSwitcher activeUser={user} onChange={handleUserChange} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] space-y-2 px-4 pt-4 sm:px-6 lg:px-8">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <ErrorBanner message={notice} tone="success" onDismiss={() => setNotice(null)} />
      </div>

      <main className="mx-auto grid w-full max-w-[1440px] gap-5 px-4 pb-12 pt-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <aside className="space-y-4">
          <GroupList
            groups={groups}
            selectedGroupId={selectedGroupId}
            loading={groupsLoading}
            onSelect={handleSelectGroup}
            onRefresh={
              selectedGroup ? () => void refreshData(selectedGroup.id, user) : undefined
            }
            refreshing={dataLoading}
          />
          {selectedGroup ? (
            <>
              <BalancesPanel balances={balances} activeUser={user} loading={dataLoading} />
              <SettleUpPanel
                settleUp={settleUp}
                activeUser={user}
                loading={dataLoading}
                onRecordPayment={handleRecordPayment}
              />
            </>
          ) : null}
        </aside>

        <section className="min-w-0 space-y-4">
          {selectedGroup ? (
            <>
              <div className="hidden flex-wrap items-end justify-between gap-4 border-b border-line pb-4 lg:flex">
                <div className="min-w-0">
                  <p className="text-[12px] leading-4 text-ink-muted">
                    Group {selectedGroup.id} · {selectedGroup.member_count} members
                  </p>
                  <h2 className="mt-1 truncate text-[28px] font-medium leading-8 tracking-[-0.02em] text-ink">
                    {selectedGroup.name}
                  </h2>
                  <div className="mt-2">
                    <GroupSignal group={selectedGroup} />
                  </div>
                </div>
              </div>

              <div
                className={
                  dataLoading ? "opacity-70 transition-opacity duration-200" : undefined
                }
              >
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
            <div className="space-y-4" aria-label="Loading workspace">
              <div className="h-24 rounded-[14px] bg-raised" />
              <div className="h-80 rounded-[14px] bg-raised" />
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[14px] border border-line bg-card px-6 text-center">
              <span className="font-mono text-[42px] leading-none text-ink/15">฿</span>
              <h2 className="mt-3 text-[20px] font-medium text-ink">
                {groups.length === 0 ? "No groups yet" : "Choose a group"}
              </h2>
              <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-muted">
                {groups.length === 0
                  ? `${titleCase(user)} is not a member of any group. Switch user to see another workspace`
                  : "Pick one of your groups to see balances and record an expense"}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
