"use client";

import { useState, type FormEvent } from "react";

import { createExpense, errorMessage, newIdempotencyKey } from "@/lib/api";
import {
  allocateEqual,
  allocateExact,
  formatSatang,
  inspectAmount,
  parseSatang,
  satangToWire,
} from "@/lib/money";
import type { ExpenseCreate, Group, SplitType } from "@/lib/types";
import { Avatar, titleCase } from "@/components/UserSwitcher";
import { LiveSplitPreview, shareRows, type PreviewRow } from "@/components/LiveSplitPreview";

interface ExpenseFormProps {
  group: Group;
  activeUser: string;
  onCreated: () => Promise<void>;
}

export function ExpenseForm({ group, activeUser, onCreated }: ExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(activeUser);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(group.members);
  const [exactInputs, setExactInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.members.map((member) => [member, ""])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const totalSatang = amount.trim() ? parseSatang(amount) : null;
  const amountError = amount.trim() ? inspectAmount(amount).error : null;

  const equalRows = shareRows(
    selectedMembers.length === 0
      ? []
      : allocateEqual(totalSatang ?? 0, selectedMembers),
  );

  const exactRows: PreviewRow[] = group.members.map((member) => {
    const raw = exactInputs[member] ?? "";
    if (!raw.trim()) return { username: member, amountSatang: 0 };
    const satang = parseSatang(raw, { allowZero: true });
    return {
      username: member,
      amountSatang: satang ?? 0,
      invalid: satang === null,
    };
  });
  const visibleExactRows = exactRows.filter((row) => (exactInputs[row.username] ?? "").trim() !== "");
  const exactAllocation = allocateExact(totalSatang ?? 0, group.members, exactInputs);
  const hasInvalidExact = exactRows.some((row) => row.invalid);
  const exactBalanced =
    totalSatang !== null &&
    !hasInvalidExact &&
    visibleExactRows.length > 0 &&
    exactAllocation.remainingSatang === 0;

  const canSubmit =
    description.trim().length > 0 &&
    totalSatang !== null &&
    !submitting &&
    (splitType === "equal" ? selectedMembers.length > 0 : exactBalanced);

  function toggleMember(member: string) {
    setSelectedMembers((current) =>
      current.includes(member)
        ? current.filter((item) => item !== member)
        : group.members.filter((item) => current.includes(item) || item === member),
    );
  }

  function updateExactInput(member: string, value: string) {
    setExactInputs((current) => ({ ...current, [member]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (!canSubmit || totalSatang === null) return;

    const payload: ExpenseCreate = {
      description: description.trim(),
      paid_by: paidBy,
      amount: satangToWire(totalSatang),
      split:
        splitType === "equal"
          ? { type: "equal", members: selectedMembers }
          : {
              type: "exact",
              shares: Object.fromEntries(
                exactAllocation.shares.map((share) => [
                  share.username,
                  satangToWire(share.amountSatang),
                ]),
              ),
            },
    };

    try {
      setSubmitting(true);
      await createExpense(group.id, activeUser, payload, idempotencyKey);
      setIdempotencyKey(newIdempotencyKey());
      setDescription("");
      setAmount("");
      setExactInputs(Object.fromEntries(group.members.map((member) => [member, ""])));
      setSelectedMembers(group.members);
      setPaidBy(activeUser);
      await onCreated();
    } catch (error) {
      setLocalError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white/95 shadow-[0_24px_60px_-40px_rgba(28,25,23,0.65)]">
      <div className="border-b border-stone-200/80 bg-gradient-to-r from-stone-900 to-emerald-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/80">
              New expense
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
              Record it to the satang
            </h2>
          </div>
          <p className="max-w-xs text-xs leading-5 text-emerald-100/70">
            Expenses are immutable. Made a mistake? Delete it and record a new one.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)]">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="expense-description"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Description
              </label>
              <input
                id="expense-description"
                type="text"
                value={description}
                maxLength={200}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Dinner at the night market"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="expense-amount"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600"
                >
                  Amount
                </label>
                <div className="relative">
                  <input
                    id="expense-amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="1000.00"
                    aria-invalid={Boolean(amountError)}
                    aria-describedby={amountError ? "amount-error" : undefined}
                    className={`w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-14 text-right font-mono text-lg font-semibold tabular-nums text-stone-900 shadow-sm outline-none transition placeholder:text-stone-300 focus:ring-2 ${
                      amountError
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-stone-300 focus:border-emerald-700 focus:ring-emerald-700/20"
                    }`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-stone-400">
                    THB
                  </span>
                </div>
                {amountError ? (
                  <p id="amount-error" className="mt-1.5 text-xs text-rose-700">
                    {amountError}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="expense-payer"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600"
                >
                  Paid by
                </label>
                <select
                  id="expense-payer"
                  value={paidBy}
                  onChange={(event) => setPaidBy(event.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium text-stone-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                >
                  {group.members.map((member) => (
                    <option key={member} value={member}>
                      {titleCase(member)}
                      {member === activeUser ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                Split type
              </legend>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
                {(["equal", "exact"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={splitType === type}
                    onClick={() => setSplitType(type)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      splitType === type
                        ? "bg-white text-emerald-950 shadow-sm ring-1 ring-stone-200"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {type === "equal" ? "Equal split" : "Exact amounts"}
                  </button>
                ))}
              </div>
            </fieldset>

            {splitType === "equal" ? (
              <fieldset>
                <legend className="sr-only">Split between</legend>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Split between
                  </span>
                  <div className="flex gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setSelectedMembers(group.members)}
                      className="text-emerald-800 underline-offset-2 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMembers([])}
                      className="text-stone-500 underline-offset-2 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.members.map((member) => {
                    const checked = selectedMembers.includes(member);
                    return (
                      <label
                        key={member}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                          checked
                            ? "border-emerald-800/30 bg-emerald-50/80"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(member)}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-800 accent-emerald-800 focus:ring-emerald-700"
                        />
                        <Avatar username={member} size="sm" />
                        <span className="text-sm font-medium text-stone-800">
                          {titleCase(member)}
                          {member === activeUser ? (
                            <span className="ml-1 text-xs text-stone-500">(you)</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Exact amount per member
                </legend>
                <div className="space-y-2">
                  {group.members.map((member) => {
                    const raw = exactInputs[member] ?? "";
                    const invalid = raw.trim() !== "" && parseSatang(raw, { allowZero: true }) === null;
                    return (
                      <div
                        key={member}
                        className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2"
                      >
                        <Avatar username={member} size="sm" />
                        <span className="flex-1 text-sm font-medium text-stone-800">
                          {titleCase(member)}
                        </span>
                        <div className="relative w-36">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={raw}
                            onChange={(event) => updateExactInput(member, event.target.value)}
                            placeholder="0.00"
                            aria-label={`Share for ${titleCase(member)}`}
                            aria-invalid={invalid}
                            className={`w-full rounded-lg border py-1.5 pl-2.5 pr-10 text-right font-mono text-sm tabular-nums outline-none transition focus:ring-2 ${
                              invalid
                                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                                : "border-stone-300 focus:border-emerald-700 focus:ring-emerald-700/20"
                            }`}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-stone-400">
                            THB
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {localError ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800"
              >
                {localError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
              <p className="text-xs text-stone-500">
                Total{" "}
                <span className="font-mono font-semibold text-stone-800">
                  {totalSatang === null ? "0.00" : formatSatang(totalSatang)} THB
                </span>
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Recording…
                  </>
                ) : (
                  <>
                    Record expense
                    <span aria-hidden>→</span>
                  </>
                )}
              </button>
            </div>
            {splitType === "exact" && !exactBalanced && totalSatang !== null ? (
              <p className="text-right text-[11px] text-stone-500">
                Submit unlocks when the exact shares add up to the total.
              </p>
            ) : null}
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <LiveSplitPreview
              mode={splitType}
              totalSatang={totalSatang}
              rows={splitType === "equal" ? equalRows : visibleExactRows}
              remainingSatang={exactAllocation.remainingSatang}
              emptyMessage={
                splitType === "equal"
                  ? "Choose at least one member to preview the split."
                  : "Enter exact amounts on the left to see the remaining balance."
              }
            />
          </div>
        </div>
      </form>
    </section>
  );
}
