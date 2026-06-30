import type { Invoice, InvoiceStatus } from "@/lib/db/schema";

/** Statuses a user can set directly in the editor (partial/paid come from payments). */
export const INVOICE_EDITABLE_STATUSES = ["draft", "sent", "partial", "paid"] as const;

/**
 * Display status, deriving "overdue" from the due date and outstanding balance.
 * Priority: paid > overdue > partial > stored status.
 */
export function displayInvoiceStatus(
  invoice: Pick<Invoice, "status" | "total" | "amountPaid" | "dueDate">,
  today: string,
): InvoiceStatus {
  const balance = (invoice.total ?? 0) - (invoice.amountPaid ?? 0);
  if (balance <= 0.005 && invoice.total > 0) return "paid";
  if (
    balance > 0 &&
    invoice.dueDate &&
    invoice.dueDate < today &&
    invoice.status !== "draft"
  ) {
    return "overdue";
  }
  if ((invoice.amountPaid ?? 0) > 0) return "partial";
  return invoice.status;
}

/** Status implied purely by how much has been paid (used after recording a payment). */
export function statusFromPayment(
  amountPaid: number,
  total: number,
  previous: InvoiceStatus,
): InvoiceStatus {
  if (total > 0 && amountPaid >= total - 0.005) return "paid";
  if (amountPaid > 0) return "partial";
  // No payments left — fall back to a sensible non-paid state.
  return previous === "paid" || previous === "partial" ? "sent" : previous;
}
