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
  const dimensions = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-[11px]";
  return (
    <span
      aria-hidden
      className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-raised font-mono font-medium text-ink-soft`}
    >
      {username.slice(0, 1)}
    </span>
  );
}

export function UserSwitcher({ activeUser, onChange, disabled }: UserSwitcherProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar username={activeUser} size="sm" />
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor="active-user"
          className="text-[12px] leading-4 text-ink-muted"
        >
          Acting as
        </label>
        <select
          id="active-user"
          value={activeUser}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as User)}
          className="h-8 cursor-pointer rounded-[8px] border border-line bg-card px-2.5 text-[13px] font-medium text-ink outline-none transition-colors duration-150 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:cursor-wait disabled:opacity-60"
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
