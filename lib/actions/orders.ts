"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
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
import {
  itemCopy,
  pruneItems,
  readItemsJson,
  type PrunedItem,
} from "./_shared";

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

async function insertOrderItems(tx: Tx, orderId: number, items: PrunedItem[]) {
  for (const [index, item] of items.entries()) {
    await tx
      .insert(orderItems)
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
  }
}

export async function createOrder(
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
    const number = await nextOrderNumber(settings.orderPrefix, tx);
    const order = tx
      .insert(orders)
      .values({
        number,
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        currency: data.currency,
        deliveryTime: data.deliveryTime,
        subject: data.subject,
        projectName: data.projectName,
        enquiryRef: data.enquiryRef,
        attention: data.attention,
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
      .returning({ id: orders.id })
      .get();
    const insertedOrder = await order;
    await insertOrderItems(tx, insertedOrder.id, data.items);
    return insertedOrder.id;
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
  if (!parsed.success)
    return { ok: false, errors: flattenErrors(parsed.error) };
  const data = parsed.data;
  const totals = computeTotals(data);

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
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
      .where(eq(orders.id, id))
      .run();
    await tx.delete(orderItems).where(eq(orderItems.orderId, id)).run();
    await insertOrderItems(tx, id, data.items);
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}`);
}

export async function setOrderStatus(
  id: number,
  status: string,
): Promise<FormState> {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return { ok: false, message: "Invalid status" };
  }
  await db
    .update(orders)
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
  await db.delete(orders).where(eq(orders.id, id)).run();
  revalidatePath("/orders");
  redirect("/orders");
}

/** Delete an order from the list (stays on the list; no redirect). */
export async function deleteOrderRow(id: number): Promise<FormState> {
  await db.delete(orders).where(eq(orders.id, id)).run();
  revalidatePath("/orders");
  return { ok: true };
}

/** Create a Pro-forma Invoice from an order, copying items and totals. */
export async function convertOrderToProforma(id: number): Promise<FormState> {
  const settings = await getSettings();
  const newId = await db.transaction(async (tx) => {
    const order = await tx.select().from(orders).where(eq(orders.id, id)).get();
    if (!order) throw new Error("Order not found");
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(orderItems.sortOrder)
      .all();
    const existing = await tx
      .select()
      .from(proformas)
      .where(eq(proformas.orderId, id))
      .orderBy(desc(proformas.createdAt))
      .limit(1)
      .get();
    if (existing) {
      if (existing.status === "draft") {
        await tx
          .update(proformas)
          .set({
            clientId: order.clientId,
            quoteId: order.quoteId ?? null,
            currency: order.currency,
            subject: order.subject,
            projectName: order.projectName,
            enquiryRef: order.enquiryRef,
            attention: order.attention,
            termsScope: order.termsScope,
            termsPrices: order.termsPrices,
            termsDelivery: order.termsDelivery,
            termsWarranty: order.termsWarranty,
            termsCompliance: order.termsCompliance,
            termsPacking: order.termsPacking,
            notes: order.notes,
            terms: order.terms || settings.paymentTerms,
            subtotal: order.subtotal,
            discount: order.discount,
            taxRate: order.taxRate,
            taxAmount: order.taxAmount,
            total: order.total,
          })
          .where(eq(proformas.id, existing.id))
          .run();
        await tx
          .delete(proformaItems)
          .where(eq(proformaItems.proformaId, existing.id))
          .run();
        for (const it of items) {
          await tx
            .insert(proformaItems)
            .values({ proformaId: existing.id, ...itemCopy(it) })
            .run();
        }
      }
      return existing.id;
    }
    const number = await nextProformaNumber(settings.proformaPrefix, tx);

    const issueDate = new Date().toISOString().slice(0, 10);
    const proforma = tx
      .insert(proformas)
      .values({
        number,
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
        termsScope: order.termsScope,
        termsPrices: order.termsPrices,
        termsDelivery: order.termsDelivery,
        termsWarranty: order.termsWarranty,
        termsCompliance: order.termsCompliance,
        termsPacking: order.termsPacking,
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
    const insertedProforma = await proforma;
    for (const it of items) {
      await tx
        .insert(proformaItems)
        .values({ proformaId: insertedProforma.id, ...itemCopy(it) })
        .run();
    }
    return insertedProforma.id;
  });

  revalidatePath("/orders");
  revalidatePath("/proformas");
  redirect(`/proformas/${newId}`);
}

/** Create an Invoice from an order, copying items and totals. */
export async function convertOrderToInvoice(id: number): Promise<FormState> {
  const settings = await getSettings();
  const newId = await db.transaction(async (tx) => {
    const order = await tx.select().from(orders).where(eq(orders.id, id)).get();
    if (!order) throw new Error("Order not found");
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(orderItems.sortOrder)
      .all();
    const existing = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.orderId, id), isNull(invoices.proformaId)))
      .orderBy(desc(invoices.createdAt))
      .limit(1)
      .get();
    if (existing) {
      if (existing.status === "draft" && (existing.amountPaid ?? 0) === 0) {
        await tx
          .update(invoices)
          .set({
            clientId: order.clientId,
            quoteId: order.quoteId ?? null,
            currency: order.currency,
            termsScope: order.termsScope,
            termsPrices: order.termsPrices,
            termsDelivery: order.termsDelivery,
            termsWarranty: order.termsWarranty,
            termsCompliance: order.termsCompliance,
            termsPacking: order.termsPacking,
            notes: order.notes,
            terms: order.terms || settings.paymentTerms,
            subtotal: order.subtotal,
            discount: order.discount,
            taxRate: order.taxRate,
            taxAmount: order.taxAmount,
            total: order.total,
          })
          .where(eq(invoices.id, existing.id))
          .run();
        await tx
          .delete(invoiceItems)
          .where(eq(invoiceItems.invoiceId, existing.id))
          .run();
        for (const it of items) {
          await tx
            .insert(invoiceItems)
            .values({ invoiceId: existing.id, ...itemCopy(it) })
            .run();
        }
      }
      return existing.id;
    }
    const number = await nextInvoiceNumber(settings.invoicePrefix, tx);

    const issueDate = new Date().toISOString().slice(0, 10);
    const invoice = tx
      .insert(invoices)
      .values({
        number,
        clientId: order.clientId,
        quoteId: order.quoteId ?? null,
        orderId: order.id,
        status: "draft",
        issueDate,
        currency: order.currency,
        dueDate: addDays(issueDate, settings.paymentTermsDays),
        termsScope: order.termsScope,
        termsPrices: order.termsPrices,
        termsDelivery: order.termsDelivery,
        termsWarranty: order.termsWarranty,
        termsCompliance: order.termsCompliance,
        termsPacking: order.termsPacking,
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
    const insertedInvoice = await invoice;
    for (const it of items) {
      await tx
        .insert(invoiceItems)
        .values({ invoiceId: insertedInvoice.id, ...itemCopy(it) })
        .run();
    }
    if (order.status === "draft") {
      await tx
        .update(orders)
        .set({ status: "confirmed" })
        .where(eq(orders.id, id))
        .run();
    }
    return insertedInvoice.id;
  });

  revalidatePath("/orders");
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}
