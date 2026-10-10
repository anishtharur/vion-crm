import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * All money is stored in the smallest currency unit is NOT used here — instead we
 * store decimal amounts as REAL (dollars). Math is centralized in lib/utils/money.ts
 * and rounded to 2dp on the way in, which is sufficient for a single-user CRM.
 */

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
};

/** Single-row company / app configuration. Always row id = 1. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull().default("Vion Labs"),
  /** Strapline under the wordmark, e.g. "Industrial Automation · Fire & Controls". */
  tagline: text("tagline")
    .notNull()
    .default("Industrial Automation · Fire & Controls"),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  website: text("website").notNull().default(""),
  /** Tax registration shown in the document header (GSTIN / VAT no.). */
  gstin: text("gstin").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  currencySymbol: text("currency_symbol").notNull().default("$"),
  /** Base / home currency. Document amounts are converted into this for reporting. */
  currencyCode: text("currency_code").notNull().default("USD"),
  /** JSON map { [code]: unitsOfBasePerOneUnit }, e.g. {"USD":83} when base is INR. */
  exchangeRates: text("exchange_rates").notNull().default("{}"),
  /** Default GST / tax percentage, e.g. 5 for 5%. */
  defaultTaxRate: real("default_tax_rate").notNull().default(5),
  taxLabel: text("tax_label").notNull().default("GST"),
  // Existing prefixes keep their original DB defaults to avoid a table-recreate on
  // push; the Vion Labs "*-VL" values are seeded in getSettings() and on the live row.
  quotePrefix: text("quote_prefix").notNull().default("Q"),
  orderPrefix: text("order_prefix").notNull().default("SOA-VL"),
  proformaPrefix: text("proforma_prefix").notNull().default("PI-VL"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  receiptPrefix: text("receipt_prefix").notNull().default("PR-VL"),
  /** Default validity window (days) for new quotes. */
  quoteValidityDays: integer("quote_validity_days").notNull().default(30),
  /** Default payment window (days) for new invoices. */
  paymentTermsDays: integer("payment_terms_days").notNull().default(14),
  paymentTerms: text("payment_terms").notNull().default(""),
  bankDetails: text("bank_details").notNull().default(""),
  footerNote: text("footer_note")
    .notNull()
    .default("Thank you for your business."),
  /** Name printed under the "For <company>" signature line on quotes. */
  signatoryName: text("signatory_name").notNull().default(""),
  // --- Quotation commercial-terms boilerplate (the grid at the foot of a quote) ---
  termsScope: text("terms_scope")
    .notNull()
    .default(
      "Supply of equipment only. Installation, testing & commissioning excluded unless quoted separately.",
    ),
  termsPrices: text("terms_prices")
    .notNull()
    .default(
      "Ex-Works (Incoterms 2020). Freight, insurance, duties & taxes extra.",
    ),
  termsDelivery: text("terms_delivery")
    .notNull()
    .default("To be confirmed on receipt of confirmed PO & advance payment."),
  termsWarranty: text("terms_warranty")
    .notNull()
    .default("12 months from delivery against manufacturing defects."),
  termsCompliance: text("terms_compliance")
    .notNull()
    .default("All listed equipment supplied to applicable system standards."),
  termsPacking: text("terms_packing")
    .notNull()
    .default("Standard export sea-worthy packing included."),
});

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  fax: text("fax").notNull().default(""),
  billingAddress: text("billing_address").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  country: text("country").notNull().default(""),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("draft").$type<QuoteStatus>(),
  issueDate: text("issue_date").notNull(),
  validUntil: text("valid_until").notNull().default(""),
  /** Bold heading of the "Project / Subject" box, e.g. "Supply of FM-200 System". */
  subject: text("subject").notNull().default(""),
  /** Project / site name. */
  projectName: text("project_name").notNull().default(""),
  /** Client's enquiry reference number. */
  enquiryRef: text("enquiry_ref").notNull().default(""),
  /** Contact person at the client ("Attn:" line). */
  attention: text("attention").notNull().default(""),
  notes: text("notes").notNull().default(""),
  terms: text("terms").notNull().default(""),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(5),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  ...timestamps,
});

