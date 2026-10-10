import type { Client, Settings } from "@/lib/db/schema";
import { amountInWords, formatDate, formatMoney } from "@/lib/utils/format";
import { currencySymbol } from "@/lib/utils/currency";

/**
 * Generic printable document in the Vion Labs green template. All brand colours
 * come from the `--q-*` tokens in globals.css (sourced from the vion-ai palette).
 * Renders quotations, order acknowledgements, pro-formas and invoices.
 */
export type PaperDocType = "quote" | "order" | "proforma" | "invoice";

export type PaperItem = {
  id?: number;
  description: string;
  detail: string;
  standard: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PaperData = {
  docType: PaperDocType;
  number: string;
  status: string;
  issueDate: string;
  secondaryLabel?: string;
  secondaryDate?: string;
  subject?: string;
  projectName?: string;
  enquiryRef?: string;
  attention?: string;
  deliveryTime?: string;
  /** "Converted from" reference, e.g. "QID-VL-2026-099". */
  sourceRef?: string;
  notes?: string;
  terms?: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid?: number;
  /** ISO currency code for this document, e.g. "USD". */
  currency: string;
};

const TITLES: Record<PaperDocType, string> = {
  quote: "Quotation",
  order: "Order Acknowledgement",
  proforma: "Pro-forma Invoice",
  invoice: "Invoice",
};

function normalizeAddressLine(value: string) {
  return value.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

export function DocumentPaper({
  settings,
  client,
  data,
  items,
}: {
  settings: Settings;
  client: Client;
  data: PaperData;
  items: PaperItem[];
}) {
  const code = data.currency;
  const sym = currencySymbol(code);
  const isInvoice = data.docType === "invoice";
  const balance = (data.total ?? 0) - (data.amountPaid ?? 0);
  const billingAddressLines = client.billingAddress.split(/\r?\n/);
  if (
    client.company &&
    normalizeAddressLine(billingAddressLines[0]) ===
      normalizeAddressLine(client.company)
  ) {
    billingAddressLines.shift();
  }
  const billingAddress = billingAddressLines.join("\n").trim();

  const terms = buildTerms(data, settings);

  return (
    <div className="doc-paper mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-white text-foreground shadow-[var(--shadow-card)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      {/* Letterhead */}
      <div className="flex flex-wrap items-start justify-between gap-6 px-8 pt-6 sm:px-10">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.logoUrl || "/assets/vion-logo-gradient.svg"}
            alt={`${settings.companyName} logo`}
            className="h-11 w-auto"
          />
          <div>
            <p className="font-display text-xl font-bold uppercase tracking-tight text-q-green">
              {settings.companyName}
            </p>
            {settings.tagline ? (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-q-green-mid">
                {settings.tagline}
              </p>
            ) : null}
          </div>
        </div>

        <div className="text-right text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">
            {settings.companyName}
          </p>
          {settings.address ? (
            <p className="whitespace-pre-line">{settings.address}</p>
          ) : null}
          {settings.phone ? <p>Tel: {settings.phone}</p> : null}
          {settings.email ? <p>Email: {settings.email}</p> : null}
          {settings.gstin ? <p>GSTIN: {settings.gstin}</p> : null}
        </div>
      </div>

      {/* Title band */}
      <div className="print-exact mt-4 flex items-center justify-between gap-4 bg-q-green px-8 py-3 text-white sm:px-10">
        <h1 className="font-display text-xl font-semibold uppercase tracking-[0.12em]">
          {TITLES[data.docType]}
        </h1>
        <div className="text-right text-xs leading-relaxed text-q-muted">
          <p>Ref: {data.number}</p>
          <p>Date: {formatDate(data.issueDate)}</p>
          {data.sourceRef ? <p>From: {data.sourceRef}</p> : null}
        </div>
      </div>

      <div className="px-8 sm:px-10">
        {/* Bill-to + project boxes */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoBox label={isInvoice ? "Invoice to" : "Quotation to"}>
            <p className="font-semibold text-foreground">{client.name}</p>
            {client.company ? <p>{client.company}</p> : null}
            {billingAddress ? (
              <p className="whitespace-pre-line">{billingAddress}</p>
            ) : null}
            {client.postalCode || client.country ? (
              <p>
                {[client.postalCode, client.country].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {client.fax ? <p>Fax: {client.fax}</p> : null}
            {data.attention ? <p>Attn: {data.attention}</p> : null}
            {client.email ? <p>{client.email}</p> : null}
          </InfoBox>

          <InfoBox label={isInvoice ? "Details" : "Project / Subject"}>
            {data.subject ? (
              <p className="font-semibold text-foreground">{data.subject}</p>
            ) : null}
            {data.projectName ? <p>Project: {data.projectName}</p> : null}
            {data.enquiryRef ? <p>Enquiry Ref: {data.enquiryRef}</p> : null}
            {data.secondaryDate ? (
              <p>
                {data.secondaryLabel}: {formatDate(data.secondaryDate)}
              </p>
            ) : null}
            {data.deliveryTime ? <p>Delivery: {data.deliveryTime}</p> : null}
            <p>
              Currency: {code} ({sym.trim()})
            </p>
          </InfoBox>
        </div>

        {/* Line items */}
        <table className="mt-5 w-full border-collapse text-[12px]">
          <thead>
            <tr className="print-exact bg-q-green text-left text-[11px] font-semibold uppercase tracking-wide text-white">
              <th className="rounded-l-md py-2 pl-3 pr-2">Item</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Standard</th>
              <th className="px-2 py-2 text-center">Unit</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Unit price</th>
              <th className="rounded-r-md py-2 pl-2 pr-3 text-right">
                Total price
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={item.id ?? i}
                className="border-b border-border/70 align-top"
              >
                <td className="py-1.5 pl-3 pr-2 tabular-nums text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-2 py-1.5">
                  <p className="font-semibold leading-snug text-foreground">
                    {item.description || "—"}
                  </p>
                  {item.detail ? (
                    <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-muted-foreground">
                      {item.detail}
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-1.5">
                  {item.standard ? (
                    <span className="print-exact inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium text-q-green-mid bg-q-ice">
                      {item.standard}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-1.5 text-center text-muted-foreground">
                  {item.unit}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatMoney(item.unitPrice, sym)}
                </td>
                <td className="py-1.5 pl-2 pr-3 text-right font-medium tabular-nums">
                  {formatMoney(item.lineTotal, sym)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex flex-col items-end gap-3">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <TotalRow
              label="Subtotal"
              value={formatMoney(data.subtotal, sym)}
            />
            {data.discount > 0 ? (
              <TotalRow
                label="Discount"
                value={`-${formatMoney(data.discount, sym)}`}
              />
            ) : null}
            {data.taxAmount > 0 ? (
              <TotalRow
                label={`${settings.taxLabel} (${data.taxRate || 0}%)`}
                value={formatMoney(data.taxAmount, sym)}
              />
            ) : null}
          </div>

          <div className="print-exact flex w-full max-w-sm items-center justify-between rounded-lg bg-q-green px-4 py-3 text-white">
            <span className="font-display text-sm font-semibold uppercase tracking-wide">
              Total
            </span>
            <span className="font-display text-xl font-semibold tabular-nums text-q-mint-bright">
              {code} {formatMoney(data.total, sym).replace(sym, "")}
            </span>
          </div>

          {isInvoice && (data.amountPaid ?? 0) > 0 ? (
            <div className="w-full max-w-sm space-y-2 text-sm">
              <TotalRow
                label="Amount paid"
                value={`-${formatMoney(data.amountPaid ?? 0, sym)}`}
              />
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Balance due</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(balance, sym)}
                </span>
              </div>
            </div>
          ) : null}

          <p className="w-full max-w-sm text-right text-xs text-muted-foreground">
            Amount in words:{" "}
            <span className="font-medium text-foreground">
              {amountInWords(data.total, code)}
            </span>
          </p>
        </div>

        {/* Notes */}
        {data.notes ? (
          <div className="mt-5 border-t border-border pt-4 text-sm">
            <SectionLabel>Notes</SectionLabel>
            <p className="mt-1 whitespace-pre-line text-foreground">
              {data.notes}
            </p>
          </div>
        ) : null}

        {/* Invoice: payment details */}
        {isInvoice && settings.bankDetails ? (
          <div className="mt-4 border-t border-border pt-4 text-sm">
            <SectionLabel>Payment details</SectionLabel>
            <p className="mt-1 whitespace-pre-line text-foreground">
              {settings.bankDetails}
            </p>
          </div>
        ) : null}

        {/* Commercial terms — forced onto its own page in print. */}
        {terms.length > 0 ? (
          <div className="mt-5 border-t border-border pt-4 break-before-page print:mt-0 print:border-t-0 print:pt-0">
            <h2 className="font-display text-sm font-semibold text-q-green">
              {isInvoice ? "Terms" : "Commercial Terms & Conditions"}
            </h2>
            <dl className="mt-2 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {terms.map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-24 shrink-0 font-semibold text-foreground">
                    {label}
                  </dt>
                  <dd className="text-muted-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {/* Signatures */}
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <SignatureBlock
            title={`For ${settings.companyName}`}
            signature={settings.signatoryName}
            caption={
              settings.signatoryName
                ? "Authorised Signatory · Digital Signature"
                : "Authorised Signatory · Name & Stamp"
            }
          />
          <SignatureBlock
            title={
              isInvoice
                ? "Received with thanks"
                : `Accepted by — ${client.company || client.name}`
            }
            caption="Name, Signature & Date"
          />
        </div>

        {/* Footer */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border py-4 text-[11px] text-muted-foreground">
          <span>
            {settings.footerNote || `Thank you — ${settings.companyName}`}
            {data.number ? ` · ${data.number}` : ""}
          </span>
          <span>
            This {TITLES[data.docType].toLowerCase()} is computer-generated and
            valid with authorised signature &amp; stamp.
          </span>
        </div>
      </div>
    </div>
  );
}

/** Commercial-terms grid contents, varying by document type. */
function buildTerms(data: PaperData, settings: Settings): [string, string][] {
  if (data.docType === "invoice") {
    return data.terms?.trim() ? [["Payment", data.terms]] : [];
  }

  const validity = data.secondaryDate
    ? `${data.secondaryLabel ?? "Valid until"} ${formatDate(data.secondaryDate)}`
    : `${settings.quoteValidityDays} days from date of this document.`;
  const payment = data.terms || settings.paymentTerms;

  const rows: [string, string][] =
    data.docType === "order"
      ? [
          ["Delivery", data.deliveryTime || settings.termsDelivery],
          ["Payment", payment],
          ["Scope", settings.termsScope],
          ["Warranty", settings.termsWarranty],
          ["Compliance", settings.termsCompliance],
          ["Packing", settings.termsPacking],
        ]
      : [
          ["Scope", settings.termsScope],
          ["Prices", settings.termsPrices],
          ["Validity", validity],
          ["Delivery", settings.termsDelivery],
          ["Warranty", settings.termsWarranty],
          ["Compliance", settings.termsCompliance],
          ["Payment", payment],
          ["Packing", settings.termsPacking],
        ];

  return rows.filter(([, value]) => value.trim() !== "");
}

function InfoBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-q-green-mid">
        {label}
      </p>
      <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-q-green-mid">
      {children}
    </p>
  );
}

function SignatureBlock({
  title,
  caption,
  signature,
}: {
  title: string;
  caption: string;
  signature?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-2 flex h-10 items-end">
        {signature ? (
          <p
            className="-rotate-2 font-serif text-2xl italic leading-none text-q-green-mid"
            style={{ fontFamily: "cursive" }}
          >
            {signature}
          </p>
        ) : null}
      </div>
      <div className="border-t border-foreground/40" />
      <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
