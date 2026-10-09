import "server-only";

import { asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  invoices,
  payments,
  type Client,
  type Invoice,
  type Payment,
} from "@/lib/db/schema";
import { paged, type ListParams, type Paged } from "./list-params";

export type ReceiptListRow = Payment & {
  invoiceNumber: string;
  clientName: string;
  currency: string;
};

export const RECEIPT_SORT = {
  number: payments.number,
  against: invoices.number,
  client: clients.name,
  date: payments.paidOn,
  amount: payments.amount,
} as const;

/** All recorded payments (each is a numbered Payment Receipt). */
export function listReceipts(params: ListParams): Paged<ReceiptListRow> {
  const col =
    (params.sort && RECEIPT_SORT[params.sort as keyof typeof RECEIPT_SORT]) ||
    payments.createdAt;
  const orderBy = params.dir === "asc" ? asc(col) : desc(col);

  const total = db.select({ v: count() }).from(payments).get()?.v ?? 0;
  const rows = db
    .select({
      payment: payments,
      invoiceNumber: invoices.number,
      clientName: clients.name,
      currency: invoices.currency,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(orderBy)
    .limit(params.pageSize)
    .offset(params.offset)
    .all()
    .map((r) => ({
      ...r.payment,
      invoiceNumber: r.invoiceNumber,
      clientName: r.clientName,
      currency: r.currency,
    }));

  return paged(rows, total, params);
}

export type ReceiptDetail = {
  payment: Payment;
  invoice: Invoice;
  client: Client;
  /** Total paid across all receipts for the invoice, and the remaining balance. */
  invoicePaid: number;
  invoiceBalance: number;
};

export function getReceipt(id: number): ReceiptDetail | undefined {
  const payment = db.select().from(payments).where(eq(payments.id, id)).get();
  if (!payment) return undefined;
  const invoice = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, payment.invoiceId))
    .get();
  if (!invoice) return undefined;
  const client = db.select().from(clients).where(eq(clients.id, invoice.clientId)).get();
  if (!client) return undefined;
  return {
    payment,
    invoice,
    client,
    invoicePaid: invoice.amountPaid ?? 0,
    invoiceBalance: (invoice.total ?? 0) - (invoice.amountPaid ?? 0),
  };
}
