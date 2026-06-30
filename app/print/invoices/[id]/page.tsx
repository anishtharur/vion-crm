import { notFound } from "next/navigation";

import { DocumentPaper } from "@/components/documents/document-paper";
import { PrintToolbar } from "@/components/documents/print-toolbar";
import { getInvoice } from "@/lib/data/invoices";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = getInvoice(Number(id));
  if (!found) notFound();

  const { invoice, client, items } = found;
  const settings = getSettings();

  return (
    <>
      <PrintToolbar backHref={`/invoices/${invoice.id}`} />
      <DocumentPaper
        settings={settings}
        client={client}
        items={items}
        data={{
          docType: "invoice",
          number: invoice.number,
          status: found.displayStatus,
          issueDate: invoice.issueDate,
          secondaryLabel: "Due date",
          secondaryDate: invoice.dueDate,
          notes: invoice.notes,
          terms: invoice.terms,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          taxRate: invoice.taxRate,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          amountPaid: invoice.amountPaid,
        }}
      />
    </>
  );
}
