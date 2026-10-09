"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { computeTotals, lineTotal } from "@/lib/utils/money";
import { formatMoney, titleCase } from "@/lib/utils/format";
import type { CurrencyMeta } from "@/lib/utils/currency";
import { initialFormState, type FormState } from "@/lib/validation/schemas";

export type DocClientOption = { id: number; name: string; company: string };
export type DocItem = {
  description: string;
  detail: string;
  standard: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type DocumentDefaults = {
  clientId?: number;
  issueDate: string;
  secondaryDate: string;
  currency: string;
  discount: number;
  taxRate: number;
  notes: string;
  terms: string;
  status: string;
  items: DocItem[];
  /** Sales-document header fields (quote / order / pro-forma). */
  subject?: string;
  projectName?: string;
  enquiryRef?: string;
  attention?: string;
  /** Order-only promised lead time. */
  deliveryTime?: string;
};

type Props = {
  kind: "quote" | "order" | "proforma" | "invoice";
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clients: DocClientOption[];
  currencies: CurrencyMeta[];
  taxLabel: string;
  statuses: readonly string[];
  defaults: DocumentDefaults;
  cancelHref: string;
  submitLabel: string;
};

const blankRow: DocItem = {
  description: "",
  detail: "",
  standard: "",
  unit: "No.",
  quantity: 1,
  unitPrice: 0,
};

export function DocumentForm({
  kind,
  action,
  clients,
  currencies,
  taxLabel,
  statuses,
  defaults,
  cancelHref,
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const errors = state.errors ?? {};

  const [items, setItems] = useState<DocItem[]>(
    defaults.items.length ? defaults.items : [{ ...blankRow }],
  );
  const [discount, setDiscount] = useState<number>(defaults.discount);
  const [taxRate, setTaxRate] = useState<number>(defaults.taxRate);
  const [currency, setCurrency] = useState<string>(defaults.currency);
  const currencySymbol =
    currencies.find((c) => c.code === currency)?.symbol ?? currencies[0]?.symbol ?? "$";

  const totals = useMemo(
    () => computeTotals({ items, discount, taxRate }),
    [items, discount, taxRate],
  );

  const isSalesDoc = kind !== "invoice";
  // Order acknowledgements have no secondary date (they use a delivery-time text instead).
  const hasSecondaryDate = kind !== "order";
  const secondaryLabel =
    kind === "quote" || kind === "proforma" ? "Valid until" : "Due date";
  const secondaryName =
    kind === "quote" || kind === "proforma" ? "validUntil" : "dueDate";

  function updateRow(index: number, patch: Partial<DocItem>) {
    setItems((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setItems((rows) => [...rows, { ...blankRow }]);
  }
  function removeRow(index: number) {
    setItems((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Serialized line items consumed by the Server Action. */}
      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

      {state.message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-destructive ring-1 ring-red-200">
          {state.message}
        </p>
      ) : null}

      <Card>
        <CardHeader title="Details" />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="clientId" required>
              Client
            </Label>
            <Select
              id="clientId"
              name="clientId"
              defaultValue={defaults.clientId ? String(defaults.clientId) : ""}
              required
            >
              <option value="" disabled>
                Select a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </Select>
            <FieldError message={errors.clientId} />
            {clients.length === 0 ? (
              <p className="mt-1 text-xs text-destructive">
                No clients yet —{" "}
                <Link href="/clients/new" className="underline">
                  add one first
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="issueDate" required>
              Issue date
            </Label>
            <Input
              id="issueDate"
              name="issueDate"
              type="date"
              defaultValue={defaults.issueDate}
              required
            />
            <FieldError message={errors.issueDate} />
          </div>

          {hasSecondaryDate ? (
            <div>
              <Label htmlFor={secondaryName}>{secondaryLabel}</Label>
              <Input
                id={secondaryName}
                name={secondaryName}
                type="date"
                defaultValue={defaults.secondaryDate}
              />
            </div>
          ) : null}

          {kind === "order" ? (
            <div>
              <Label htmlFor="deliveryTime">Delivery time</Label>
              <Input
                id="deliveryTime"
                name="deliveryTime"
                defaultValue={defaults.deliveryTime ?? ""}
                placeholder="e.g. 6 weeks from confirmed PO"
              />
            </div>
          ) : null}

          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
            <FieldError message={errors.currency} />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={defaults.status}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {isSalesDoc ? (
        <Card>
          <CardHeader
            title="Project & references"
            action={
              <span className="text-xs text-muted-foreground">Shown on the document</span>
            }
          />
          <CardBody className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                defaultValue={defaults.subject ?? ""}
                placeholder="e.g. Supply of FM-200 Fire Suppression System"
              />
            </div>
            <div>
              <Label htmlFor="projectName">Project / site</Label>
              <Input
                id="projectName"
                name="projectName"
                defaultValue={defaults.projectName ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="enquiryRef">Enquiry ref</Label>
              <Input
                id="enquiryRef"
                name="enquiryRef"
                defaultValue={defaults.enquiryRef ?? ""}
                placeholder="Client enquiry no."
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="attention">Attention (contact person)</Label>
              <Input
                id="attention"
                name="attention"
                defaultValue={defaults.attention ?? ""}
              />
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Line items"
          action={
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {errors.items ? <FieldError message={errors.items} /> : null}

          {/* Column headers (desktop) */}
          <div className="hidden grid-cols-[40px_1fr_88px_120px_120px_40px] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>SL No</span>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          {items.map((row, i) => (
            <div
              key={i}
              className="space-y-2 rounded-lg border border-border p-3 sm:border-0 sm:p-1"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[40px_1fr_88px_120px_120px_40px] sm:items-center">
                <div className="hidden text-sm tabular-nums text-muted-foreground sm:block sm:px-1">
                  {i + 1}
                </div>
                <Input
                  aria-label={`Item ${i + 1} description`}
                  placeholder="Description of work or product"
                  value={row.description}
                  onChange={(e) => updateRow(i, { description: e.target.value })}
                />
                <Input
                  aria-label={`Item ${i + 1} quantity`}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  className="text-right"
                  value={Number.isFinite(row.quantity) ? row.quantity : 0}
                  onChange={(e) => updateRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  aria-label={`Item ${i + 1} unit price`}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="text-right"
                  value={Number.isFinite(row.unitPrice) ? row.unitPrice : 0}
                  onChange={(e) => updateRow(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                />
                <div className="text-right text-sm font-medium tabular-nums sm:px-2">
                  {formatMoney(lineTotal(row.quantity, row.unitPrice), currencySymbol)}
                </div>
                <button
                  type="button"
                  aria-label={`Remove item ${i + 1}`}
                  onClick={() => removeRow(i)}
                  disabled={items.length === 1}
                  className={cn(
                    buttonClass("ghost", "icon"),
                    "justify-self-end text-muted-foreground hover:text-destructive disabled:opacity-30",
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[40px_1fr_160px_96px_40px]">
                  <span className="hidden sm:block" />
                  <Input
                    aria-label={`Item ${i + 1} specification`}
                    placeholder="Specification / sub-description (optional)"
                    value={row.detail}
                    onChange={(e) => updateRow(i, { detail: e.target.value })}
                  />
                  <Input
                    aria-label={`Item ${i + 1} standard`}
                    placeholder="Standard (e.g. UL Listed)"
                    value={row.standard}
                    onChange={(e) => updateRow(i, { standard: e.target.value })}
                  />
                  <Input
                    aria-label={`Item ${i + 1} unit`}
                    placeholder="Unit"
                    value={row.unit}
                    onChange={(e) => updateRow(i, { unit: e.target.value })}
                  />
                  <span className="hidden sm:block" />
                </div>
            </div>
          ))}

          {/* Bottom add-line button — handy when the list is long. */}
          <button
            type="button"
            onClick={addRow}
            className={cn(
              buttonClass("outline", "sm"),
              "w-full justify-center border-dashed text-muted-foreground hover:text-foreground",
            )}
          >
            <Plus className="h-4 w-4" />
            Add line
          </button>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Notes & terms" />
          <CardBody className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={defaults.notes}
                placeholder="Visible to the client on the document."
              />
            </div>
            <div>
              <Label htmlFor="terms">Terms</Label>
              <Textarea
                id="terms"
                name="terms"
                defaultValue={defaults.terms}
                placeholder="Payment terms, conditions, etc."
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Summary" />
          <CardBody className="space-y-3">
            <SummaryRow label="Subtotal">
              {formatMoney(totals.subtotal, currencySymbol)}
            </SummaryRow>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="discount" className="mb-0">
                Discount
              </Label>
              <div className="w-36">
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="text-right"
                  value={Number.isFinite(discount) ? discount : 0}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="taxRate" className="mb-0">
                {taxLabel} rate (%)
              </Label>
              <div className="w-36">
                <Input
                  id="taxRate"
                  name="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  inputMode="decimal"
                  className="text-right"
                  value={Number.isFinite(taxRate) ? taxRate : 0}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <SummaryRow label={`${taxLabel} (${taxRate || 0}%)`}>
              {formatMoney(totals.taxAmount, currencySymbol)}
            </SummaryRow>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-display text-base font-semibold">Total</span>
              <span className="font-display text-xl font-semibold text-primary tabular-nums">
                {formatMoney(totals.total, currencySymbol)}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link href={cancelHref} className={buttonClass("outline", "md")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending || clients.length === 0}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{children}</span>
    </div>
  );
}
