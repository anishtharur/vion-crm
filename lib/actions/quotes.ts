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
import {
  itemCopy,
  pruneItems,
  readItemsJson,
  type PrunedItem,
} from "./_shared";

function parse(formData: FormData) {
  return quoteSchema.safeParse({
    clientId: formData.get("clientId"),
    issueDate: formData.get("issueDate"),
    currency: formData.get("currency") ?? "USD",
    validUntil: formData.get("validUntil") ?? "",
    status: formData.get("status") ?? "draft",
    subject: formData.get("subject") ?? "",
    projectName: formData.get("projectName") ?? "",
    enquiryRef: formData.get("enquiryRef") ?? "",
    attention: formData.get("attention") ?? "",
    discount: formData.get("discount") ?? 0,
    taxRate: formData.get("taxRate") ?? 5,
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
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);
  const settings = await getSettings();

  const newId = await db.transaction(async (tx) => {
    const number = await nextQuoteNumber(settings.quotePrefix, tx);
    const quote = tx
      .insert(quotes)
      .values({
        number,
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        currency: data.currency,
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

    const insertedQuote = await quote;
    await insertQuoteItems(tx, insertedQuote.id, data.items);
    return insertedQuote.id;
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
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);

  await db.transaction(async (tx) => {
    await tx
      .update(quotes)
      .set({
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        currency: data.currency,
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

    await tx.delete(quoteItems).where(eq(quoteItems.quoteId, id)).run();
    await insertQuoteItems(tx, id, data.items);
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
  await db
    .update(quotes)
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
  await db.delete(quotes).where(eq(quotes.id, id)).run();
  revalidatePath("/quotes");
  redirect("/quotes");
}

/** Delete a quote from the list (stays on the list; no redirect). */
export async function deleteQuoteRow(id: number): Promise<FormState> {
  await db.delete(quotes).where(eq(quotes.id, id)).run();
  revalidatePath("/quotes");
  return { ok: true };
}

/** Create an invoice from an existing quote, copying line items and totals. */
export async function convertQuoteToInvoice(id: number): Promise<FormState> {
  const settings = await getSettings();
  const newId = await db.transaction(async (tx) => {
    const number = await nextInvoiceNumber(settings.invoicePrefix, tx);
    const quote = await tx.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) throw new Error("Quote not found");
    const items = await tx
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))
      .orderBy(quoteItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const invoice = tx
      .insert(invoices)
      .values({
        number,
        clientId: quote.clientId,
        quoteId: quote.id,
        status: "draft",
        issueDate,
        currency: quote.currency,
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
    const insertedInvoice = await invoice;

    for (const it of items) {
      await tx
        .insert(invoiceItems)
        .values({
          invoiceId: insertedInvoice.id,
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
      await tx
        .update(quotes)
        .set({ status: "accepted" })
        .where(eq(quotes.id, id))
        .run();
    }
    return insertedInvoice.id;
  });

  revalidatePath("/quotes");
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}

/** Create an Order Acknowledgement from a quote, copying line items and totals. */
export async function convertQuoteToOrder(id: number): Promise<FormState> {
  const settings = await getSettings();
  const newId = await db.transaction(async (tx) => {
    const number = await nextOrderNumber(settings.orderPrefix, tx);
    const quote = await tx.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) throw new Error("Quote not found");
    const items = await tx
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))
      .orderBy(quoteItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const order = tx
      .insert(orders)
      .values({
        number,
        clientId: quote.clientId,
        quoteId: quote.id,
        status: "draft",
        issueDate,
        currency: quote.currency,
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
    const insertedOrder = await order;
    for (const it of items) {
      await tx
        .insert(orderItems)
        .values({ orderId: insertedOrder.id, ...itemCopy(it) })
        .run();
    }
    if (quote.status === "draft" || quote.status === "sent") {
      await tx
        .update(quotes)
        .set({ status: "accepted" })
        .where(eq(quotes.id, id))
        .run();
    }
    return insertedOrder.id;
  });

  revalidatePath("/quotes");
  revalidatePath("/orders");
  redirect(`/orders/${newId}`);
}

/** Create a Pro-forma Invoice directly from a quote, copying line items and totals. */
export async function convertQuoteToProforma(id: number): Promise<FormState> {
  const settings = await getSettings();
  const newId = await db.transaction(async (tx) => {
    const number = await nextProformaNumber(settings.proformaPrefix, tx);
    const quote = await tx.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) throw new Error("Quote not found");
    const items = await tx
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))
      .orderBy(quoteItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const proforma = tx
      .insert(proformas)
      .values({
        number,
        clientId: quote.clientId,
        quoteId: quote.id,
        status: "draft",
        issueDate,
        currency: quote.currency,
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
    const insertedProforma = await proforma;
    for (const it of items) {
      await tx
        .insert(proformaItems)
        .values({ proformaId: insertedProforma.id, ...itemCopy(it) })
        .run();
    }
    return insertedProforma.id;
  });

  revalidatePath("/quotes");
  revalidatePath("/proformas");
  redirect(`/proformas/${newId}`);
}

// --- helpers -------------------------------------------------------------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertQuoteItems(tx: Tx, quoteId: number, items: PrunedItem[]) {
  for (const [index, item] of items.entries()) {
    await tx
      .insert(quoteItems)
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
  }
}
