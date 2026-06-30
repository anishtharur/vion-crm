/**
 * Single source of truth for all quote / invoice money math.
 * Used by forms (live preview), Server Actions (persisted values),
 * the document view, and the dashboard so numbers never diverge.
 */

export type LineInput = {
  quantity: number;
  unitPrice: number;
};

export type TotalsInput = {
  items: LineInput[];
  /** Flat discount amount in currency units (applied to subtotal). */
  discount?: number;
  /** Tax / GST percentage, e.g. 18 for 18%. */
  taxRate?: number;
};

export type Totals = {
  lineTotals: number[];
  subtotal: number;
  discount: number;
  taxableBase: number;
  taxAmount: number;
  total: number;
};

/** Round to 2 decimal places, avoiding binary float drift (e.g. 1.005). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return round2((Number(quantity) || 0) * (Number(unitPrice) || 0));
}

export function computeTotals({
  items,
  discount = 0,
  taxRate = 0,
}: TotalsInput): Totals {
  const lineTotals = items.map((i) => lineTotal(i.quantity, i.unitPrice));
  const subtotal = round2(lineTotals.reduce((sum, n) => sum + n, 0));

  const safeDiscount = round2(Math.min(Math.max(Number(discount) || 0, 0), subtotal));
  const taxableBase = round2(subtotal - safeDiscount);
  const taxAmount = round2(taxableBase * ((Number(taxRate) || 0) / 100));
  const total = round2(taxableBase + taxAmount);

  return {
    lineTotals,
    subtotal,
    discount: safeDiscount,
    taxableBase,
    taxAmount,
    total,
  };
}
