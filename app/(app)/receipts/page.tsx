import Link from "next/link";
import { Receipt } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { deleteReceiptRow } from "@/lib/actions/invoices";
import { listReceipts, RECEIPT_SORT } from "@/lib/data/receipts";
import { parseListParams } from "@/lib/data/list-params";
import { currencySymbol } from "@/lib/utils/currency";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseListParams(await searchParams, { sortable: Object.keys(RECEIPT_SORT) });
  const { rows, total, page, pageCount } = listReceipts(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment receipts"
        description="Issued automatically whenever a payment is recorded on an invoice."
      />

      {total === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Receipt}
            title="No receipts yet"
            description="Record a payment on an invoice and a receipt appears here."
          />
        </div>
      ) : (
        <DataTable
          recordNoun="Receipts"
          sort={{ key: params.sort, dir: params.dir }}
          page={page}
          pageCount={pageCount}
          total={total}
          columns={[
            { header: "Receipt", sortKey: "number" },
            { header: "Against", sortKey: "against" },
            { header: "Client", sortKey: "client" },
            { header: "Date", sortKey: "date" },
            { header: "Amount", align: "right", sortKey: "amount" },
          ]}
          rows={rows.map((r) => ({
            id: r.id,
            delete: {
              action: deleteReceiptRow.bind(null, r.id),
              confirm: `Delete receipt ${r.number || `#${r.id}`}? The invoice balance will be restored.`,
            },
            cells: [
              <a
                key="n"
                href={`/api/pdf/receipts/${r.id}?name=${encodeURIComponent(r.number || `receipt-${r.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {r.number || `#${r.id}`}
              </a>,
              <Link key="a" href={`/invoices/${r.invoiceId}`} className="text-muted-foreground hover:text-primary">
                {r.invoiceNumber}
              </Link>,
              <span key="c">{r.clientName}</span>,
              <span key="d" className="text-muted-foreground">{formatDate(r.paidOn)}</span>,
              <span key="amt" className="font-medium">{formatMoney(r.amount, currencySymbol(r.currency))}</span>,
            ],
          }))}
        />
      )}
    </div>
  );
}
