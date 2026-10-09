/**
 * Supported currencies + exchange-rate helpers. Pure module — safe to import
 * on the client (used by the document form) and the server.
 *
 * Each document (quote / order / pro-forma / invoice) stores its own currency
 * code. The company's *base* currency lives in settings.currencyCode; the
 * exchange rates in settings.exchangeRates let the dashboard convert every
 * document into that base so aggregate totals aren't a mix of currencies.
 */

export const CURRENCY_CODES = ["USD", "INR", "AED", "EUR", "GBP", "SAR"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export type CurrencyMeta = { code: CurrencyCode; symbol: string; label: string };

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$", label: "US Dollar (USD)" },
  INR: { code: "INR", symbol: "₹", label: "Indian Rupee (INR)" },
  AED: { code: "AED", symbol: "AED ", label: "UAE Dirham (AED)" },
  EUR: { code: "EUR", symbol: "€", label: "Euro (EUR)" },
  GBP: { code: "GBP", symbol: "£", label: "British Pound (GBP)" },
  SAR: { code: "SAR", symbol: "SAR ", label: "Saudi Riyal (SAR)" },
};

/** Ordered list for <select> options. */
export const CURRENCY_OPTIONS: CurrencyMeta[] = CURRENCY_CODES.map((c) => CURRENCIES[c]);

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCY_CODES as readonly string[]).includes(value);
}

/** Symbol for a code, falling back to the code itself for anything unknown. */
export function currencySymbol(code: string | null | undefined): string {
  return isCurrencyCode(code) ? CURRENCIES[code].symbol : `${code ?? ""} `;
}

export function currencyLabel(code: string | null | undefined): string {
  return isCurrencyCode(code) ? CURRENCIES[code].label : String(code ?? "");
}

/**
 * Exchange rates are stored as JSON: { [code]: unitsOfBasePerOneUnit }.
 * e.g. base INR, { "USD": 83, "AED": 22.6 } means 1 USD = 83 INR.
 */
export function parseRates(json: string | null | undefined): Record<string, number> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [code, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) out[code] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/** Convert an amount in `code` into the base currency using stored rates. */
export function convertToBase(
  amount: number,
  code: string | null | undefined,
  baseCode: string,
  rates: Record<string, number>,
): number {
  const a = Number(amount) || 0;
  if (!code || code === baseCode) return a;
  const rate = rates[code];
  return Number.isFinite(rate) && rate > 0 ? a * rate : a;
}
