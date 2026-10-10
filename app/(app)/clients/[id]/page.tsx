import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  ReceiptText,
} from "lucide-react";

import { DeleteButton } from "@/components/forms/delete-button";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Td, Th } from "@/components/ui/table";
import { deleteClient } from "@/lib/actions/clients";
import { getClientDetail } from "@/lib/data/clients";
import { currencySymbol } from "@/lib/utils/currency";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getClientDetail(Number(id));
  if (!detail) notFound();

  const { client, quotes, invoices } = detail;
  const deleteAction = deleteClient.bind(null, client.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={client.company || undefined}
        actions={
          <>
            <Link
              href={`/clients/${client.id}/edit`}
              className={buttonClass("outline", "md")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <DeleteButton
              action={deleteAction}
              confirm={`Delete ${client.name}?`}
              label="Delete"
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Contact details" />
          <CardBody className="space-y-3 text-sm">
            <ContactRow
              icon={Mail}
              value={client.email}
              href={client.email ? `mailto:${client.email}` : undefined}
            />
            <ContactRow
              icon={Phone}
              value={client.phone}
              href={client.phone ? `tel:${client.phone}` : undefined}
            />
            <ContactRow icon={Printer} value={client.fax} />
            <ContactRow icon={MapPin} value={client.billingAddress} multiline />
            <ContactRow
              icon={Globe}
              value={[client.postalCode, client.country]
                .filter(Boolean)
                .join(", ")}
            />
            {client.notes ? (
              <div className="rounded-lg bg-surface-muted px-3 py-2 text-muted-foreground">
                {client.notes}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Quotes"
              action={
                <Link
                  href={`/quotes/new?clientId=${client.id}`}
                  className={buttonClass("outline", "sm")}
                >
                  <Plus className="h-4 w-4" />
                  New
                </Link>
              }
            />
            {quotes.length === 0 ? (
              <CardBody className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" /> No quotes yet.
              </CardBody>
            ) : (
              <DocTable
                rows={quotes.map((q) => ({
                  id: q.id,
                  href: `/quotes/${q.id}`,
                  number: q.number,
                  date: q.issueDate,
                  status: q.status,
                  total: q.total,
                  currency: q.currency,
                }))}
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Invoices"
              action={
                <Link
                  href={`/invoices/new?clientId=${client.id}`}
                  className={buttonClass("outline", "sm")}
                >
                  <Plus className="h-4 w-4" />
                  New
                </Link>
              }
            />
            {invoices.length === 0 ? (
              <CardBody className="flex items-center gap-2 text-sm text-muted-foreground">
                <ReceiptText className="h-4 w-4" /> No invoices yet.
              </CardBody>
            ) : (
              <DocTable
                rows={invoices.map((inv) => ({
                  id: inv.id,
                  href: `/invoices/${inv.id}`,
                  number: inv.number,
                  date: inv.issueDate,
                  status: inv.status,
                  total: inv.total,
                  currency: inv.currency,
                }))}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  href,
  multiline,
}: {
  icon: typeof Mail;
  value: string;
  href?: string;
  multiline?: boolean;
}) {
  if (!value) return null;
  const content = href ? (
    <a href={href} className="text-primary hover:underline">
      {value}
    </a>
  ) : (
    <span className={multiline ? "whitespace-pre-line" : undefined}>
      {value}
    </span>
  );
  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0 break-words text-foreground">{content}</div>
    </div>
  );
}

function DocTable({
  rows,
}: {
  rows: {
    id: number;
    href: string;
    number: string;
    date: string;
    status: string;
    total: number;
    currency: string;
  }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th>Number</Th>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th align="right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="transition-colors hover:bg-surface-muted/50"
            >
              <Td>
                <Link
                  href={r.href}
                  className="font-medium text-primary hover:underline"
                >
                  {r.number}
                </Link>
              </Td>
              <Td className="text-muted-foreground">{formatDate(r.date)}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td align="right" className="font-medium">
                {formatMoney(r.total, currencySymbol(r.currency))}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
