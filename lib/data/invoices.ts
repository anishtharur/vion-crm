import "server-only";

import { asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  invoiceItems,
  invoices,
  payments,
  type Client,
  type Invoice,
  type InvoiceItem,
  type Payment,
} from "@/lib/db/schema";
import { displayInvoiceStatus } from "@/lib/utils/invoice-status";
import { todayISO } from "@/lib/utils/format";
import { paged, type ListParams, type Paged } from "./list-params";

export type InvoiceListRow = Invoice & {
  clientName: string;
  clientCompany: string;
  displayStatus: string;
  balance: number;
};

export const INVOICE_SORT = {
  number: invoices.number,
  client: clients.name,
  due: invoices.dueDate,
  total: invoices.total,
  balance: sql`(${invoices.total} - ${invoices.amountPaid})`,
} as const;

export async function listInvoices(
  params: ListParams,
): Promise<Paged<InvoiceListRow>> {
  const today = todayISO();
  const col =
    (params.sort && INVOICE_SORT[params.sort as keyof typeof INVOICE_SORT]) ||
    invoices.createdAt;
  const orderBy = params.dir === "asc" ? asc(col) : desc(col);

  const total = (await db.select({ v: count() }).from(invoices).get())?.v ?? 0;
  const rows = (
    await db
      .select({
        invoice: invoices,
        clientName: clients.name,
        clientCompany: clients.company,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset(params.offset)
      .all()
  ).map((r) => ({
    ...r.invoice,
    clientName: r.clientName,
    clientCompany: r.clientCompany,
    displayStatus: displayInvoiceStatus(r.invoice, today),
    balance: (r.invoice.total ?? 0) - (r.invoice.amountPaid ?? 0),
  }));

  return paged(rows, total, params);
}

export type InvoiceWithItems = {
  invoice: Invoice;
  client: Client;
  items: InvoiceItem[];
  payments: Payment[];
  displayStatus: string;
  balance: number;
};

export async function getInvoice(
  id: number,
): Promise<InvoiceWithItems | undefined> {
  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .get();
  if (!invoice) return undefined;
  const client = await db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .get();
  if (!client) return undefined;
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder)
    .all();
  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .orderBy(desc(payments.paidOn))
    .all();
  return {
    invoice,
    client,
    items,
    payments: pays,
    displayStatus: displayInvoiceStatus(invoice, todayISO()),
    balance: (invoice.total ?? 0) - (invoice.amountPaid ?? 0),
  };
}
