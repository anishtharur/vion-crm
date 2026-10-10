import Link from "next/link";
import { FileSpreadsheet, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { deleteProformaRow } from "@/lib/actions/proformas";
import { listProformas, PROFORMA_SORT } from "@/lib/data/proformas";
import { parseListParams } from "@/lib/data/list-params";
import { currencySymbol } from "@/lib/utils/currency";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ProformasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseListParams(await searchParams, {
    sortable: Object.keys(PROFORMA_SORT),
  });
  const { rows, total, page, pageCount } = await listProformas(params);

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

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={FileSpreadsheet}
            title="No pro-formas yet"
            description="Create a pro-forma directly or convert one from a quote or order."
            action={
              <Link
                href="/proformas/new"
                className={buttonClass("primary", "md")}
              >
                <Plus className="h-4 w-4" />
                New pro-forma
              </Link>
            }
          />
        </div>
      ) : (
        <DataTable
          recordNoun="Pro-formas"
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
          rows={rows.map((p) => ({
            id: p.id,
            delete: {
              action: deleteProformaRow.bind(null, p.id),
              confirm: `Delete ${p.number}? This cannot be undone.`,
            },
            cells: [
              <Link
                key="n"
                href={`/proformas/${p.id}`}
                className="font-medium text-primary hover:underline"
              >
                {p.number}
              </Link>,
              <div key="c">
                <Link
                  href={`/clients/${p.clientId}`}
                  className="hover:text-primary"
                >
                  {p.clientName}
                </Link>
                {p.clientCompany ? (
                  <span className="block text-xs text-muted-foreground">
                    {p.clientCompany}
                  </span>
                ) : null}
              </div>,
              <span key="d" className="text-muted-foreground">
                {formatDate(p.issueDate)}
              </span>,
              <StatusBadge key="s" status={p.status} />,
              <span key="t" className="font-medium">
                {formatMoney(p.total, currencySymbol(p.currency))}
              </span>,
            ],
          }))}
        />
      )}
    </div>
  );
}
