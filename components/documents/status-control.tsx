"use client";

import { useTransition } from "react";

import { titleCase } from "@/lib/utils/format";
import type { FormState } from "@/lib/validation/schemas";

/** Inline status switcher. Calls a Server Action bound to the document id. */
export function StatusControl({
  current,
  statuses,
  action,
}: {
  current: string;
  statuses: readonly string[];
  action: (status: string) => Promise<FormState>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Status</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await action(next);
          });
        }}
        className="h-9 rounded-lg border border-input bg-surface px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {titleCase(s)}
          </option>
        ))}
      </select>
    </label>
  );
}
