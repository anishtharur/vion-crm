/** Presentation helpers — pure, safe to use on server and client. */

export function formatMoney(amount: number, symbol = "$"): string {
  const n = Number(amount) || 0;
  const formatted = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function formatNumber(n: number): string {
  return (Number(n) || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

/** Render an ISO date (or yyyy-mm-dd) as "Jun 10, 2026". Empty-safe. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Today as yyyy-mm-dd (local), suitable for <input type="date"> defaults. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add `days` to a yyyy-mm-dd string, returning yyyy-mm-dd. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];
const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

/** Words for an integer below 1000, e.g. 565 → "Five Hundred Sixty-Five". */
function under1000ToWords(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    const tens = TENS[Math.floor(n / 10)];
    const ones = n % 10;
    parts.push(ones ? `${tens}-${ONES[ones]}` : tens);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** Words for a non-negative integer, e.g. 82565 → "Eighty-Two Thousand Five Hundred Sixty-Five". */
export function integerToWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "Zero";
  const groups: string[] = [];
  let scale = 0;
  while (n > 0 && scale < SCALES.length) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const suffix = SCALES[scale] ? ` ${SCALES[scale]}` : "";
      groups.unshift(`${under1000ToWords(chunk)}${suffix}`);
    }
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return groups.join(" ");
}

/** Spoken currency names for the "amount in words" line. */
const CURRENCY_WORDS: Record<string, [string, string]> = {
  USD: ["US Dollars", "Cents"],
  INR: ["Indian Rupees", "Paise"],
  EUR: ["Euros", "Cents"],
  GBP: ["Pounds", "Pence"],
  AED: ["UAE Dirhams", "Fils"],
  ZAR: ["South African Rand", "Cents"],
};

/**
 * Render a money amount as words for a quotation, e.g.
 * amountInWords(82565, "USD") → "US Dollars Eighty-Two Thousand Five Hundred Sixty-Five Only".
 */
export function amountInWords(amount: number, currencyCode = "USD"): string {
  const safe = Number(amount) || 0;
  const sign = safe < 0 ? "Minus " : "";
  const abs = Math.abs(safe);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const [main, sub] = CURRENCY_WORDS[currencyCode.toUpperCase()] ?? [
    currencyCode.toUpperCase(),
    "Cents",
  ];
  let words = `${main} ${integerToWords(whole)}`;
  if (cents > 0) words += ` and ${integerToWords(cents)} ${sub}`;
  return `${sign}${words} Only`;
}
