import { notFound } from "next/navigation";

import { DocumentPaper } from "@/components/documents/document-paper";
import { PrintToolbar } from "@/components/documents/print-toolbar";
import { getProforma } from "@/lib/data/proformas";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function PrintProformaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = getProforma(Number(id));
  if (!found) notFound();

  const { proforma, client, items } = found;
  const settings = getSettings();

  return (
    <>
      <PrintToolbar backHref={`/proformas/${proforma.id}`} />
      <DocumentPaper
        settings={settings}
        client={client}
        items={items}
        data={{
          docType: "proforma",
          number: proforma.number,
          status: proforma.status,
          issueDate: proforma.issueDate,
          secondaryLabel: "Valid until",
          secondaryDate: proforma.validUntil,
          subject: proforma.subject,
          projectName: proforma.projectName,
          enquiryRef: proforma.enquiryRef,
          attention: proforma.attention,
          notes: proforma.notes,
          terms: proforma.terms,
          subtotal: proforma.subtotal,
          discount: proforma.discount,
          taxRate: proforma.taxRate,
          taxAmount: proforma.taxAmount,
          total: proforma.total,
          currency: proforma.currency,
        }}
      />
    </>
  );
}
