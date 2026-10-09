import { cn } from "@/lib/utils/cn";

/** Card-wrapped, horizontally-scrollable table container. */
export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">{children}</table>
      </div>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "border-b border-border bg-surface-muted/60 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-border/60 px-3 py-2 text-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}
