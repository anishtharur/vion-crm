import Link from "next/link";
import { Plus, Search, UserPlus, Users } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { deleteClientRow } from "@/lib/actions/clients";
import { listClients } from "@/lib/data/clients";
import { parseListParams } from "@/lib/data/list-params";

export const dynamic = "force-dynamic";

const SORTABLE = ["name", "company", "email", "quotes", "invoices"];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseListParams(sp, { sortable: SORTABLE });
  const { rows, total, page, pageCount } = await listClients(params);
  const q = params.q;

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
          defaultValue={q}
          placeholder="Search name, company or email…"
          className="h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
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
                <Link
                  href="/clients/new"
                  className={buttonClass("primary", "md")}
                >
                  <UserPlus className="h-4 w-4" />
                  Add client
                </Link>
              )
            }
          />
        </div>
      ) : (
        <DataTable
          recordNoun="Clients"
          sort={{ key: params.sort, dir: params.dir }}
          page={page}
          pageCount={pageCount}
          total={total}
          columns={[
            { header: "Name", sortKey: "name" },
            { header: "Company", sortKey: "company" },
            { header: "Email", sortKey: "email" },
            { header: "Quotes", align: "right", sortKey: "quotes" },
            { header: "Invoices", align: "right", sortKey: "invoices" },
          ]}
          rows={rows.map((c) => ({
            id: c.id,
            delete: {
              action: deleteClientRow.bind(null, c.id),
              confirm: `Delete ${c.name}? This cannot be undone.`,
            },
            cells: [
              <Link
                key="n"
                href={`/clients/${c.id}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {c.name}
              </Link>,
              <span key="co" className="text-muted-foreground">
                {c.company || "—"}
              </span>,
              <span key="e" className="text-muted-foreground">
                {c.email || "—"}
              </span>,
              <span key="q">{c.quoteCount}</span>,
              <span key="i">{c.invoiceCount}</span>,
            ],
          }))}
        />
      )}
    </div>
  );
}
