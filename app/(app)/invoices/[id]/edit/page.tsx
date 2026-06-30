import { notFound } from "next/navigation";

import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateInvoice } from "@/lib/actions/invoices";
import { listClientOptions } from "@/lib/data/clients";
import { getInvoice } from "@/lib/data/invoices";
import { getSettings } from "@/lib/data/settings";
import { INVOICE_EDITABLE_STATUSES } from "@/lib/utils/invoice-status";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = getInvoice(Number(id));
  if (!found) notFound();

  const { invoice, items } = found;
  const settings = getSettings();
  const clients = listClientOptions();
  const action = updateInvoice.bind(null, invoice.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${invoice.number}`} description="Update this invoice." />
      <DocumentForm
        kind="invoice"
        action={action}
        clients={clients}
        currencySymbol={settings.currencySymbol}
        taxLabel={settings.taxLabel}
        statuses={INVOICE_EDITABLE_STATUSES}
        cancelHref={`/invoices/${invoice.id}`}
        submitLabel="Save changes"
        defaults={{
          clientId: invoice.clientId,
          issueDate: invoice.issueDate,
          secondaryDate: invoice.dueDate,
          discount: invoice.discount,
          taxRate: invoice.taxRate,
          notes: invoice.notes,
          terms: invoice.terms,
          status: invoice.status,
          items: items.map((i) => ({
            description: i.description,
            detail: i.detail,
            standard: i.standard,
            unit: i.unit,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }}
      />
    </div>
  );
}
