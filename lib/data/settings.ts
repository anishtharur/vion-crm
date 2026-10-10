import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { settings, type Settings } from "@/lib/db/schema";

/**
 * Returns the single settings row, creating it with defaults on first access.
 * This replaces a separate seed script — the app self-initializes.
 */
export async function getSettings(): Promise<Settings> {
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .get();
  if (existing) return existing;

  // Seed the single settings row with the Vion Labs document-numbering prefixes.
  await db
    .insert(settings)
    .values({
      id: 1,
      quotePrefix: "QID-VL",
      orderPrefix: "SOA-VL",
      proformaPrefix: "PI-VL",
      invoicePrefix: "IN-VL",
      receiptPrefix: "PR-VL",
    })
    .onConflictDoNothing()
    .run();
  // Re-read so callers always get a fully-defaulted row.
  return (await db.select().from(settings).where(eq(settings.id, 1)).get())!;
}
