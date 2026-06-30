"use client";

import { useTransition } from "react";

import { buttonClass } from "@/components/ui/button";
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

  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass(variant, "md")}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          const res = await action();
          if (res && !res.ok && res.message) window.alert(res.message);
        });
      }}
    >
      {icon}
      {pending ? pendingLabel ?? "Working…" : label}
    </button>
  );
}