export const quoteItems = sqliteTable("quote_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  description: text("description").notNull().default(""),
  /** Optional spec / sub-description shown in muted text below the description. */
  detail: text("detail").notNull().default(""),
  /** Compliance standard, e.g. "UL Listed". */
  standard: text("standard").notNull().default(""),
  /** Unit of measure, e.g. "No.", "set", "m". */
  unit: text("unit").notNull().default("No."),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

// --- Order Acknowledgements (Sales Order) -------------------------------------

export const ORDER_STATUSES = [
  "draft",
  "confirmed",
  "in_production",
  "fulfilled",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  /** Source quote this order acknowledges, if converted from one. */
  quoteId: integer("quote_id").references(() => quotes.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("draft").$type<OrderStatus>(),
  issueDate: text("issue_date").notNull(),
  /** Promised delivery lead time, e.g. "6 weeks from confirmed PO". */
  deliveryTime: text("delivery_time").notNull().default(""),
  subject: text("subject").notNull().default(""),
  projectName: text("project_name").notNull().default(""),
  enquiryRef: text("enquiry_ref").notNull().default(""),
  attention: text("attention").notNull().default(""),
  notes: text("notes").notNull().default(""),
  /** Payment terms agreed for the order. */
  terms: text("terms").notNull().default(""),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(5),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  ...timestamps,
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  description: text("description").notNull().default(""),
  detail: text("detail").notNull().default(""),
  standard: text("standard").notNull().default(""),
  unit: text("unit").notNull().default("No."),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

// --- Pro-forma Invoices -------------------------------------------------------

export const PROFORMA_STATUSES = [
  "draft",
  "sent",
  "paid",
  "cancelled",
] as const;
export type ProformaStatus = (typeof PROFORMA_STATUSES)[number];

export const proformas = sqliteTable("proformas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  quoteId: integer("quote_id").references(() => quotes.id, {
    onDelete: "set null",
  }),
  orderId: integer("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("draft").$type<ProformaStatus>(),
  issueDate: text("issue_date").notNull(),
  validUntil: text("valid_until").notNull().default(""),
  subject: text("subject").notNull().default(""),
  projectName: text("project_name").notNull().default(""),
  enquiryRef: text("enquiry_ref").notNull().default(""),
  attention: text("attention").notNull().default(""),
  notes: text("notes").notNull().default(""),
  terms: text("terms").notNull().default(""),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(5),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  ...timestamps,
});

export const proformaItems = sqliteTable("proforma_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  proformaId: integer("proforma_id")
    .notNull()
    .references(() => proformas.id, { onDelete: "cascade" }),
  description: text("description").notNull().default(""),
  detail: text("detail").notNull().default(""),
  standard: text("standard").notNull().default(""),
  unit: text("unit").notNull().default("No."),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "partial",
  "paid",
  "overdue",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  /** Source documents this invoice was generated from, if any. */
  quoteId: integer("quote_id").references(() => quotes.id, {
    onDelete: "set null",
  }),
  orderId: integer("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  proformaId: integer("proforma_id").references(() => proformas.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("draft").$type<InvoiceStatus>(),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull().default(""),
  notes: text("notes").notNull().default(""),
  terms: text("terms").notNull().default(""),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(5),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  amountPaid: real("amount_paid").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  ...timestamps,
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull().default(""),
  detail: text("detail").notNull().default(""),
  standard: text("standard").notNull().default(""),
  unit: text("unit").notNull().default("No."),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  /** Payment-receipt number, e.g. "PR-VL-2026-099". */
  number: text("number").notNull().default(""),
  /** Free-text "received against" reference (source quote / PI / invoice numbers). */
  reference: text("reference").notNull().default(""),
  amount: real("amount").notNull().default(0),
  paidOn: text("paid_on").notNull(),
  method: text("method").notNull().default(""),
  note: text("note").notNull().default(""),
  ...timestamps,
});

// Inferred row types for use across the app.
export type Settings = typeof settings.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Proforma = typeof proformas.$inferSelect;
export type ProformaItem = typeof proformaItems.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
