"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  nextInvoiceNumber,
  nextOrderNumber,
  nextProformaNumber,
  nextQuoteNumber,
} from "@/lib/db/numbering";
import { getSettings } from "@/lib/data/settings";
import {
  QUOTE_STATUSES,
  invoiceItems,
  invoices,
  orderItems,
  orders,
  proformaItems,
  proformas,
  quoteItems,
  quotes,
  type QuoteStatus,
} from "@/lib/db/schema";
import { lineTotal as calcLine, computeTotals } from "@/lib/utils/money";
import { addDays } from "@/lib/utils/format";
import {
  flattenErrors,
  quoteSchema,
  type FormState,
} from "@/lib/validation/schemas";
import { itemCopy, pruneItems, readItemsJson, type PrunedItem } from "./_shared";

function parse(formData: FormData) {
  return quoteSchema.safeParse({
    clientId: formData.get("clientId"),
    issueDate: formData.get("issueDate"),
    validUntil: formData.get("validUntil") ?? "",
    status: formData.get("status") ?? "draft",
    subject: formData.get("subject") ?? "",
    projectName: formData.get("projectName") ?? "",
    enquiryRef: formData.get("enquiryRef") ?? "",
    attention: formData.get("attention") ?? "",
    discount: formData.get("discount") ?? 0,
    taxRate: formData.get("taxRate") ?? 0,
    notes: formData.get("notes") ?? "",
    terms: formData.get("terms") ?? "",
    items: pruneItems(readItemsJson(formData) as never[]),
  });
}

export async function createQuote(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);
  const settings = getSettings();

  const newId = db.transaction((tx) => {
    const quote = tx
      .insert(quotes)
      .values({
        number: nextQuoteNumber(settings.quotePrefix),
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        validUntil: data.validUntil || "",
        subject: data.subject,
        projectName: data.projectName,
        enquiryRef: data.enquiryRef,
        attention: data.attention,
        notes: data.notes,
        terms: data.terms,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxRate: data.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
      })
      .returning({ id: quotes.id })
      .get();

    insertQuoteItems(tx, quote.id, data.items);
    return quote.id;
  });

  revalidatePath("/quotes");
  redirect(`/quotes/${newId}`);
}

export async function updateQuote(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);

  db.transaction((tx) => {
    tx.update(quotes)
      .set({
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        validUntil: data.validUntil || "",
        subject: data.subject,
        projectName: data.projectName,
        enquiryRef: data.enquiryRef,
        attention: data.attention,
        notes: data.notes,
        terms: data.terms,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxRate: data.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
      })
      .where(eq(quotes.id, id))
      .run();

    tx.delete(quoteItems).where(eq(quoteItems.quoteId, id)).run();
    insertQuoteItems(tx, id, data.items);
  });

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export async function setQuoteStatus(
  id: number,
  status: string,
): Promise<FormState> {
  if (!QUOTE_STATUSES.includes(status as QuoteStatus)) {
    return { ok: false, message: "Invalid status" };
  }
  db.update(quotes)
    .set({ status: status as QuoteStatus })
    .where(eq(quotes.id, id))
    .run();
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  return { ok: true };
}

export async function deleteQuote(
  id: number,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  db.delete(quotes).where(eq(quotes.id, id)).run();
  revalidatePath("/quotes");
  redirect("/quotes");
}

/** Create an invoice from an existing quote, copying line items and totals. */
export async function convertQuoteToInvoice(id: number): Promise<FormState> {
  const settings = getSettings();
  const newId = db.transaction((tx) => {
    const quote = tx.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) throw new Error("Quote not found");
    const items = tx
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))
      .orderBy(quoteItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const invoice = tx
      .insert(invoices)
      .values({
        number: nextInvoiceNumber(settings.invoicePrefix),
        clientId: quote.clientId,
        quoteId: quote.id,
        status: "draft",
        issueDate,
        dueDate: addDays(issueDate, settings.paymentTermsDays),
        notes: quote.notes,
        terms: quote.terms || settings.paymentTerms,
        subtotal: quote.subtotal,
        discount: quote.discount,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
        amountPaid: 0,
      })
      .returning({ id: invoices.id })
      .get();

    for (const it of items) {
      tx.insert(invoiceItems)
        .values({
          invoiceId: invoice.id,
          description: it.description,
          detail: it.detail,
          standard: it.standard,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
          sortOrder: it.sortOrder,
        })
        .run();
    }

    // Reflect that the quote has been actioned.
    if (quote.status === "draft" || quote.status === "sent") {
      tx.update(quotes).set({ status: "accepted" }).where(eq(quotes.id, id)).run();
    }
    return invoice.id;
  });

  revalidatePath("/quotes");
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}

/** Create an Order Acknowledgement from a quote, copying line items and totals. */
export async function convertQuoteToOrder(id: number): Promise<FormState> {
  const settings = getSettings();
  const newId = db.transaction((tx) => {
    const quote = tx.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) throw new Error("Quote not found");
    const items = tx
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))
      .orderBy(quoteItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const order = tx
      .insert(orders)
      .values({
        number: nextOrderNumber(settings.orderPrefix),
        clientId: quote.clientId,
        quoteId: quote.id,
        status: "draft",
        issueDate,
        deliveryTime: "",
        subject: quote.subject,
        projectName: quote.projectName,
        enquiryRef: quote.enquiryRef,
        attention: quote.attention,
        notes: quote.notes,
        terms: quote.terms || settings.paymentTerms,
        subtotal: quote.subtotal,
        discount: quote.discount,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
      })
      .returning({ id: orders.id })
      .get();
    for (const it of items) {
      tx.insert(orderItems).values({ orderId: order.id, ...itemCopy(it) }).run();
    }
    if (quote.status === "draft" || quote.status === "sent") {
      tx.update(quotes).set({ status: "accepted" }).where(eq(quotes.id, id)).run();
    }
    return order.id;
  });

  revalidatePath("/quotes");
  revalidatePath("/orders");
  redirect(`/orders/${newId}`);
}

/** Create a Pro-forma Invoice directly from a quote, copying line items and totals. */
export async function convertQuoteToProforma(id: number): Promise<FormState> {
  const settings = getSettings();
  const newId = db.transaction((tx) => {
    const quote = tx.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) throw new Error("Quote not found");
    const items = tx
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))
      .orderBy(quoteItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const proforma = tx
      .insert(proformas)
      .values({
        number: nextProformaNumber(settings.proformaPrefix),
        clientId: quote.clientId,
        quoteId: quote.id,
        status: "draft",
        issueDate,
        validUntil: addDays(issueDate, settings.quoteValidityDays),
        subject: quote.subject,
        projectName: quote.projectName,
        enquiryRef: quote.enquiryRef,
        attention: quote.attention,
        notes: quote.notes,
        terms: quote.terms || settings.paymentTerms,
        subtotal: quote.subtotal,
        discount: quote.discount,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
      })
      .returning({ id: proformas.id })
      .get();
    for (const it of items) {
      tx.insert(proformaItems).values({ proformaId: proforma.id, ...itemCopy(it) }).run();
    }
    return proforma.id;
  });

  revalidatePath("/quotes");
  revalidatePath("/proformas");
  redirect(`/proformas/${newId}`);
}

// --- helpers -------------------------------------------------------------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function insertQuoteItems(tx: Tx, quoteId: number, items: PrunedItem[]) {
  items.forEach((item, index) => {
    tx.insert(quoteItems)
      .values({
        quoteId,
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
