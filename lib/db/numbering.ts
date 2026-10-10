import "server-only";

import { sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { db } from "./index";
import { invoices, orders, payments, proformas, quotes } from "./schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Sequences start here so the first document of a year is "<prefix>-<year>-099". */
const SEQ_START = 99;

/**
 * Generate the next document number for the current year, e.g. "QID-VL-2026-099".
 * Sequence resets per calendar year and per prefix, starting at 99, and reads the
 * current max so gaps from deletions don't cause collisions.
 *
 * The format is always `<prefix>-<YYYY>-<NNN>`; the numeric tail begins at
 * `length(prefix) + 7` (prefix + "-" + 4-digit year + "-").
 */
async function nextNumber(
  table: SQLiteTable,
  numberCol: SQLiteColumn,
  prefix: string,
  executor: typeof db | Tx = db,
): Promise<string> {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const row = await executor
    .select({
      max: sql<number>`COALESCE(MAX(CAST(substr(${numberCol}, length(${prefix}) + 7) AS INTEGER)), 0)`,
    })
    .from(table)
    .where(sql`${numberCol} LIKE ${like}`)
    .get();
  const next = Math.max((row?.max ?? 0) + 1, SEQ_START);
  return `${prefix}-${year}-${String(next).padStart(3, "0")}`;
}

export function nextQuoteNumber(
  prefix: string,
  executor: typeof db | Tx = db,
): Promise<string> {
  return nextNumber(quotes, quotes.number, prefix, executor);
}

export function nextOrderNumber(
  prefix: string,
  executor: typeof db | Tx = db,
): Promise<string> {
  return nextNumber(orders, orders.number, prefix, executor);
}

export function nextProformaNumber(
  prefix: string,
  executor: typeof db | Tx = db,
): Promise<string> {
  return nextNumber(proformas, proformas.number, prefix, executor);
}

export function nextInvoiceNumber(
  prefix: string,
  executor: typeof db | Tx = db,
): Promise<string> {
  return nextNumber(invoices, invoices.number, prefix, executor);
}

export function nextReceiptNumber(
  prefix: string,
  executor: typeof db | Tx = db,
): Promise<string> {
  return nextNumber(payments, payments.number, prefix, executor);
}
