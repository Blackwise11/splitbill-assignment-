"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";

import { createExpense, errorMessage, newIdempotencyKey } from "@/lib/api";
import { calculateEqualSplit } from "@/lib/format";
import {
  allocateExact,
  formatSatang,
  inspectAmount,
  parseSatang,
  satangToWire,
} from "@/lib/money";
import type { ExpenseCreate, Group, SplitType } from "@/lib/types";
import { SectionHeading } from "@/components/SectionHeading";
import { Avatar, titleCase } from "@/components/UserSwitcher";
import { LiveSplitPreview, type PreviewRow } from "@/components/LiveSplitPreview";

interface ExpenseFormProps {
  group: Group;
  activeUser: string;
  onCreated: () => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-line bg-card px-3 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-muted/80 focus:border-accent/60 focus:ring-2 focus:ring-accent/15";

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

  const equalAllocation = calculateEqualSplit(amount, selectedMembers);
  const equalRows: PreviewRow[] = selectedMembers.map((username) => ({
    username,
    amountSatang: parseSatang(equalAllocation[username] ?? "0.00", { allowZero: true }) ?? 0,
  }));

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
  const visibleExactRows = exactRows.filter(
    (row) => (exactInputs[row.username] ?? "").trim() !== "",
  );
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
    <section className="rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-line px-5 pt-5 pb-4">
        <SectionHeading title="Record Expense" />
        <p className="-mt-1 text-[12px] leading-5 text-ink-soft">
          Recorded once, then immutable. Delete and add again to correct a mistake.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <div>
          <label
            htmlFor="expense-description"
            className="mb-1.5 block text-[12px] font-semibold text-ink-soft"
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
            className={`${inputClass} h-11`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="expense-amount"
              className="mb-1.5 block text-[12px] font-semibold text-ink-soft"
            >
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[14px] text-ink-muted">
                ฿
              </span>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                aria-invalid={Boolean(amountError)}
                aria-describedby={amountError ? "amount-error" : undefined}
                className={`${inputClass} h-11 pl-8 text-right font-mono text-[18px] font-medium tabular-nums ${
                  amountError
                    ? "border-negative/50 focus:border-negative focus:ring-negative/15"
                    : ""
                }`}
              />
            </div>
            {amountError ? (
              <p id="amount-error" className="mt-1.5 text-[12px] text-negative">
                {amountError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="expense-payer"
              className="mb-1.5 block text-[12px] font-semibold text-ink-soft"
            >
              Paid by
            </label>
            <select
              id="expense-payer"
              value={paidBy}
              onChange={(event) => setPaidBy(event.target.value)}
              className={`${inputClass} h-11`}
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
          <legend className="mb-1.5 text-[12px] font-semibold text-ink-soft">Split type</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-raised p-1">
            {(["equal", "exact"] as const).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={splitType === type}
                onClick={() => setSplitType(type)}
                className={`h-8 rounded-md text-[13px] font-semibold transition-colors duration-150 ${
                  splitType === type ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {type === "equal" ? "Equal Split" : "Exact Split"}
              </button>
            ))}
          </div>
        </fieldset>

        {splitType === "equal" ? (
          <fieldset aria-label="Split between">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-ink-soft">Split between</span>
              <div className="flex gap-2 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedMembers(group.members)}
                  className="text-accent-dark underline-offset-2 hover:underline"
                >
                  Select all
                </button>
                <span className="text-line-strong">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedMembers([])}
                  className="text-ink-muted underline-offset-2 hover:underline"
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
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
                      checked
                        ? "border-accent/40 bg-accent-subtle"
                        : "border-line bg-card hover:bg-raised/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(member)}
                      className="h-4 w-4 rounded border-line accent-[#d97706]"
                    />
                    <Avatar username={member} size="sm" />
                    <span className="text-[13px] font-medium text-ink">
                      {titleCase(member)}
                      {member === activeUser ? (
                        <span className="ml-1 text-[11px] font-normal text-ink-muted">(you)</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <fieldset>
            <legend className="mb-2 text-[12px] font-semibold text-ink-soft">
              Exact share per member
            </legend>
            <div className="divide-y divide-line rounded-lg border border-line bg-card">
              {group.members.map((member) => {
                const raw = exactInputs[member] ?? "";
                const invalid =
                  raw.trim() !== "" && parseSatang(raw, { allowZero: true }) === null;
                return (
                  <div key={member} className="flex items-center gap-2.5 px-3 py-2">
                    <Avatar username={member} size="sm" />
                    <span className="flex-1 text-[13px] font-medium text-ink">
                      {titleCase(member)}
                    </span>
                    <div className="relative w-32">
                      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center font-mono text-[10px] text-ink-muted">
                        ฿
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={raw}
                        onChange={(event) => updateExactInput(member, event.target.value)}
                        placeholder="0.00"
                        aria-label={`Share for ${titleCase(member)}`}
                        aria-invalid={invalid}
                        className={`h-8 w-full rounded-md border bg-card pl-5 pr-2 text-right font-mono text-[13px] tabular-nums outline-none transition-colors duration-150 focus:ring-2 ${
                          invalid
                            ? "border-negative/50 focus:border-negative focus:ring-negative/15"
                            : "border-line focus:border-accent/60 focus:ring-accent/15"
                        }`}
                      />
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
            className="flex items-start gap-2 rounded-lg border border-negative/20 bg-negative-bg px-3 py-2.5 text-[13px] leading-5 text-negative"
          >
            <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
            <span>{localError}</span>
          </div>
        ) : null}

        <LiveSplitPreview
          mode={splitType}
          totalSatang={totalSatang}
          rows={splitType === "equal" ? equalRows : visibleExactRows}
          remainingSatang={exactAllocation.remainingSatang}
          emptyMessage={
            splitType === "equal"
              ? "Choose at least one member to preview the split"
              : "Enter exact amounts to see what remains"
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[12px] text-ink-soft">
            Total{" "}
            <span className="font-mono font-semibold tabular-nums text-ink">
              {totalSatang === null ? "0.00" : formatSatang(totalSatang)} ฿
            </span>
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-ink px-5 text-[13px] font-semibold text-card transition-[background-color,color,transform] duration-150 hover:bg-stone-800 active:scale-[0.99] disabled:bg-raised disabled:text-ink-muted disabled:active:scale-100"
          >
            {submitting ? "Recording…" : "Record Expense"}
            {!submitting ? <ArrowRight size={16} strokeWidth={1.5} aria-hidden /> : null}
          </button>
        </div>
        {splitType === "exact" && !exactBalanced && totalSatang !== null ? (
          <p className="text-right text-[11px] text-ink-muted">
            Add shares until the unallocated amount is 0.00
          </p>
        ) : null}
      </form>
    </section>
  );
}
