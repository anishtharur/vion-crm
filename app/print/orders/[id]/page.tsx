import { notFound } from "next/navigation";

import { DocumentPaper } from "@/components/documents/document-paper";
import { PrintToolbar } from "@/components/documents/print-toolbar";
import { getOrder } from "@/lib/data/orders";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getOrder(Number(id));
  if (!found) notFound();

  const { order, client, items } = found;
  const settings = await getSettings();

  return (
    <>
      <PrintToolbar backHref={`/orders/${order.id}`} />
      <DocumentPaper
        settings={settings}
        client={client}
        items={items}
        data={{
          docType: "order",
          number: order.number,
          status: order.status,
          issueDate: order.issueDate,
          subject: order.subject,
          projectName: order.projectName,
          enquiryRef: order.enquiryRef,
          attention: order.attention,
          deliveryTime: order.deliveryTime,
          notes: order.notes,
          terms: order.terms,
          subtotal: order.subtotal,
          discount: order.discount,
          taxRate: order.taxRate,
          taxAmount: order.taxAmount,
          total: order.total,
          currency: order.currency,
        }}
      />
    </>
  );
}
