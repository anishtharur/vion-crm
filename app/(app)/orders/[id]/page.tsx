import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, Download, Pencil } from "lucide-react";

import { ActionButton } from "@/components/documents/action-button";
import { DocumentPaper } from "@/components/documents/document-paper";
import { StatusControl } from "@/components/documents/status-control";
import { DeleteButton } from "@/components/forms/delete-button";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  convertOrderToInvoice,
  convertOrderToProforma,
  deleteOrder,
  setOrderStatus,
} from "@/lib/actions/orders";
import { getOrder } from "@/lib/data/orders";
import { getSettings } from "@/lib/data/settings";
import { ORDER_STATUSES } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getOrder(Number(id));
  if (!found) notFound();

  const { order, client, items } = found;
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.number}
        description={`Order for ${client.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusControl
              current={order.status}
              statuses={ORDER_STATUSES}
              action={setOrderStatus.bind(null, order.id)}
            />
            <Link
              href={`/orders/${order.id}/edit`}
              className={buttonClass("outline", "md")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <a
              href={`/api/pdf/orders/${order.id}?name=${encodeURIComponent(order.number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("outline", "md")}
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            <ActionButton
              action={convertOrderToProforma.bind(null, order.id)}
              label="To pro-forma"
              pendingLabel="Converting…"
              icon={<ArrowRightLeft className="h-4 w-4" />}
              variant="outline"
              confirm="Create a pro-forma invoice from this order?"
            />
            <ActionButton
              action={convertOrderToInvoice.bind(null, order.id)}
              label="To invoice"
              pendingLabel="Converting…"
              icon={<ArrowRightLeft className="h-4 w-4" />}
              variant="accent"
              confirm="Create an invoice from this order?"
            />
            <DeleteButton
              action={deleteOrder.bind(null, order.id)}
              confirm={`Delete ${order.number}? This cannot be undone.`}
            />
          </div>
        }
      />

      <DocumentPaper
        settings={settings}
        client={client}
        items={items}
        data={{
          docType: "order",
          number: order.number,
          status: order.status,
          issueDate: order.issueDate,
          subject: order.subject,
          projectName: order.projectName,
          enquiryRef: order.enquiryRef,
          attention: order.attention,
          deliveryTime: order.deliveryTime,
          notes: order.notes,
          terms: order.terms,
          subtotal: order.subtotal,
          discount: order.discount,
          taxRate: order.taxRate,
          taxAmount: order.taxAmount,
          total: order.total,
          currency: order.currency,
        }}
      />
    </div>
  );
}
