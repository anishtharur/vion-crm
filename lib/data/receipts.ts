import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  invoices,
  payments,
  type Client,
  type Invoice,
  type Payment,
} from "@/lib/db/schema";

export type ReceiptListRow = Payment & {
  invoiceNumber: string;
  clientName: string;
};

/** All recorded payments (each is a numbered Payment Receipt), newest first. */
export function listReceipts(): ReceiptListRow[] {
  return db
    .select({
      payment: payments,
      invoiceNumber: invoices.number,
      clientName: clients.name,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(payments.createdAt))
    .all()
    .map((r) => ({
      ...r.payment,
      invoiceNumber: r.invoiceNumber,
      clientName: r.clientName,
    }));
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
