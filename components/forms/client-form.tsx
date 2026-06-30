"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FieldError, Hint, Input, Label, Textarea } from "@/components/ui/field";
import type { Client } from "@/lib/db/schema";
import { initialFormState, type FormState } from "@/lib/validation/schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ClientForm({
  action,
  client,
  cancelHref,
}: {
  action: Action;
  client?: Client;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-destructive ring-1 ring-red-200">
          {state.message}
        </p>
      ) : null}

      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name" required>
              Contact name
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={client?.name}
              autoFocus
              required
              placeholder="Jane Doe"
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              defaultValue={client?.company}
              placeholder="Acme Inc."
            />
            <FieldError message={errors.company} />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email}
              placeholder="jane@acme.com"
              autoComplete="email"
            />
            <FieldError message={errors.email} />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={client?.phone}
              placeholder="+1 555 123 4567"
              autoComplete="tel"
            />
            <FieldError message={errors.phone} />
          </div>

          <div>
            <Label htmlFor="fax">Fax</Label>
            <Input
              id="fax"
              name="fax"
              defaultValue={client?.fax}
              placeholder="+1 555 123 4568"
              autoComplete="fax"
            />
            <FieldError message={errors.fax} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="billingAddress">Billing address</Label>
            <Textarea
              id="billingAddress"
              name="billingAddress"
              defaultValue={client?.billingAddress}
              placeholder="Street, City, State"
            />
            <Hint>Appears on quotes and invoices for this client.</Hint>
          </div>

          <div>
            <Label htmlFor="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={client?.postalCode}
              placeholder="560001"
              autoComplete="postal-code"
            />
            <FieldError message={errors.postalCode} />
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              defaultValue={client?.country}
              placeholder="India"
              autoComplete="country-name"
            />
            <FieldError message={errors.country} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={client?.notes}
              placeholder="Internal notes — not shown on documents."
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={cancelHref} className={buttonClass("outline", "md")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : client ? "Save changes" : "Create client"}
        </Button>
      </div>
    </form>
  );
}
