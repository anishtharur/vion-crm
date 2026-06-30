import "server-only";

/** Parse the hidden itemsJson payload from the document form into raw rows. */
export function readItemsJson(formData: FormData): unknown[] {
  const raw = formData.get("itemsJson");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type PrunedItem = {
  description: string;
  detail: string;
  standard: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

/** The shared line-item columns copied verbatim when converting between documents. */
export type ConvertibleItem = {
  description: string;
  detail: string;
  standard: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
};

/** Pick just the copyable line-item columns from a stored item row. */
export function itemCopy(it: ConvertibleItem): ConvertibleItem {
  return {
    description: it.description,
    detail: it.detail,
    standard: it.standard,
    unit: it.unit,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal,
    sortOrder: it.sortOrder,
  };
}

/** Drop fully-blank rows so a stray empty line doesn't block submission. */
export function pruneItems(
  items: {
    description?: string;
    detail?: string;
    standard?: string;
    unit?: string;
    quantity?: unknown;
    unitPrice?: unknown;
  }[],
): PrunedItem[] {
  return items
    .map((i) => ({
      description: String(i.description ?? "").trim(),
      detail: String(i.detail ?? "").trim(),
      standard: String(i.standard ?? "").trim(),
      unit: String(i.unit ?? "").trim(),
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
    }))
    .filter((i) => i.description !== "" || i.unitPrice !== 0 || i.quantity !== 0);
}
