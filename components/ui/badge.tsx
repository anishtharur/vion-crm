import { cn } from "@/lib/utils/cn";
import { titleCase } from "@/lib/utils/format";

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground ring-border",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Solid, filled status pills in the enterprise / Zoho style — saturated colour
 * fills with white text, keyed by document status.
 */
const statusFill: Record<string, string> = {
  draft: "bg-slate-400",
  sent: "bg-sky-600",
  accepted: "bg-emerald-600",
  paid: "bg-emerald-600",
  partial: "bg-amber-500",
  overdue: "bg-rose-600",
  rejected: "bg-rose-600",
  expired: "bg-slate-400",
  confirmed: "bg-emerald-600",
  in_production: "bg-violet-600",
  fulfilled: "bg-emerald-600",
  cancelled: "bg-rose-600",
};

/** Replace underscores so "in_production" renders as "In production". */
function statusLabel(status: string): string {
  return titleCase(status.replace(/_/g, " "));
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium text-white",
        statusFill[status] ?? "bg-slate-400",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
