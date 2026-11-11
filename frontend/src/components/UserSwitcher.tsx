"use client";

import { USERS, type User } from "@/lib/types";

interface UserSwitcherProps {
  activeUser: string;
  onChange: (user: User) => void;
  disabled?: boolean;
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function Avatar({ username, size = "md" }: { username: string; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span
      aria-hidden
      className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-900 font-semibold uppercase tracking-wide text-emerald-50 ring-2 ring-white`}
    >
      {username.slice(0, 1)}
    </span>
  );
}

export function UserSwitcher({ activeUser, onChange, disabled }: UserSwitcherProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar username={activeUser} />
      <div className="flex flex-col">
        <label
          htmlFor="active-user"
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500"
        >
          Acting as
        </label>
        <select
          id="active-user"
          value={activeUser}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as User)}
          className="cursor-pointer rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-wait"
        >
          {USERS.map((user) => (
            <option key={user} value={user}>
              {titleCase(user)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
