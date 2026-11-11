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
  const dimensions = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]";
  return (
    <span
      aria-hidden
      className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft font-mono font-semibold text-accent-dark`}
    >
      {username.slice(0, 1)}
    </span>
  );
}

export function UserSwitcher({ activeUser, onChange, disabled }: UserSwitcherProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <Avatar username={activeUser} />
      <label htmlFor="active-user" className="sr-only">
        Acting as
      </label>
      <select
        id="active-user"
        value={activeUser}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as User)}
        className="h-7 cursor-pointer rounded-full border-0 bg-transparent text-[13px] font-semibold text-ink outline-none transition-colors duration-150 focus:ring-2 focus:ring-accent/20 disabled:cursor-wait disabled:opacity-60"
      >
        {USERS.map((user) => (
          <option key={user} value={user}>
            {titleCase(user)}
          </option>
        ))}
      </select>
      <span className="hidden rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] text-ink-soft md:inline">
        X-User: {activeUser}
      </span>
    </div>
  );
}
