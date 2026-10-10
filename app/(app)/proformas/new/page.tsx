import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { createProforma } from "@/lib/actions/proformas";
import { listClientOptions } from "@/lib/data/clients";
import { getSettings } from "@/lib/data/settings";
import { PROFORMA_STATUSES } from "@/lib/db/schema";
import { CURRENCY_OPTIONS } from "@/lib/utils/currency";
import { addDays, todayISO } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function NewProformaPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const [settings, clients] = await Promise.all([
    getSettings(),
    listClientOptions(),
  ]);
  const issueDate = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New pro-forma invoice"
        description="Issue an advance invoice."
      />
      <DocumentForm
        kind="proforma"
        action={createProforma}
        clients={clients}
        currencies={CURRENCY_OPTIONS}
        taxLabel={settings.taxLabel}
        statuses={PROFORMA_STATUSES}
        cancelHref="/proformas"
        submitLabel="Create pro-forma"
        defaults={{
          clientId: clientId ? Number(clientId) : undefined,
          issueDate,
          secondaryDate: addDays(issueDate, settings.quoteValidityDays),
          currency: settings.currencyCode,
          discount: 0,
          taxRate: settings.defaultTaxRate,
          notes: "",
          terms: settings.paymentTerms,
          status: "draft",
          subject: "",
          projectName: "",
          enquiryRef: "",
          attention: "",
          termsScope: settings.termsScope,
          termsPrices: settings.termsPrices,
          termsDelivery: settings.termsDelivery,
          termsWarranty: settings.termsWarranty,
          termsCompliance: settings.termsCompliance,
          termsPacking: settings.termsPacking,
          items: [],
        }}
      />
    </div>
  );
}
