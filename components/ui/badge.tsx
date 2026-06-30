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

const statusTone: Record<string, Tone> = {
  draft: "neutral",
  sent: "blue",
  accepted: "green",
  paid: "green",
  partial: "amber",
  overdue: "red",
  rejected: "red",
  expired: "neutral",
  confirmed: "green",
  in_production: "violet",
  fulfilled: "green",
  cancelled: "red",
};

/** Replace underscores so "in_production" renders as "In production". */
function statusLabel(status: string): string {
  return titleCase(status.replace(/_/g, " "));
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{statusLabel(status)}</Badge>;
}
