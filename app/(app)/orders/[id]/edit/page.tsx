import { notFound } from "next/navigation";

import { DocumentForm } from "@/components/forms/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateOrder } from "@/lib/actions/orders";
import { listClientOptions } from "@/lib/data/clients";
import { getOrder } from "@/lib/data/orders";
import { getSettings } from "@/lib/data/settings";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { CURRENCY_OPTIONS } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getOrder(Number(id));
  if (!found) notFound();

  const { order, items } = found;
  const [settings, clients] = await Promise.all([
    getSettings(),
    listClientOptions(),
  ]);
  const action = updateOrder.bind(null, order.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${order.number}`}
        description="Update this order."
      />
      <DocumentForm
        kind="order"
        action={action}
        clients={clients}
        currencies={CURRENCY_OPTIONS}
        taxLabel={settings.taxLabel}
        statuses={ORDER_STATUSES}
        cancelHref={`/orders/${order.id}`}
        submitLabel="Save changes"
        defaults={{
          clientId: order.clientId,
          issueDate: order.issueDate,
          secondaryDate: "",
          currency: order.currency,
          discount: order.discount,
          taxRate: order.taxRate,
          notes: order.notes,
          terms: order.terms,
          status: order.status,
          subject: order.subject,
          projectName: order.projectName,
          enquiryRef: order.enquiryRef,
          attention: order.attention,
          deliveryTime: order.deliveryTime,
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
