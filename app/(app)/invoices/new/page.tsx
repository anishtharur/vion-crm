import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { createInvoice } from "@/lib/actions/invoices";
import { listClientOptions } from "@/lib/data/clients";
import { getSettings } from "@/lib/data/settings";
import { addDays, todayISO } from "@/lib/utils/format";
import { INVOICE_EDITABLE_STATUSES } from "@/lib/utils/invoice-status";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const settings = getSettings();
  const clients = listClientOptions();
  const issueDate = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader title="New invoice" description="Bill a client for completed work." />
      <DocumentForm
        kind="invoice"
        action={createInvoice}
        clients={clients}
        currencySymbol={settings.currencySymbol}
        taxLabel={settings.taxLabel}
        statuses={INVOICE_EDITABLE_STATUSES}
        cancelHref="/invoices"
        submitLabel="Create invoice"
        defaults={{
          clientId: clientId ? Number(clientId) : undefined,
          issueDate,
          secondaryDate: addDays(issueDate, settings.paymentTermsDays),
          discount: 0,
          taxRate: settings.defaultTaxRate,
          notes: "",
          terms: settings.paymentTerms,
          status: "draft",
          items: [],
        }}
      />
    </div>
  );
}
