"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { clients, invoices, quotes } from "@/lib/db/schema";
import {
  clientSchema,
  flattenErrors,
  type FormState,
} from "@/lib/validation/schemas";

function parseClientForm(formData: FormData) {
  return clientSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    fax: formData.get("fax") ?? "",
    billingAddress: formData.get("billingAddress") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createClient(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }

  const result = db.insert(clients).values(parsed.data).returning({ id: clients.id }).get();
  revalidatePath("/clients");
  redirect(`/clients/${result.id}`);
}

export async function updateClient(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { ok: false, errors: flattenErrors(parsed.error) };
  }

  db.update(clients).set(parsed.data).where(eq(clients.id, id)).run();
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClient(
  id: number,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  // Guard: don't orphan documents. Block deletion if the client is referenced.
  const quoteCount =
    db
      .select({ c: sql<number>`count(*)` })
      .from(quotes)
      .where(eq(quotes.clientId, id))
      .get()?.c ?? 0;
  const invoiceCount =
    db
      .select({ c: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.clientId, id))
      .get()?.c ?? 0;
  if (quoteCount > 0 || invoiceCount > 0) {
    return {
      ok: false,
      message:
        "This client has quotes or invoices. Delete those first before removing the client.",
    };
  }

  db.delete(clients).where(eq(clients.id, id)).run();
  revalidatePath("/clients");
  redirect("/clients");
}
