import { notFound } from "next/navigation";

import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateQuote } from "@/lib/actions/quotes";
import { listClientOptions } from "@/lib/data/clients";
import { getQuote } from "@/lib/data/quotes";
import { getSettings } from "@/lib/data/settings";
import { QUOTE_STATUSES } from "@/lib/db/schema";
import { CURRENCY_OPTIONS } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = getQuote(Number(id));
  if (!found) notFound();

  const { quote, items } = found;
  const settings = getSettings();
  const clients = listClientOptions();
  const action = updateQuote.bind(null, quote.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${quote.number}`} description="Update this quote." />
      <DocumentForm
        kind="quote"
        action={action}
        clients={clients}
        currencies={CURRENCY_OPTIONS}
        taxLabel={settings.taxLabel}
        statuses={QUOTE_STATUSES}
        cancelHref={`/quotes/${quote.id}`}
        submitLabel="Save changes"
        defaults={{
          clientId: quote.clientId,
          issueDate: quote.issueDate,
          secondaryDate: quote.validUntil,
          currency: quote.currency,
          discount: quote.discount,
          taxRate: quote.taxRate,
          notes: quote.notes,
          terms: quote.terms,
          status: quote.status,
          subject: quote.subject,
          projectName: quote.projectName,
          enquiryRef: quote.enquiryRef,
          attention: quote.attention,
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
