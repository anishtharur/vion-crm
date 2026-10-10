import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { deleteInvoiceRow } from "@/lib/actions/invoices";
import { listInvoices, INVOICE_SORT } from "@/lib/data/invoices";
import { parseListParams } from "@/lib/data/list-params";
import { currencySymbol } from "@/lib/utils/currency";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseListParams(await searchParams, {
    sortable: Object.keys(INVOICE_SORT),
  });
  const { rows, total, page, pageCount } = await listInvoices(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Bills you've issued and their payment status."
        actions={
          <Link href="/invoices/new" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        }
      />

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={ReceiptText}
            title="No invoices yet"
            description="Create an invoice or convert an accepted quote."
            action={
              <Link
                href="/invoices/new"
                className={buttonClass("primary", "md")}
              >
                <Plus className="h-4 w-4" />
                New invoice
              </Link>
            }
          />
        </div>
      ) : (
        <DataTable
          recordNoun="Invoices"
          sort={{ key: params.sort, dir: params.dir }}
          page={page}
          pageCount={pageCount}
          total={total}
          columns={[
            { header: "Number", sortKey: "number" },
            { header: "Client", sortKey: "client" },
            { header: "Due", sortKey: "due" },
            { header: "Status" },
            { header: "Total", align: "right", sortKey: "total" },
            { header: "Balance", align: "right", sortKey: "balance" },
          ]}
          rows={rows.map((inv) => ({
            id: inv.id,
            delete: {
              action: deleteInvoiceRow.bind(null, inv.id),
              confirm: `Delete ${inv.number}? This cannot be undone.`,
            },
            cells: [
              <Link
                key="n"
                href={`/invoices/${inv.id}`}
                className="font-medium text-primary hover:underline"
              >
                {inv.number}
              </Link>,
              <div key="c">
                <Link
                  href={`/clients/${inv.clientId}`}
                  className="hover:text-primary"
                >
                  {inv.clientName}
                </Link>
                {inv.clientCompany ? (
                  <span className="block text-xs text-muted-foreground">
                    {inv.clientCompany}
                  </span>
                ) : null}
              </div>,
              <span key="d" className="text-muted-foreground">
                {formatDate(inv.dueDate)}
              </span>,
              <StatusBadge key="s" status={inv.displayStatus} />,
              <span key="t" className="font-medium">
                {formatMoney(inv.total, currencySymbol(inv.currency))}
              </span>,
              <span
                key="b"
                className={
                  inv.balance > 0
                    ? "font-medium text-destructive"
                    : "text-muted-foreground"
                }
              >
                {formatMoney(inv.balance, currencySymbol(inv.currency))}
              </span>,
            ],
          }))}
        />
      )}
    </div>
  );
}
