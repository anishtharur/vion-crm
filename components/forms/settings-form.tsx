"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FieldError, Hint, Input, Label, Textarea } from "@/components/ui/field";
import type { Settings } from "@/lib/db/schema";
import { updateSettings } from "@/lib/actions/settings";
import { initialFormState } from "@/lib/validation/schemas";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(updateSettings, initialFormState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.ok && state.message ? (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          <Check className="h-4 w-4" />
          {state.message}
        </p>
      ) : null}

      <Card>
        <CardHeader title="Company profile" description="Appears on every quote and invoice." />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyName" required>
              Company name
            </Label>
            <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
            <FieldError message={errors.companyName} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
            <Hint>Strapline under the wordmark on quotes.</Hint>
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN / Tax reg. no.</Label>
            <Input id="gstin" name="gstin" defaultValue={settings.gstin} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={settings.email} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={settings.phone} />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={settings.website} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" defaultValue={settings.address} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Currency & tax" description="Defaults applied to new documents." />
        <CardBody className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label htmlFor="currencySymbol" required>
              Currency symbol
            </Label>
            <Input id="currencySymbol" name="currencySymbol" defaultValue={settings.currencySymbol} required />
            <FieldError message={errors.currencySymbol} />
          </div>
          <div>
            <Label htmlFor="currencyCode">Currency code</Label>
            <Input id="currencyCode" name="currencyCode" defaultValue={settings.currencyCode} />
          </div>
          <div>
            <Label htmlFor="taxLabel" required>
              Tax label
            </Label>
            <Input id="taxLabel" name="taxLabel" defaultValue={settings.taxLabel} required />
            <Hint>e.g. GST, VAT, Sales tax.</Hint>
          </div>
          <div>
            <Label htmlFor="defaultTaxRate">Default tax rate (%)</Label>
            <Input
              id="defaultTaxRate"
              name="defaultTaxRate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={settings.defaultTaxRate}
            />
            <FieldError message={errors.defaultTaxRate} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Numbering & defaults" description="How documents are numbered and dated." />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="quotePrefix" required>
              Quote prefix
            </Label>
            <Input id="quotePrefix" name="quotePrefix" defaultValue={settings.quotePrefix} required />
            <Hint>Numbers look like {settings.quotePrefix}-2026-099.</Hint>
          </div>
          <div>
            <Label htmlFor="orderPrefix" required>
              Order prefix
            </Label>
            <Input id="orderPrefix" name="orderPrefix" defaultValue={settings.orderPrefix} required />
            <Hint>Numbers look like {settings.orderPrefix}-2026-099.</Hint>
          </div>
          <div>
            <Label htmlFor="proformaPrefix" required>
              Pro-forma prefix
            </Label>
            <Input id="proformaPrefix" name="proformaPrefix" defaultValue={settings.proformaPrefix} required />
            <Hint>Numbers look like {settings.proformaPrefix}-2026-099.</Hint>
          </div>
          <div>
            <Label htmlFor="invoicePrefix" required>
              Invoice prefix
            </Label>
            <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings.invoicePrefix} required />
            <Hint>Numbers look like {settings.invoicePrefix}-2026-099.</Hint>
          </div>
          <div>
            <Label htmlFor="receiptPrefix" required>
              Receipt prefix
            </Label>
            <Input id="receiptPrefix" name="receiptPrefix" defaultValue={settings.receiptPrefix} required />
            <Hint>Numbers look like {settings.receiptPrefix}-2026-099.</Hint>
          </div>
          <div>
            <Label htmlFor="quoteValidityDays">Quote validity (days)</Label>
            <Input
              id="quoteValidityDays"
              name="quoteValidityDays"
              type="number"
              min={0}
              defaultValue={settings.quoteValidityDays}
            />
          </div>
          <div>
            <Label htmlFor="paymentTermsDays">Payment due (days)</Label>
            <Input
              id="paymentTermsDays"
              name="paymentTermsDays"
              type="number"
              min={0}
              defaultValue={settings.paymentTermsDays}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Payment & footer" description="Shown on invoices." />
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="paymentTerms">Default terms</Label>
            <Textarea id="paymentTerms" name="paymentTerms" defaultValue={settings.paymentTerms} />
          </div>
          <div>
            <Label htmlFor="bankDetails">Payment / bank details</Label>
            <Textarea id="bankDetails" name="bankDetails" defaultValue={settings.bankDetails} />
          </div>
          <div>
            <Label htmlFor="footerNote">Footer note</Label>
            <Input id="footerNote" name="footerNote" defaultValue={settings.footerNote} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Quotation terms"
          description="Boilerplate printed in the Commercial Terms grid on quotes."
        />
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="signatoryName">Authorised signatory</Label>
            <Input
              id="signatoryName"
              name="signatoryName"
              defaultValue={settings.signatoryName}
            />
            <Hint>Printed under the &ldquo;For {settings.companyName}&rdquo; signature line.</Hint>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="termsScope">Scope</Label>
              <Textarea id="termsScope" name="termsScope" rows={2} defaultValue={settings.termsScope} />
            </div>
            <div>
              <Label htmlFor="termsPrices">Prices</Label>
              <Textarea id="termsPrices" name="termsPrices" rows={2} defaultValue={settings.termsPrices} />
            </div>
            <div>
              <Label htmlFor="termsDelivery">Delivery</Label>
              <Textarea id="termsDelivery" name="termsDelivery" rows={2} defaultValue={settings.termsDelivery} />
            </div>
            <div>
              <Label htmlFor="termsWarranty">Warranty</Label>
              <Textarea id="termsWarranty" name="termsWarranty" rows={2} defaultValue={settings.termsWarranty} />
            </div>
            <div>
              <Label htmlFor="termsCompliance">Compliance</Label>
              <Textarea id="termsCompliance" name="termsCompliance" rows={2} defaultValue={settings.termsCompliance} />
            </div>
            <div>
              <Label htmlFor="termsPacking">Packing</Label>
              <Textarea id="termsPacking" name="termsPacking" rows={2} defaultValue={settings.termsPacking} />
            </div>
          </div>
          <Hint>
            Validity and Payment cells use the quote&rsquo;s own dates and terms.
          </Hint>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
