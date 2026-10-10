import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, Download, Pencil } from "lucide-react";

import { ActionButton } from "@/components/documents/action-button";
import { DocumentPaper } from "@/components/documents/document-paper";
import { StatusControl } from "@/components/documents/status-control";
import { DeleteButton } from "@/components/forms/delete-button";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  convertQuoteToInvoice,
  convertQuoteToOrder,
  convertQuoteToProforma,
  deleteQuote,
  setQuoteStatus,
} from "@/lib/actions/quotes";
import { getQuote } from "@/lib/data/quotes";
import { getSettings } from "@/lib/data/settings";
import { QUOTE_STATUSES } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getQuote(Number(id));
  if (!found) notFound();

  const { quote, client, items } = found;
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.number}
        description={`Quote for ${client.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusControl
              current={quote.status}
              statuses={QUOTE_STATUSES}
              action={setQuoteStatus.bind(null, quote.id)}
            />
            <Link
              href={`/quotes/${quote.id}/edit`}
              className={buttonClass("outline", "md")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <a
              href={`/api/pdf/quotes/${quote.id}?name=${encodeURIComponent(quote.number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("outline", "md")}
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            <ActionButton
              action={convertQuoteToOrder.bind(null, quote.id)}
              label="To order"
              pendingLabel="Converting…"
              icon={<ArrowRightLeft className="h-4 w-4" />}
              variant="outline"
              confirm="Create an order acknowledgement from this quote?"
            />
            <ActionButton
              action={convertQuoteToProforma.bind(null, quote.id)}
              label="To pro-forma"
              pendingLabel="Converting…"
              icon={<ArrowRightLeft className="h-4 w-4" />}
              variant="outline"
              confirm="Create a pro-forma invoice from this quote?"
            />
            <ActionButton
              action={convertQuoteToInvoice.bind(null, quote.id)}
              label="To invoice"
              pendingLabel="Converting…"
              icon={<ArrowRightLeft className="h-4 w-4" />}
              variant="accent"
              confirm="Create an invoice from this quote?"
            />
            <DeleteButton
              action={deleteQuote.bind(null, quote.id)}
              confirm={`Delete ${quote.number}? This cannot be undone.`}
            />
          </div>
        }
      />

      <DocumentPaper
        settings={settings}
        client={client}
        items={items}
        data={{
          docType: "quote",
          number: quote.number,
          status: quote.status,
          issueDate: quote.issueDate,
          secondaryLabel: "Valid until",
          secondaryDate: quote.validUntil,
          subject: quote.subject,
          projectName: quote.projectName,
          enquiryRef: quote.enquiryRef,
          attention: quote.attention,
          notes: quote.notes,
          terms: quote.terms,
          subtotal: quote.subtotal,
          discount: quote.discount,
          taxRate: quote.taxRate,
          taxAmount: quote.taxAmount,
          total: quote.total,
          currency: quote.currency,
        }}
      />
    </div>
  );
}
