import { notFound } from "next/navigation";

import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateProforma } from "@/lib/actions/proformas";
import { listClientOptions } from "@/lib/data/clients";
import { getProforma } from "@/lib/data/proformas";
import { getSettings } from "@/lib/data/settings";
import { PROFORMA_STATUSES } from "@/lib/db/schema";
import { CURRENCY_OPTIONS } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

export default async function EditProformaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getProforma(Number(id));
  if (!found) notFound();

  const { proforma, items } = found;
  const [settings, clients] = await Promise.all([
    getSettings(),
    listClientOptions(),
  ]);
  const action = updateProforma.bind(null, proforma.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${proforma.number}`}
        description="Update this pro-forma."
      />
      <DocumentForm
        kind="proforma"
        action={action}
        clients={clients}
        currencies={CURRENCY_OPTIONS}
        taxLabel={settings.taxLabel}
        statuses={PROFORMA_STATUSES}
        cancelHref={`/proformas/${proforma.id}`}
        submitLabel="Save changes"
        defaults={{
          clientId: proforma.clientId,
          issueDate: proforma.issueDate,
          secondaryDate: proforma.validUntil,
          currency: proforma.currency,
          discount: proforma.discount,
          taxRate: proforma.taxRate,
          notes: proforma.notes,
          terms: proforma.terms,
          status: proforma.status,
          subject: proforma.subject,
          projectName: proforma.projectName,
          enquiryRef: proforma.enquiryRef,
          attention: proforma.attention,
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
