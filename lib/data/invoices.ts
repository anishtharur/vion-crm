import "server-only";

import { desc, eq } from "drizzle-orm";

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

export type InvoiceListRow = Invoice & {
  clientName: string;
  clientCompany: string;
  displayStatus: string;
  balance: number;
};

export function listInvoices(): InvoiceListRow[] {
  const today = todayISO();
  return db
    .select({
      invoice: invoices,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.createdAt))
    .all()
    .map((r) => ({
      ...r.invoice,
      clientName: r.clientName,
      clientCompany: r.clientCompany,
      displayStatus: displayInvoiceStatus(r.invoice, today),
      balance: (r.invoice.total ?? 0) - (r.invoice.amountPaid ?? 0),
    }));
}

export type InvoiceWithItems = {
  invoice: Invoice;
  client: Client;
  items: InvoiceItem[];
  payments: Payment[];
  displayStatus: string;
  balance: number;
};

export function getInvoice(id: number): InvoiceWithItems | undefined {
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) return undefined;
  const client = db.select().from(clients).where(eq(clients.id, invoice.clientId)).get();
  if (!client) return undefined;
  const items = db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder)
    .all();
  const pays = db
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
