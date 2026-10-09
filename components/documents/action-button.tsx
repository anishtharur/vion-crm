"use client";

import { useTransition } from "react";

import { buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { FormState } from "@/lib/validation/schemas";

/**
 * Button that invokes a no-argument Server Action with pending + confirm.
 * `icon` is a rendered element (ReactNode) — never a component reference —
 * so it can cross the Server→Client boundary safely.
 */
export function ActionButton({
  action,
  label,
  pendingLabel,
  icon,
  variant = "outline",
  confirm,
}: {
  action: () => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost" | "destructive";
  confirm?: string;
}) {
  const [pending, startTransition] = useTransition();
  const { confirm: ask, alert } = useConfirm();

  async function onClick() {
    if (confirm && !(await ask({ title: label, message: confirm }))) return;
    startTransition(async () => {
      const res = await action();
      if (res && !res.ok && res.message) {
        await alert({ title: "Couldn’t complete", message: res.message });
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass(variant, "md")}
      onClick={onClick}
    >
      {icon}
      {pending ? pendingLabel ?? "Working…" : label}
    </button>
  );
}
