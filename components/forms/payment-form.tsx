"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { todayISO } from "@/lib/utils/format";
import { initialFormState, type FormState } from "@/lib/validation/schemas";

export function PaymentForm({
  action,
  currencySymbol,
  suggestedAmount,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  currencySymbol: string;
  suggestedAmount: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.errors ?? {};

  // Clear the inputs after a payment is recorded successfully.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount" required>
            Amount ({currencySymbol})
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={suggestedAmount > 0 ? suggestedAmount : ""}
            placeholder="0.00"
            required
          />
          <FieldError message={errors.amount} />
        </div>
        <div>
          <Label htmlFor="paidOn" required>
            Date
          </Label>
          <Input id="paidOn" name="paidOn" type="date" defaultValue={todayISO()} required />
          <FieldError message={errors.paidOn} />
        </div>
        <div>
          <Label htmlFor="method">Method</Label>
          <Input id="method" name="method" placeholder="Bank transfer, card…" />
        </div>
        <div>
          <Label htmlFor="note">Note</Label>
          <Input id="note" name="note" placeholder="Reference / memo" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          <Plus className="h-4 w-4" />
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
