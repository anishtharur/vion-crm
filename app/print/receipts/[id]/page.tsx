import { notFound } from "next/navigation";

import { PrintToolbar } from "@/components/documents/print-toolbar";
import { ReceiptView } from "@/components/documents/receipt-view";
import { getReceipt } from "@/lib/data/receipts";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = getReceipt(Number(id));
  if (!found) notFound();

  const { payment, invoice, client, invoiceBalance } = found;
  const settings = getSettings();

  return (
    <>
      <PrintToolbar backHref={`/invoices/${invoice.id}`} />
      <ReceiptView
        settings={settings}
        client={client}
        payment={payment}
        invoice={invoice}
        balance={invoiceBalance}
      />
    </>
  );
}
