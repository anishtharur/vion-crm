"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils/cn";
import type { FormState } from "@/lib/validation/schemas";

export type DataColumn = {
  header: string;
  align?: "left" | "right" | "center";
  /** When set, the header becomes a sort link driving `?sort=&dir=`. */
  sortKey?: string;
  className?: string;
};

export type RowDelete = {
  /** Bound server action that deletes the row and returns a FormState. */
  action: () => Promise<FormState>;
  confirm?: string;
};

export type DataRow = {
  id: string | number;
  cells: React.ReactNode[];
  delete?: RowDelete;
};

const alignClass = (align?: DataColumn["align"]) =>
  align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

/**
 * Dense enterprise data table with row selection, server-driven sortable sticky
 * headers (via URL search params), a per-row delete action (themed confirm) and
 * a paginated record-count footer. Pagination/sort are applied server-side; this
 * component only renders the current page and links to others.
 */
export function DataTable({
  columns,
  rows,
  recordNoun = "Records",
  sort,
  page = 1,
  pageCount = 1,
  total,
  selectable = true,
}: {
  columns: DataColumn[];
  rows: DataRow[];
  recordNoun?: string;
  sort?: { key: string | null; dir: "asc" | "desc" };
  page?: number;
  pageCount?: number;
  total?: number;
  selectable?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { confirm: ask, alert } = useConfirm();

  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [, startDelete] = useTransition();

  const recordTotal = total ?? rows.length;
  const hasDelete = rows.some((r) => r.delete);

  function hrefWith(updates: Record<string, string | number | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, String(v));
    }
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function sortHref(key: string) {
    const nextDir = sort?.key === key && sort.dir === "asc" ? "desc" : "asc";
    return hrefWith({ sort: key, dir: nextDir, page: 1 });
  }

  const allSelected = selected.size > 0 && selected.size === rows.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: string | number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function onDelete(row: DataRow) {
    if (!row.delete) return;
    const ok = await ask({
      title: "Delete",
      message: row.delete.confirm ?? "Delete this record? This cannot be undone.",
      confirmLabel: "Delete",
      tone: "destructive",
    });
    if (!ok) return;
    setDeletingId(row.id);
    startDelete(async () => {
      const res = await row.delete!.action();
      setDeletingId(null);
      if (res && !res.ok && res.message) {
        await alert({ title: "Couldn’t delete", message: res.message });
        return;
      }
      router.refresh();
    });
  }

  const checkboxClass =
    "h-3.5 w-3.5 cursor-pointer rounded border-input align-middle accent-[var(--color-primary)]";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
      <div className="max-h-[calc(100dvh-15rem)] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-muted">
              {selectable ? (
                <th className="w-10 border-b border-border px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className={checkboxClass}
                  />
                </th>
              ) : null}
              {columns.map((c, i) => {
                const active = sort?.key && c.sortKey === sort.key;
                return (
                  <th
                    key={i}
                    className={cn(
                      "whitespace-nowrap border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      alignClass(c.align),
                      c.className,
                    )}
                  >
                    {c.sortKey ? (
                      <Link
                        href={sortHref(c.sortKey)}
                        scroll={false}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                          c.align === "right" && "flex-row-reverse",
                          active && "text-foreground",
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </Link>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {hasDelete ? <th className="w-12 border-b border-border px-3 py-2.5" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={cn(
                  "border-b border-border/60 transition-colors last:border-0",
                  selected.has(r.id) ? "bg-primary/5" : "hover:bg-surface-muted/60",
                  deletingId === r.id && "opacity-50",
                )}
              >
                {selectable ? (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      aria-label="Select row"
                      className={checkboxClass}
                    />
                  </td>
                ) : null}
                {r.cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      "px-3 py-2 text-foreground",
                      alignClass(columns[ci]?.align),
                      columns[ci]?.className,
                    )}
                  >
                    {cell}
                  </td>
                ))}
                {hasDelete ? (
                  <td className="px-3 py-2 text-right">
                    {r.delete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(r)}
                        disabled={deletingId === r.id}
                        aria-label="Delete row"
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span>{selected.size > 0 ? `${selected.size} selected` : ""}</span>
        <div className="flex items-center gap-4">
          <span className="tabular-nums">
            Total {recordNoun}: {recordTotal.toLocaleString()}
          </span>
          {pageCount > 1 ? (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <PageLink href={hrefWith({ page: page - 1 })} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </PageLink>
              <span className="px-1 tabular-nums">
                Page {page} of {pageCount}
              </span>
              <PageLink href={hrefWith({ page: page + 1 })} disabled={page >= pageCount}>
                <ChevronRight className="h-4 w-4" />
              </PageLink>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className={cn(buttonClass("ghost", "sm"), "pointer-events-none opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} className={buttonClass("ghost", "sm")}>
      {children}
    </Link>
  );
}
