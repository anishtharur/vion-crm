import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "group h-full rounded-2xl border p-5 shadow-[var(--shadow-soft)] transition-colors",
        accent
          ? "border-transparent bg-brand-gradient text-white"
          : "border-border bg-surface hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm font-medium", accent ? "text-white/80" : "text-muted-foreground")}>
          {label}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            accent ? "bg-white/20 text-white" : "bg-surface-muted text-primary",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className={cn("mt-3 font-display text-2xl font-semibold tabular-nums", accent && "text-white")}>
        {value}
      </p>
      {hint ? (
        <p className={cn("mt-1 text-xs", accent ? "text-white/80" : "text-muted-foreground")}>{hint}</p>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}
