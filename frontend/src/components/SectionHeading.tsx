import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  meta?: ReactNode;
  className?: string;
}

export function SectionHeading({ title, meta, className = "" }: SectionHeadingProps) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-block h-6 w-1.5 shrink-0 rounded-full bg-accent"
        />
        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      </div>
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </div>
  );
}
