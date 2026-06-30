"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { nextInvoiceNumber, nextReceiptNumber } from "@/lib/db/numbering";
import { getSettings } from "@/lib/data/settings";
import {
  INVOICE_STATUSES,
  invoiceItems,
  invoices,
  orders,
  payments,
  proformas,
  quotes,
  type InvoiceStatus,
} from "@/lib/db/schema";
import { lineTotal as calcLine, computeTotals, round2 } from "@/lib/utils/money";
import { statusFromPayment } from "@/lib/utils/invoice-status";
import {
  flattenErrors,
  invoiceSchema,
  paymentSchema,
  type FormState,
} from "@/lib/validation/schemas";
import { pruneItems, readItemsJson, type PrunedItem } from "./_shared";

function parse(formData: FormData) {
  return invoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") ?? "",
    status: formData.get("status") ?? "draft",
    discount: formData.get("discount") ?? 0,
    taxRate: formData.get("taxRate") ?? 0,
    notes: formData.get("notes") ?? "",
    terms: formData.get("terms") ?? "",
    items: pruneItems(readItemsJson(formData) as never[]),
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function insertInvoiceItems(tx: Tx, invoiceId: number, items: PrunedItem[]) {
  items.forEach((item, index) => {
    tx.insert(invoiceItems)
      .values({
        invoiceId,
        description: item.description,
        detail: item.detail,
        standard: item.standard,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: calcLine(item.quantity, item.unitPrice),
        sortOrder: index,
      })
      .run();
  });
}

export async function createInvoice(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);
  const settings = getSettings();

  const newId = db.transaction((tx) => {
    const invoice = tx
      .insert(invoices)
      .values({
        number: nextInvoiceNumber(settings.invoicePrefix),
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        dueDate: data.dueDate || "",
        notes: data.notes,
        terms: data.terms,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxRate: data.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        amountPaid: 0,
      })
      .returning({ id: invoices.id })
      .get();
    insertInvoiceItems(tx, invoice.id, data.items);
    return invoice.id;
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}

export async function updateInvoice(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);

  db.transaction((tx) => {
    tx.update(invoices)
      .set({
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        dueDate: data.dueDate || "",
        notes: data.notes,
        terms: data.terms,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxRate: data.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
      })
      .where(eq(invoices.id, id))
      .run();
    tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).run();
    insertInvoiceItems(tx, id, data.items);
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function setInvoiceStatus(
  id: number,
  status: string,
): Promise<FormState> {
  if (!INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    return { ok: false, message: "Invalid status" };
  }
  db.update(invoices)
    .set({ status: status as InvoiceStatus })
    .where(eq(invoices.id, id))
    .run();
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { ok: true };
}

export async function deleteInvoice(
  id: number,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  db.delete(invoices).where(eq(invoices.id, id)).run();
  revalidatePath("/invoices");
  redirect("/invoices");
}

/** Record a payment, then recompute amountPaid + status from all payments. */
export async function recordPayment(
  invoiceId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = paymentSchema.safeParse({
    invoiceId,
    amount: formData.get("amount"),
    paidOn: formData.get("paidOn"),
    method: formData.get("method") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const settings = getSettings();

  db.transaction((tx) => {
    tx.insert(payments)
      .values({
        ...parsed.data,
        number: nextReceiptNumber(settings.receiptPrefix),
        reference: receiptReference(tx, invoiceId),
      })
      .run();
    syncInvoiceTotals(tx, invoiceId);
  });

  revalidatePath("/invoices");
  revalidatePath("/receipts");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

/** Build the "received against" reference chain (invoice · pro-forma · quote numbers). */
function receiptReference(tx: Tx, invoiceId: number): string {
  const invoice = tx.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!invoice) return "";
  const parts = [invoice.number];
  if (invoice.proformaId) {
    const pi = tx.select().from(proformas).where(eq(proformas.id, invoice.proformaId)).get();
    if (pi) parts.push(pi.number);
  }
  if (invoice.orderId) {
    const order = tx.select().from(orders).where(eq(orders.id, invoice.orderId)).get();
    if (order) parts.push(order.number);
  }
  if (invoice.quoteId) {
    const quote = tx.select().from(quotes).where(eq(quotes.id, invoice.quoteId)).get();
    if (quote) parts.push(quote.number);
  }
  return parts.join(" · ");
}

export async function deletePayment(
  paymentId: number,
  invoiceId: number,
): Promise<FormState> {
  db.transaction((tx) => {
    tx.delete(payments).where(eq(payments.id, paymentId)).run();
    syncInvoiceTotals(tx, invoiceId);
  });
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

/** Recompute amountPaid (sum of payments) and derive paid/partial status. */
function syncInvoiceTotals(tx: Tx, invoiceId: number) {
  const invoice = tx.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!invoice) return;
  const paidRow = tx
    .select({ sum: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .get();
  const amountPaid = round2(paidRow?.sum ?? 0);
  const status = statusFromPayment(amountPaid, invoice.total, invoice.status);
  tx.update(invoices).set({ amountPaid, status }).where(eq(invoices.id, invoiceId)).run();
}
