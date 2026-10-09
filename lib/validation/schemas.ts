import { z } from "zod";

import {
  INVOICE_STATUSES,
  ORDER_STATUSES,
  PROFORMA_STATUSES,
  QUOTE_STATUSES,
} from "@/lib/db/schema";
import { CURRENCY_CODES } from "@/lib/utils/currency";

/** Shared result shape returned by every Server Action to useActionState. */
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export const initialFormState: FormState = { ok: false };

const optionalText = z.string().trim().max(2000).optional().default("");

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  company: optionalText,
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email",
    })
    .optional()
    .default(""),
  phone: optionalText,
  fax: optionalText,
  billingAddress: optionalText,
  postalCode: z.string().trim().max(40).optional().default(""),
  country: z.string().trim().max(100).optional().default(""),
  notes: optionalText,
});

export type ClientInput = z.infer<typeof clientSchema>;

const lineItemSchema = z.object({
  description: z.string().trim().max(500).default(""),
  detail: z.string().trim().max(1000).default(""),
  standard: z.string().trim().max(120).default(""),
  unit: z.string().trim().max(40).default("No."),
  quantity: z.coerce.number().min(0, "Qty ≥ 0").max(1_000_000).default(1),
  unitPrice: z.coerce.number().min(0, "Price ≥ 0").max(100_000_000).default(0),
});

/** Shared base for quotes & invoices (line items + money fields). */
const documentBase = {
  clientId: z.coerce.number().int().positive("Select a client"),
  issueDate: z.string().trim().min(1, "Issue date is required"),
  currency: z.enum(CURRENCY_CODES).default("USD"),
  discount: z.coerce.number().min(0).max(100_000_000).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: optionalText,
  terms: optionalText,
  items: z
    .array(lineItemSchema)
    .min(1, "Add at least one line item")
    .refine((items) => items.some((i) => i.description.trim() !== ""), {
      message: "At least one item needs a description",
    }),
};

/** Project / subject reference fields shared by quotes, orders & pro-formas. */
const salesDocFields = {
  subject: z.string().trim().max(300).optional().default(""),
  projectName: z.string().trim().max(300).optional().default(""),
  enquiryRef: z.string().trim().max(120).optional().default(""),
  attention: z.string().trim().max(200).optional().default(""),
};

export const quoteSchema = z.object({
  ...documentBase,
  ...salesDocFields,
  validUntil: z.string().trim().default(""),
  status: z.enum(QUOTE_STATUSES).default("draft"),
});

export const orderSchema = z.object({
  ...documentBase,
  ...salesDocFields,
  deliveryTime: z.string().trim().max(300).optional().default(""),
  status: z.enum(ORDER_STATUSES).default("draft"),
});

export const proformaSchema = z.object({
  ...documentBase,
  ...salesDocFields,
  validUntil: z.string().trim().default(""),
  status: z.enum(PROFORMA_STATUSES).default("draft"),
});

export const invoiceSchema = z.object({
  ...documentBase,
  dueDate: z.string().trim().default(""),
  status: z.enum(INVOICE_STATUSES).default("draft"),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type ProformaInput = z.infer<typeof proformaSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  tagline: optionalText,
  email: optionalText,
  phone: optionalText,
  address: optionalText,
  website: optionalText,
  gstin: z.string().trim().max(40).optional().default(""),
  currencySymbol: z.string().trim().min(1, "Required").max(8),
  currencyCode: z.string().trim().max(8).default("USD"),
  exchangeRates: z.string().default("{}"),
  defaultTaxRate: z.coerce.number().min(0).max(100).default(0),
  taxLabel: z.string().trim().min(1, "Required").max(20),
  quotePrefix: z.string().trim().min(1, "Required").max(16),
  orderPrefix: z.string().trim().min(1, "Required").max(16),
  proformaPrefix: z.string().trim().min(1, "Required").max(16),
  invoicePrefix: z.string().trim().min(1, "Required").max(16),
  receiptPrefix: z.string().trim().min(1, "Required").max(16),
  quoteValidityDays: z.coerce.number().int().min(0).max(3650).default(30),
  paymentTermsDays: z.coerce.number().int().min(0).max(3650).default(14),
  paymentTerms: optionalText,
  bankDetails: optionalText,
  footerNote: optionalText,
  signatoryName: optionalText,
  termsScope: optionalText,
  termsPrices: optionalText,
  termsDelivery: optionalText,
  termsWarranty: optionalText,
  termsCompliance: optionalText,
  termsPacking: optionalText,
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const paymentSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paidOn: z.string().trim().min(1, "Date is required"),
  method: optionalText,
  note: optionalText,
});

/** Map a ZodError into a flat { field: message } record for the form UI. */
export function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
