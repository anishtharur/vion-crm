"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  flattenErrors,
  settingsSchema,
  type FormState,
} from "@/lib/validation/schemas";

export async function updateSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = settingsSchema.safeParse({
    companyName: formData.get("companyName"),
    tagline: formData.get("tagline") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    website: formData.get("website") ?? "",
    gstin: formData.get("gstin") ?? "",
    currencySymbol: formData.get("currencySymbol"),
    currencyCode: formData.get("currencyCode") ?? "USD",
    defaultTaxRate: formData.get("defaultTaxRate") ?? 0,
    taxLabel: formData.get("taxLabel"),
    quotePrefix: formData.get("quotePrefix"),
    orderPrefix: formData.get("orderPrefix"),
    proformaPrefix: formData.get("proformaPrefix"),
    invoicePrefix: formData.get("invoicePrefix"),
    receiptPrefix: formData.get("receiptPrefix"),
    quoteValidityDays: formData.get("quoteValidityDays") ?? 30,
    paymentTermsDays: formData.get("paymentTermsDays") ?? 14,
    paymentTerms: formData.get("paymentTerms") ?? "",
    bankDetails: formData.get("bankDetails") ?? "",
    footerNote: formData.get("footerNote") ?? "",
    signatoryName: formData.get("signatoryName") ?? "",
    termsScope: formData.get("termsScope") ?? "",
    termsPrices: formData.get("termsPrices") ?? "",
    termsDelivery: formData.get("termsDelivery") ?? "",
    termsWarranty: formData.get("termsWarranty") ?? "",
    termsCompliance: formData.get("termsCompliance") ?? "",
    termsPacking: formData.get("termsPacking") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error) };

  // Ensure the single row exists, then update it.
  db.insert(settings).values({ id: 1, ...parsed.data }).onConflictDoUpdate({
    target: settings.id,
    set: parsed.data,
  }).run();

  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}
