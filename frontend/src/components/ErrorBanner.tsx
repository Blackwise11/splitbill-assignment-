"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

interface ErrorBannerProps {
  message: string | null;
  tone?: "error" | "success";
  onDismiss: () => void;
}

export function ErrorBanner({ message, tone = "error", onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "flex items-start gap-2.5 rounded-[10px] border border-negative/25 bg-[#fbf2ef] px-3 py-2.5 text-[13px] leading-5 text-negative"
          : "flex items-start gap-2.5 rounded-[10px] border border-positive/25 bg-[#f1f6f2] px-3 py-2.5 text-[13px] leading-5 text-positive"
      }
    >
      <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-[6px] p-0.5 opacity-60 transition-colors duration-150 hover:bg-ink/5 hover:opacity-100"
        aria-label="Dismiss message"
      >
        <X size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
