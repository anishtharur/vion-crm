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
import {
  lineTotal as calcLine,
  computeTotals,
  round2,
} from "@/lib/utils/money";
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
    currency: formData.get("currency") ?? "USD",
    dueDate: formData.get("dueDate") ?? "",
    status: formData.get("status") ?? "draft",
    discount: formData.get("discount") ?? 0,
    taxRate: formData.get("taxRate") ?? 5,
    termsScope: formData.get("termsScope") ?? "",
    termsPrices: formData.get("termsPrices") ?? "",
    termsDelivery: formData.get("termsDelivery") ?? "",
    termsWarranty: formData.get("termsWarranty") ?? "",
    termsCompliance: formData.get("termsCompliance") ?? "",
    termsPacking: formData.get("termsPacking") ?? "",
    notes: formData.get("notes") ?? "",
    terms: formData.get("terms") ?? "",
    items: pruneItems(readItemsJson(formData) as never[]),
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertInvoiceItems(
  tx: Tx,
  invoiceId: number,
  items: PrunedItem[],
) {
  for (const [index, item] of items.entries()) {
    await tx
      .insert(invoiceItems)
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
  }
}

export async function createInvoice(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);
  const settings = await getSettings();

  const newId = await db.transaction(async (tx) => {
    const number = await nextInvoiceNumber(settings.invoicePrefix, tx);
    const invoice = tx
      .insert(invoices)
      .values({
        number,
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        currency: data.currency,
        dueDate: data.dueDate || "",
        termsScope: data.termsScope,
        termsPrices: data.termsPrices,
        termsDelivery: data.termsDelivery,
        termsWarranty: data.termsWarranty,
        termsCompliance: data.termsCompliance,
        termsPacking: data.termsPacking,
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
    const insertedInvoice = await invoice;
    await insertInvoiceItems(tx, insertedInvoice.id, data.items);
    return insertedInvoice.id;
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
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);

  await db.transaction(async (tx) => {
    await tx
      .update(invoices)
      .set({
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        currency: data.currency,
        dueDate: data.dueDate || "",
        termsScope: data.termsScope,
        termsPrices: data.termsPrices,
        termsDelivery: data.termsDelivery,
        termsWarranty: data.termsWarranty,
        termsCompliance: data.termsCompliance,
        termsPacking: data.termsPacking,
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
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).run();
    await insertInvoiceItems(tx, id, data.items);
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
  await db
    .update(invoices)
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
  await db.delete(invoices).where(eq(invoices.id, id)).run();
  revalidatePath("/invoices");
  redirect("/invoices");
}

/** Delete an invoice from the list (stays on the list; no redirect). */
export async function deleteInvoiceRow(id: number): Promise<FormState> {
  await db.delete(invoices).where(eq(invoices.id, id)).run();
  revalidatePath("/invoices");
  return { ok: true };
}

/** Delete a payment receipt from the receipts list and resync its invoice. */
export async function deleteReceiptRow(paymentId: number): Promise<FormState> {
  await db.transaction(async (tx) => {
    const pay = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .get();
    if (!pay) return;
    await tx.delete(payments).where(eq(payments.id, paymentId)).run();
    await syncInvoiceTotals(tx, pay.invoiceId);
  });
  revalidatePath("/receipts");
  revalidatePath("/invoices");
  return { ok: true };
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
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const settings = await getSettings();

  await db.transaction(async (tx) => {
    const number = await nextReceiptNumber(settings.receiptPrefix, tx);
    const reference = await receiptReference(tx, invoiceId);
    await tx
      .insert(payments)
      .values({
        ...parsed.data,
        number,
        reference,
      })
      .run();
    await syncInvoiceTotals(tx, invoiceId);
  });

  revalidatePath("/invoices");
  revalidatePath("/receipts");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

/** Build the "received against" reference chain (invoice · pro-forma · quote numbers). */
async function receiptReference(tx: Tx, invoiceId: number): Promise<string> {
  const invoice = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();
  if (!invoice) return "";
  const parts = [invoice.number];
  if (invoice.proformaId) {
    const pi = await tx
      .select()
      .from(proformas)
      .where(eq(proformas.id, invoice.proformaId))
      .get();
    if (pi) parts.push(pi.number);
  }
  if (invoice.orderId) {
    const order = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, invoice.orderId))
      .get();
    if (order) parts.push(order.number);
  }
  if (invoice.quoteId) {
    const quote = await tx
      .select()
      .from(quotes)
      .where(eq(quotes.id, invoice.quoteId))
      .get();
    if (quote) parts.push(quote.number);
  }
  return parts.join(" · ");
}

export async function deletePayment(
  paymentId: number,
  invoiceId: number,
): Promise<FormState> {
  await db.transaction(async (tx) => {
    await tx.delete(payments).where(eq(payments.id, paymentId)).run();
    await syncInvoiceTotals(tx, invoiceId);
  });
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

/** Recompute amountPaid (sum of payments) and derive paid/partial status. */
async function syncInvoiceTotals(tx: Tx, invoiceId: number) {
  const invoice = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();
  if (!invoice) return;
  const paidRow = await tx
    .select({ sum: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .get();
  const amountPaid = round2(paidRow?.sum ?? 0);
  const status = statusFromPayment(amountPaid, invoice.total, invoice.status);
  await tx
    .update(invoices)
    .set({ amountPaid, status })
    .where(eq(invoices.id, invoiceId))
    .run();
}
