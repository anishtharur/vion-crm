"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { nextInvoiceNumber, nextProformaNumber } from "@/lib/db/numbering";
import { getSettings } from "@/lib/data/settings";
import {
  PROFORMA_STATUSES,
  invoiceItems,
  invoices,
  proformaItems,
  proformas,
  type ProformaStatus,
} from "@/lib/db/schema";
import { lineTotal as calcLine, computeTotals } from "@/lib/utils/money";
import { addDays } from "@/lib/utils/format";
import {
  flattenErrors,
  proformaSchema,
  type FormState,
} from "@/lib/validation/schemas";
import { itemCopy, pruneItems, readItemsJson, type PrunedItem } from "./_shared";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function parse(formData: FormData) {
  return proformaSchema.safeParse({
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
    taxRate: formData.get("taxRate") ?? 0,
    notes: formData.get("notes") ?? "",
    terms: formData.get("terms") ?? "",
    items: pruneItems(readItemsJson(formData) as never[]),
  });
}

function insertProformaItems(tx: Tx, proformaId: number, items: PrunedItem[]) {
  items.forEach((item, index) => {
    tx.insert(proformaItems)
      .values({
        proformaId,
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

export async function createProforma(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);
  const settings = getSettings();

  const newId = db.transaction((tx) => {
    const proforma = tx
      .insert(proformas)
      .values({
        number: nextProformaNumber(settings.proformaPrefix),
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
      .returning({ id: proformas.id })
      .get();
    insertProformaItems(tx, proforma.id, data.items);
    return proforma.id;
  });

  revalidatePath("/proformas");
  redirect(`/proformas/${newId}`);
}

export async function updateProforma(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);

  db.transaction((tx) => {
    tx.update(proformas)
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
      .where(eq(proformas.id, id))
      .run();
    tx.delete(proformaItems).where(eq(proformaItems.proformaId, id)).run();
    insertProformaItems(tx, id, data.items);
  });

  revalidatePath("/proformas");
  revalidatePath(`/proformas/${id}`);
  redirect(`/proformas/${id}`);
}

export async function setProformaStatus(
  id: number,
  status: string,
): Promise<FormState> {
  if (!PROFORMA_STATUSES.includes(status as ProformaStatus)) {
    return { ok: false, message: "Invalid status" };
  }
  db.update(proformas)
    .set({ status: status as ProformaStatus })
    .where(eq(proformas.id, id))
    .run();
  revalidatePath("/proformas");
  revalidatePath(`/proformas/${id}`);
  return { ok: true };
}

export async function deleteProforma(
  id: number,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  db.delete(proformas).where(eq(proformas.id, id)).run();
  revalidatePath("/proformas");
  redirect("/proformas");
}

/** Delete a pro-forma from the list (stays on the list; no redirect). */
export async function deleteProformaRow(id: number): Promise<FormState> {
  db.delete(proformas).where(eq(proformas.id, id)).run();
  revalidatePath("/proformas");
  return { ok: true };
}

/** Create an Invoice from a pro-forma, copying items and totals. */
export async function convertProformaToInvoice(id: number): Promise<FormState> {
  const settings = getSettings();
  const newId = db.transaction((tx) => {
    const proforma = tx.select().from(proformas).where(eq(proformas.id, id)).get();
    if (!proforma) throw new Error("Pro-forma not found");
    const items = tx
      .select()
      .from(proformaItems)
      .where(eq(proformaItems.proformaId, id))
      .orderBy(proformaItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const invoice = tx
      .insert(invoices)
      .values({
        number: nextInvoiceNumber(settings.invoicePrefix),
        clientId: proforma.clientId,
        quoteId: proforma.quoteId ?? null,
        orderId: proforma.orderId ?? null,
        proformaId: proforma.id,
        status: "draft",
        issueDate,
        currency: proforma.currency,
        dueDate: addDays(issueDate, settings.paymentTermsDays),
        notes: proforma.notes,
        terms: proforma.terms || settings.paymentTerms,
        subtotal: proforma.subtotal,
        discount: proforma.discount,
        taxRate: proforma.taxRate,
        taxAmount: proforma.taxAmount,
        total: proforma.total,
        amountPaid: 0,
      })
      .returning({ id: invoices.id })
      .get();
    for (const it of items) {
      tx.insert(invoiceItems).values({ invoiceId: invoice.id, ...itemCopy(it) }).run();
    }
    return invoice.id;
  });

  revalidatePath("/proformas");
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}
