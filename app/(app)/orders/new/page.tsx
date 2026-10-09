import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { createOrder } from "@/lib/actions/orders";
import { listClientOptions } from "@/lib/data/clients";
import { getSettings } from "@/lib/data/settings";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { CURRENCY_OPTIONS } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const settings = getSettings();
  const clients = listClientOptions();

  return (
    <div className="space-y-6">
      <PageHeader title="New order acknowledgement" description="Confirm a sales order." />
      <DocumentForm
        kind="order"
        action={createOrder}
        clients={clients}
        currencies={CURRENCY_OPTIONS}
        taxLabel={settings.taxLabel}
        statuses={ORDER_STATUSES}
        cancelHref="/orders"
        submitLabel="Create order"
        defaults={{
          clientId: clientId ? Number(clientId) : undefined,
          issueDate: todayISO(),
          secondaryDate: "",
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
          deliveryTime: "",
          items: [],
        }}
      />
    </div>
  );
}
