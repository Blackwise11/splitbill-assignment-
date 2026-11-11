"use client";

interface ErrorBannerProps {
  message: string | null;
  tone?: "error" | "success";
  onDismiss: () => void;
}

export function ErrorBanner({ message, tone = "error", onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "mx-auto flex w-full max-w-7xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm"
          : "mx-auto flex w-full max-w-7xl items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
      }
    >
      <span aria-hidden className="mt-0.5 text-base leading-none">
        {isError ? "!" : "✓"}
      </span>
      <p className="flex-1 leading-6">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide opacity-60 transition hover:bg-white/60 hover:opacity-100"
        aria-label="Dismiss message"
      >
        Close
      </button>
    </div>
  );
}
