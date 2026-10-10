import { notFound } from "next/navigation";

import { DocumentPaper } from "@/components/documents/document-paper";
import { PrintToolbar } from "@/components/documents/print-toolbar";
import { getQuote } from "@/lib/data/quotes";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function PrintQuotePage({
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
    <>
      <PrintToolbar backHref={`/quotes/${quote.id}`} />
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
    </>
  );
}
