import Link from "next/link";
import { FileSpreadsheet, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Td, Th, TableCard } from "@/components/ui/table";
import { listProformas } from "@/lib/data/proformas";
import { getSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ProformasPage() {
  const proformas = listProformas();
  const sym = getSettings().currencySymbol;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pro-forma invoices"
        description="Advance invoices issued before dispatch or payment."
        actions={
          <Link href="/proformas/new" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" />
            New pro-forma
          </Link>
        }
      />

      {proformas.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={FileSpreadsheet}
            title="No pro-formas yet"
            description="Create a pro-forma directly or convert one from a quote or order."
            action={
              <Link href="/proformas/new" className={buttonClass("primary", "md")}>
                <Plus className="h-4 w-4" />
                New pro-forma
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
            {proformas.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-surface-muted/50">
                <Td>
                  <Link href={`/proformas/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.number}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/clients/${p.clientId}`} className="hover:text-primary">
                    {p.clientName}
                  </Link>
                  {p.clientCompany ? (
                    <span className="block text-xs text-muted-foreground">{p.clientCompany}</span>
                  ) : null}
                </Td>
                <Td className="text-muted-foreground">{formatDate(p.issueDate)}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td align="right" className="font-medium">
                  {formatMoney(p.total, sym)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
