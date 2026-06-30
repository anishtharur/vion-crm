import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { createProforma } from "@/lib/actions/proformas";
import { listClientOptions } from "@/lib/data/clients";
import { getSettings } from "@/lib/data/settings";
import { PROFORMA_STATUSES } from "@/lib/db/schema";
import { addDays, todayISO } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function NewProformaPage({
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
      <PageHeader title="New pro-forma invoice" description="Issue an advance invoice." />
      <DocumentForm
        kind="proforma"
        action={createProforma}
        clients={clients}
        currencySymbol={settings.currencySymbol}
        taxLabel={settings.taxLabel}
        statuses={PROFORMA_STATUSES}
        cancelHref="/proformas"
        submitLabel="Create pro-forma"
        defaults={{
          clientId: clientId ? Number(clientId) : undefined,
          issueDate,
          secondaryDate: addDays(issueDate, settings.quoteValidityDays),
          discount: 0,
          taxRate: settings.defaultTaxRate,
          notes: "",
          terms: settings.paymentTerms,
          status: "draft",
          subject: "",
          projectName: "",
          enquiryRef: "",
          attention: "",
          items: [],
        }}
      />
    </div>
  );
}
