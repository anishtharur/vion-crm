"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { initialFormState, type FormState } from "@/lib/validation/schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Confirm-and-delete form. Pass a Server Action already bound to the target id.
 * On a blocked deletion the action returns a message, which we surface inline.
 */
export function DeleteButton({
  action,
  confirm = "Delete this item? This cannot be undone.",
  label = "Delete",
  size = "md",
}: {
  action: Action;
  confirm?: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonClass("outline", size), "text-destructive hover:bg-red-50")}
      >
        <Trash2 className="h-4 w-4" />
        {pending ? "Deleting…" : label}
      </button>
      {state.message ? (
        <p role="alert" className="mt-2 max-w-xs text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
