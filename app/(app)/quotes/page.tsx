import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { deleteQuoteRow } from "@/lib/actions/quotes";
import { listQuotes, QUOTE_SORT } from "@/lib/data/quotes";
import { parseListParams } from "@/lib/data/list-params";
import { currencySymbol } from "@/lib/utils/currency";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseListParams(await searchParams, {
    sortable: Object.keys(QUOTE_SORT),
  });
  const { rows, total, page, pageCount } = await listQuotes(params);

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

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
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
        <DataTable
          recordNoun="Quotes"
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
          rows={rows.map((q) => ({
            id: q.id,
            delete: {
              action: deleteQuoteRow.bind(null, q.id),
              confirm: `Delete ${q.number}? This cannot be undone.`,
            },
            cells: [
              <Link
                key="n"
                href={`/quotes/${q.id}`}
                className="font-medium text-primary hover:underline"
              >
                {q.number}
              </Link>,
              <div key="c">
                <Link
                  href={`/clients/${q.clientId}`}
                  className="hover:text-primary"
                >
                  {q.clientName}
                </Link>
                {q.clientCompany ? (
                  <span className="block text-xs text-muted-foreground">
                    {q.clientCompany}
                  </span>
                ) : null}
              </div>,
              <span key="d" className="text-muted-foreground">
                {formatDate(q.issueDate)}
              </span>,
              <StatusBadge key="s" status={q.status} />,
              <span key="t" className="font-medium">
                {formatMoney(q.total, currencySymbol(q.currency))}
              </span>,
            ],
          }))}
        />
      )}
    </div>
  );
}
