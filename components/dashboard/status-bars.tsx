import { StatusBadge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/format";

const barColor: Record<string, string> = {
  draft: "bg-slate-300",
  sent: "bg-blue-400",
  partial: "bg-amber-400",
  paid: "bg-emerald-400",
  overdue: "bg-red-400",
};

export function StatusBars({
  data,
  currencySymbol,
}: {
  data: { status: string; count: number; amount: number }[];
  currencySymbol: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>;
  }
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.status} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <StatusBadge status={d.status} />
            <span className="tabular-nums text-muted-foreground">
              {d.count} · {formatMoney(d.amount, currencySymbol)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full rounded-full ${barColor[d.status] ?? "bg-slate-300"}`}
              style={{ width: `${(d.count / maxCount) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
