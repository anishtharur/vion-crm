import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Td, Th, TableCard } from "@/components/ui/table";
import { listQuotes } from "@/lib/data/quotes";
import { getSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = listQuotes();
  const sym = getSettings().currencySymbol;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description="Estimates you've sent or are drafting."
        actions={
          <Link href="/quotes/new" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" />
            New quote
          </Link>
        }
      />

      {quotes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Create a quote to estimate work for a client."
            action={
              <Link href="/quotes/new" className={buttonClass("primary", "md")}>
                <Plus className="h-4 w-4" />
                New quote
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
            {quotes.map((q) => (
              <tr key={q.id} className="transition-colors hover:bg-surface-muted/50">
                <Td>
                  <Link href={`/quotes/${q.id}`} className="font-medium text-primary hover:underline">
                    {q.number}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/clients/${q.clientId}`} className="hover:text-primary">
                    {q.clientName}
                  </Link>
                  {q.clientCompany ? (
                    <span className="block text-xs text-muted-foreground">{q.clientCompany}</span>
                  ) : null}
                </Td>
                <Td className="text-muted-foreground">{formatDate(q.issueDate)}</Td>
                <Td>
                  <StatusBadge status={q.status} />
                </Td>
                <Td align="right" className="font-medium">
                  {formatMoney(q.total, sym)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
