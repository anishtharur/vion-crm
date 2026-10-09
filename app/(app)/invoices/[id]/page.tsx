import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";

import { ActionButton } from "@/components/documents/action-button";
import { DocumentPaper } from "@/components/documents/document-paper";
import { StatusControl } from "@/components/documents/status-control";
import { DeleteButton } from "@/components/forms/delete-button";
import { PaymentForm } from "@/components/forms/payment-form";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  deleteInvoice,
  deletePayment,
  recordPayment,
  setInvoiceStatus,
} from "@/lib/actions/invoices";
import { getInvoice } from "@/lib/data/invoices";
import { getSettings } from "@/lib/data/settings";
import { currencySymbol } from "@/lib/utils/currency";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { INVOICE_EDITABLE_STATUSES } from "@/lib/utils/invoice-status";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = getInvoice(Number(id));
  if (!found) notFound();

  const { invoice, client, items, payments, balance } = found;
  const settings = getSettings();
  const sym = currencySymbol(invoice.currency);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.number}
        description={`Invoice for ${client.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusControl
              current={invoice.status}
              statuses={INVOICE_EDITABLE_STATUSES}
              action={setInvoiceStatus.bind(null, invoice.id)}
            />
            <Link href={`/invoices/${invoice.id}/edit`} className={buttonClass("outline", "md")}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <a
              href={`/api/pdf/invoices/${invoice.id}?name=${encodeURIComponent(invoice.number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("outline", "md")}
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            <DeleteButton
              action={deleteInvoice.bind(null, invoice.id)}
              confirm={`Delete ${invoice.number}? This cannot be undone.`}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DocumentPaper
            settings={settings}
            client={client}
            items={items}
            data={{
              docType: "invoice",
              number: invoice.number,
              status: found.displayStatus,
              issueDate: invoice.issueDate,
              secondaryLabel: "Due date",
              secondaryDate: invoice.dueDate,
              notes: invoice.notes,
              terms: invoice.terms,
              subtotal: invoice.subtotal,
              discount: invoice.discount,
              taxRate: invoice.taxRate,
              taxAmount: invoice.taxAmount,
              total: invoice.total,
              amountPaid: invoice.amountPaid,
              currency: invoice.currency,
            }}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Balance" />
            <CardBody className="space-y-2 text-sm">
              <Row label="Total" value={formatMoney(invoice.total, sym)} />
              <Row label="Paid" value={formatMoney(invoice.amountPaid, sym)} />
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Balance due</span>
                <span
                  className={`font-display text-lg font-semibold tabular-nums ${
                    balance > 0 ? "text-destructive" : "text-success"
                  }`}
                >
                  {formatMoney(balance, sym)}
                </span>
              </div>
              <div className="pt-1">
                <StatusBadge status={found.displayStatus} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Record payment" />
            <CardBody>
              <PaymentForm
                action={recordPayment.bind(null, invoice.id)}
                currencySymbol={sym}
                suggestedAmount={balance > 0 ? balance : 0}
              />
            </CardBody>
          </Card>

          {payments.length > 0 ? (
            <Card>
              <CardHeader title={`Payments (${payments.length})`} />
              <CardBody className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">{formatMoney(p.amount, sym)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.number ? `${p.number} · ` : ""}
                        {formatDate(p.paidOn)}
                        {p.method ? ` · ${p.method}` : ""}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={`/api/pdf/receipts/${p.id}?name=${encodeURIComponent(p.number || `receipt-${p.id}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass("ghost", "sm")}
                      >
                        Receipt
                      </a>
                      <ActionButton
                        action={deletePayment.bind(null, p.id, invoice.id)}
                        label="Remove"
                        pendingLabel="…"
                        variant="ghost"
                        confirm="Remove this payment?"
                      />
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
