import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { createQuote } from "@/lib/actions/quotes";
import { listClientOptions } from "@/lib/data/clients";
import { getSettings } from "@/lib/data/settings";
import { QUOTE_STATUSES } from "@/lib/db/schema";
import { CURRENCY_OPTIONS } from "@/lib/utils/currency";
import { addDays, todayISO } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
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
      <PageHeader title="New quote" description="Build an estimate for a client." />
      <DocumentForm
        kind="quote"
        action={createQuote}
        clients={clients}
        currencies={CURRENCY_OPTIONS}
        taxLabel={settings.taxLabel}
        statuses={QUOTE_STATUSES}
        cancelHref="/quotes"
        submitLabel="Create quote"
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
          items: [],
        }}
      />
    </div>
  );
}
