import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Td, Th, TableCard } from "@/components/ui/table";
import { listOrders } from "@/lib/data/orders";
import { getSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = listOrders();
  const sym = getSettings().currencySymbol;

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

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
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
        <TableCard>
          <thead>
            <tr>
              <Th>Number</Th>
              <Th>Client</Th>
              <Th>Issued</Th>
              <Th>Status</Th>
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-surface-muted/50">
                <Td>
                  <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                    {o.number}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/clients/${o.clientId}`} className="hover:text-primary">
                    {o.clientName}
                  </Link>
                  {o.clientCompany ? (
                    <span className="block text-xs text-muted-foreground">{o.clientCompany}</span>
                  ) : null}
                </Td>
                <Td className="text-muted-foreground">{formatDate(o.issueDate)}</Td>
                <Td>
                  <StatusBadge status={o.status} />
                </Td>
                <Td align="right" className="font-medium">
                  {formatMoney(o.total, sym)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
