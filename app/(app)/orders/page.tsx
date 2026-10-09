import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { deleteOrderRow } from "@/lib/actions/orders";
import { listOrders, ORDER_SORT } from "@/lib/data/orders";
import { parseListParams } from "@/lib/data/list-params";
import { currencySymbol } from "@/lib/utils/currency";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseListParams(await searchParams, { sortable: Object.keys(ORDER_SORT) });
  const { rows, total, page, pageCount } = listOrders(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order acknowledgements"
        description="Confirmed sales orders awaiting fulfilment."
        actions={
          <Link href="/orders/new" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" />
            New order
          </Link>
        }
      />

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={ClipboardList}
            title="No orders yet"
            description="Acknowledge an order directly or convert one from a quote."
            action={
              <Link href="/orders/new" className={buttonClass("primary", "md")}>
                <Plus className="h-4 w-4" />
                New order
              </Link>
            }
          />
        </div>
      ) : (
        <DataTable
          recordNoun="Orders"
          sort={{ key: params.sort, dir: params.dir }}
          page={page}
          pageCount={pageCount}
          total={total}
          columns={[
            { header: "Number", sortKey: "number" },
            { header: "Client", sortKey: "client" },
            { header: "Issued", sortKey: "issued" },
            { header: "Status" },
            { header: "Total", align: "right", sortKey: "total" },
          ]}
          rows={rows.map((o) => ({
            id: o.id,
            delete: {
              action: deleteOrderRow.bind(null, o.id),
              confirm: `Delete ${o.number}? This cannot be undone.`,
            },
            cells: [
              <Link key="n" href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                {o.number}
              </Link>,
              <div key="c">
                <Link href={`/clients/${o.clientId}`} className="hover:text-primary">
                  {o.clientName}
                </Link>
                {o.clientCompany ? (
                  <span className="block text-xs text-muted-foreground">{o.clientCompany}</span>
                ) : null}
              </div>,
              <span key="d" className="text-muted-foreground">{formatDate(o.issueDate)}</span>,
              <StatusBadge key="s" status={o.status} />,
              <span key="t" className="font-medium">{formatMoney(o.total, currencySymbol(o.currency))}</span>,
            ],
          }))}
        />
      )}
    </div>
  );
}
