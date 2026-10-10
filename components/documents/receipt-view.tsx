import type { Client, Invoice, Payment, Settings } from "@/lib/db/schema";
import { amountInWords, formatDate, formatMoney } from "@/lib/utils/format";
import { currencySymbol } from "@/lib/utils/currency";

/** Printable Payment Receipt in the Vion Labs green template. */
export function ReceiptView({
  settings,
  client,
  payment,
  invoice,
  balance,
}: {
  settings: Settings;
  client: Client;
  payment: Payment;
  invoice: Invoice;
  balance: number;
}) {
  const code = invoice.currency;
  const sym = currencySymbol(code);
  const terms = (
    [
      ["Scope", invoice.termsScope ?? settings.termsScope],
      ["Prices", invoice.termsPrices ?? settings.termsPrices],
      ["Delivery", invoice.termsDelivery ?? settings.termsDelivery],
      ["Warranty", invoice.termsWarranty ?? settings.termsWarranty],
      ["Compliance", invoice.termsCompliance ?? settings.termsCompliance],
      ["Payment", invoice.terms || settings.paymentTerms],
      ["Packing", invoice.termsPacking ?? settings.termsPacking],
    ] as [string, string][]
  ).filter(([, value]) => value.trim() !== "");

  return (
    <div className="doc-paper mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-white text-foreground shadow-[var(--shadow-card)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      {/* Letterhead */}
      <div className="flex flex-wrap items-start justify-between gap-6 px-8 pt-8 sm:px-10">
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
          {settings.email ? <p>Email: {settings.email}</p> : null}
          {settings.gstin ? <p>GSTIN: {settings.gstin}</p> : null}
        </div>
      </div>

      {/* Title band */}
      <div className="print-exact mt-6 flex items-center justify-between gap-4 bg-q-green px-8 py-4 text-white sm:px-10">
        <h1 className="font-display text-2xl font-semibold uppercase tracking-[0.12em]">
          Payment Receipt
        </h1>
        <div className="text-right text-xs leading-relaxed text-q-muted">
          <p>Ref: {payment.number || `#${payment.id}`}</p>
          <p>Date: {formatDate(payment.paidOn)}</p>
        </div>
      </div>

      <div className="px-8 sm:px-10">
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-q-green-mid">
              Received from
            </p>
            <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{client.name}</p>
              {client.company ? <p>{client.company}</p> : null}
              {client.email ? <p>{client.email}</p> : null}
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-q-green-mid">
              Received against
            </p>
            <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {payment.reference || invoice.number}
              </p>
              {payment.method ? <p>Method: {payment.method}</p> : null}
              {payment.note ? <p>{payment.note}</p> : null}
            </div>
          </div>
        </div>

        {/* Amount band */}
        <div className="print-exact mt-8 flex items-center justify-between rounded-lg bg-q-green px-5 py-4 text-white">
          <span className="font-display text-sm font-semibold uppercase tracking-wide">
            Amount received
          </span>
          <span className="font-display text-2xl font-semibold tabular-nums text-q-mint-bright">
            {code} {formatMoney(payment.amount, sym).replace(sym, "")}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Amount in words:{" "}
          <span className="font-medium text-foreground">
            {amountInWords(payment.amount, code)}
          </span>
        </p>

        {/* Invoice running balance */}
        <dl className="mt-8 space-y-2 border-t border-border pt-6 text-sm">
          <Row
            label={`Invoice ${invoice.number} total`}
            value={formatMoney(invoice.total, sym)}
          />
          <Row
            label="Paid to date"
            value={formatMoney(invoice.amountPaid ?? 0, sym)}
          />
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="font-semibold">Balance due</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(balance, sym)}
            </span>
          </div>
        </dl>

        {terms.length > 0 ? (
          <div className="mt-8 border-t border-border pt-5">
            <h2 className="font-display text-sm font-semibold text-q-green">
              Commercial Terms &amp; Conditions
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

        {/* Sign-off */}
        <div className="mt-10 flex justify-end">
          <div className="w-56">
            <p className="text-sm font-semibold text-foreground">
              For {settings.companyName}
            </p>
            <div className="mt-2 flex h-10 items-end">
              {settings.signatoryName ? (
                <p
                  className="-rotate-2 font-serif text-2xl italic leading-none text-q-green-mid"
                  style={{ fontFamily: "cursive" }}
                >
                  {settings.signatoryName}
                </p>
              ) : null}
            </div>
            <div className="border-t border-foreground/40" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {settings.signatoryName
                ? "Authorised Signatory · Digital Signature"
                : "Authorised Signatory & Stamp"}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border py-5 text-[11px] text-muted-foreground">
          This is a computer-generated payment receipt
          {payment.number ? ` · ${payment.number}` : ""}.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
