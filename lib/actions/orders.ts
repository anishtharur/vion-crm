"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  nextInvoiceNumber,
  nextOrderNumber,
  nextProformaNumber,
} from "@/lib/db/numbering";
import { getSettings } from "@/lib/data/settings";
import {
  ORDER_STATUSES,
  invoiceItems,
  invoices,
  orderItems,
  orders,
  proformaItems,
  proformas,
  type OrderStatus,
} from "@/lib/db/schema";
import { lineTotal as calcLine, computeTotals } from "@/lib/utils/money";
import { addDays } from "@/lib/utils/format";
import {
  flattenErrors,
  orderSchema,
  type FormState,
} from "@/lib/validation/schemas";
import { itemCopy, pruneItems, readItemsJson, type PrunedItem } from "./_shared";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function parse(formData: FormData) {
  return orderSchema.safeParse({
    clientId: formData.get("clientId"),
    issueDate: formData.get("issueDate"),
    currency: formData.get("currency") ?? "USD",
    status: formData.get("status") ?? "draft",
    deliveryTime: formData.get("deliveryTime") ?? "",
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

function insertOrderItems(tx: Tx, orderId: number, items: PrunedItem[]) {
  items.forEach((item, index) => {
    tx.insert(orderItems)
      .values({
        orderId,
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

export async function createOrder(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);
  const settings = getSettings();

  const newId = db.transaction((tx) => {
    const order = tx
      .insert(orders)
      .values({
        number: nextOrderNumber(settings.orderPrefix),
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        currency: data.currency,
        deliveryTime: data.deliveryTime,
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
      .returning({ id: orders.id })
      .get();
    insertOrderItems(tx, order.id, data.items);
    return order.id;
  });

  revalidatePath("/orders");
  redirect(`/orders/${newId}`);
}

export async function updateOrder(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);

  db.transaction((tx) => {
    tx.update(orders)
      .set({
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        currency: data.currency,
        deliveryTime: data.deliveryTime,
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
      .where(eq(orders.id, id))
      .run();
    tx.delete(orderItems).where(eq(orderItems.orderId, id)).run();
    insertOrderItems(tx, id, data.items);
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function setOrderStatus(id: number, status: string): Promise<FormState> {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return { ok: false, message: "Invalid status" };
  }
  db.update(orders)
    .set({ status: status as OrderStatus })
    .where(eq(orders.id, id))
    .run();
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  return { ok: true };
}

export async function deleteOrder(
  id: number,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  db.delete(orders).where(eq(orders.id, id)).run();
  revalidatePath("/orders");
  redirect("/orders");
}

/** Delete an order from the list (stays on the list; no redirect). */
export async function deleteOrderRow(id: number): Promise<FormState> {
  db.delete(orders).where(eq(orders.id, id)).run();
  revalidatePath("/orders");
  return { ok: true };
}

/** Create a Pro-forma Invoice from an order, copying items and totals. */
export async function convertOrderToProforma(id: number): Promise<FormState> {
  const settings = getSettings();
  const newId = db.transaction((tx) => {
    const order = tx.select().from(orders).where(eq(orders.id, id)).get();
    if (!order) throw new Error("Order not found");
    const items = tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(orderItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const proforma = tx
      .insert(proformas)
      .values({
        number: nextProformaNumber(settings.proformaPrefix),
        clientId: order.clientId,
        quoteId: order.quoteId ?? null,
        orderId: order.id,
        status: "draft",
        issueDate,
        currency: order.currency,
        validUntil: addDays(issueDate, settings.quoteValidityDays),
        subject: order.subject,
        projectName: order.projectName,
        enquiryRef: order.enquiryRef,
        attention: order.attention,
        notes: order.notes,
        terms: order.terms || settings.paymentTerms,
        subtotal: order.subtotal,
        discount: order.discount,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        total: order.total,
      })
      .returning({ id: proformas.id })
      .get();
    for (const it of items) {
      tx.insert(proformaItems).values({ proformaId: proforma.id, ...itemCopy(it) }).run();
    }
    return proforma.id;
  });

  revalidatePath("/orders");
  revalidatePath("/proformas");
  redirect(`/proformas/${newId}`);
}

/** Create an Invoice from an order, copying items and totals. */
export async function convertOrderToInvoice(id: number): Promise<FormState> {
  const settings = getSettings();
  const newId = db.transaction((tx) => {
    const order = tx.select().from(orders).where(eq(orders.id, id)).get();
    if (!order) throw new Error("Order not found");
    const items = tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(orderItems.sortOrder)
      .all();

    const issueDate = new Date().toISOString().slice(0, 10);
    const invoice = tx
      .insert(invoices)
      .values({
        number: nextInvoiceNumber(settings.invoicePrefix),
        clientId: order.clientId,
        quoteId: order.quoteId ?? null,
        orderId: order.id,
        status: "draft",
        issueDate,
        currency: order.currency,
        dueDate: addDays(issueDate, settings.paymentTermsDays),
        notes: order.notes,
        terms: order.terms || settings.paymentTerms,
        subtotal: order.subtotal,
        discount: order.discount,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        total: order.total,
        amountPaid: 0,
      })
      .returning({ id: invoices.id })
      .get();
    for (const it of items) {
      tx.insert(invoiceItems).values({ invoiceId: invoice.id, ...itemCopy(it) }).run();
    }
    if (order.status === "draft") {
      tx.update(orders).set({ status: "confirmed" }).where(eq(orders.id, id)).run();
    }
    return invoice.id;
  });

  revalidatePath("/orders");
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}
