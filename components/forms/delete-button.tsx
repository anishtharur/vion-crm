"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils/cn";
import { initialFormState, type FormState } from "@/lib/validation/schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Confirm-and-delete button. Pass a Server Action already bound to the target id.
 * Uses the themed confirm dialog; a blocked deletion's message is surfaced inline.
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
  const { confirm: ask } = useConfirm();

  async function onClick() {
    const ok = await ask({
      title: "Delete",
      message: confirm,
      confirmLabel: "Delete",
      tone: "destructive",
    });
    if (ok) formAction(new FormData());
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(buttonClass("outline", size), "text-destructive hover:bg-destructive/10")}
      >
        <Trash2 className="h-4 w-4" />
        {pending ? "Deleting…" : label}
      </button>
      {state.message ? (
        <p role="alert" className="mt-2 max-w-xs text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
