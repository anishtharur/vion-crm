import Link from "next/link";
import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Td, Th, TableCard } from "@/components/ui/table";
import { listReceipts } from "@/lib/data/receipts";
import { getSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const receipts = listReceipts();
  const sym = getSettings().currencySymbol;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment receipts"
        description="Issued automatically whenever a payment is recorded on an invoice."
      />

      {receipts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Receipt}
            title="No receipts yet"
            description="Record a payment on an invoice and a receipt appears here."
          />
        </div>
      ) : (
        <TableCard>
          <thead>
            <tr>
              <Th>Receipt</Th>
              <Th>Against</Th>
              <Th>Client</Th>
              <Th>Date</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-surface-muted/50">
                <Td>
                  <a
                    href={`/print/receipts/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {r.number || `#${r.id}`}
                  </a>
                </Td>
                <Td className="text-muted-foreground">
                  <Link href={`/invoices/${r.invoiceId}`} className="hover:text-primary">
                    {r.invoiceNumber}
                  </Link>
                </Td>
                <Td>{r.clientName}</Td>
                <Td className="text-muted-foreground">{formatDate(r.paidOn)}</Td>
                <Td align="right" className="font-medium">
                  {formatMoney(r.amount, sym)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
