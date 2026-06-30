import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { createOrder } from "@/lib/actions/orders";
import { listClientOptions } from "@/lib/data/clients";
import { getSettings } from "@/lib/data/settings";
import { ORDER_STATUSES } from "@/lib/db/schema";
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
        currencySymbol={settings.currencySymbol}
        taxLabel={settings.taxLabel}
        statuses={ORDER_STATUSES}
        cancelHref="/orders"
        submitLabel="Create order"
        defaults={{
          clientId: clientId ? Number(clientId) : undefined,
          issueDate: todayISO(),
          secondaryDate: "",
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
