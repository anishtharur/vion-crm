import Link from "next/link";
import { Plus, Search, UserPlus, Users } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Td, Th, TableCard } from "@/components/ui/table";
import { listClients } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clients = listClients(q);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Everyone you quote and invoice."
        actions={
          <Link href="/clients/new" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" />
            New client
          </Link>
        }
      />

      <form method="get" className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, company or email…"
          className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={q ? Search : Users}
            title={q ? "No matching clients" : "No clients yet"}
            description={
              q
                ? "Try a different search term."
                : "Add your first client to start quoting and invoicing."
            }
            action={
              q ? undefined : (
                <Link href="/clients/new" className={buttonClass("primary", "md")}>
                  <UserPlus className="h-4 w-4" />
                  Add client
                </Link>
              )
            }
          />
        </div>
      ) : (
        <TableCard>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Email</Th>
              <Th align="right">Quotes</Th>
              <Th align="right">Invoices</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-surface-muted/50">
                <Td>
                  <Link
                    href={`/clients/${c.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </Td>
                <Td className="text-muted-foreground">{c.company || "—"}</Td>
                <Td className="text-muted-foreground">{c.email || "—"}</Td>
                <Td align="right">{c.quoteCount}</Td>
                <Td align="right">{c.invoiceCount}</Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
