import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Td, Th, TableCard } from "@/components/ui/table";
import { listInvoices } from "@/lib/data/invoices";
import { getSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = listInvoices();
  const sym = getSettings().currencySymbol;

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

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={ReceiptText}
            title="No invoices yet"
            description="Create an invoice or convert an accepted quote."
            action={
              <Link href="/invoices/new" className={buttonClass("primary", "md")}>
                <Plus className="h-4 w-4" />
                New invoice
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
              <Th>Due</Th>
              <Th>Status</Th>
              <Th align="right">Total</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="transition-colors hover:bg-surface-muted/50">
                <Td>
                  <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                    {inv.number}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/clients/${inv.clientId}`} className="hover:text-primary">
                    {inv.clientName}
                  </Link>
                  {inv.clientCompany ? (
                    <span className="block text-xs text-muted-foreground">{inv.clientCompany}</span>
                  ) : null}
                </Td>
                <Td className="text-muted-foreground">{formatDate(inv.dueDate)}</Td>
                <Td>
                  <StatusBadge status={inv.displayStatus} />
                </Td>
                <Td align="right" className="font-medium">
                  {formatMoney(inv.total, sym)}
                </Td>
                <Td align="right" className={inv.balance > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                  {formatMoney(inv.balance, sym)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
