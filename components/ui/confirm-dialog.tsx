"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";

type Tone = "default" | "destructive";

type DialogOptions = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};

type DialogState = DialogOptions & {
  mode: "confirm" | "alert";
  resolve: (value: boolean) => void;
};

type ConfirmApi = {
  /** Themed replacement for window.confirm. Resolves true if confirmed. */
  confirm: (options: DialogOptions) => Promise<boolean>;
  /** Themed replacement for window.alert (single OK button). */
  alert: (options: DialogOptions | string) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback(
    (options: DialogOptions) =>
      new Promise<boolean>((resolve) =>
        setDialog({ ...options, mode: "confirm", resolve }),
      ),
    [],
  );

  const alert = useCallback(
    (options: DialogOptions | string) =>
      new Promise<void>((resolve) =>
        setDialog({
          ...(typeof options === "string" ? { message: options } : options),
          mode: "alert",
          resolve: () => resolve(),
        }),
      ).then(() => undefined),
    [],
  );

  const settle = useCallback(
    (result: boolean) => {
      setDialog((d) => {
        d?.resolve(result);
        return null;
      });
    },
    [],
  );

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog ? <Dialog dialog={dialog} onSettle={settle} /> : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

function Dialog({
  dialog,
  onSettle,
}: {
  dialog: DialogState;
  onSettle: (result: boolean) => void;
}) {
  const isConfirm = dialog.mode === "confirm";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSettle(false);
      if (e.key === "Enter") onSettle(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSettle]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialog.title ?? "Confirm"}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onSettle(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-foreground">
          {dialog.title ?? (isConfirm ? "Are you sure?" : "Notice")}
        </h2>
        {dialog.message ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{dialog.message}</p>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          {isConfirm ? (
            <Button variant="outline" size="sm" onClick={() => onSettle(false)}>
              {dialog.cancelLabel ?? "Cancel"}
            </Button>
          ) : null}
          <Button
            variant={dialog.tone === "destructive" ? "destructive" : "primary"}
            size="sm"
            autoFocus
            onClick={() => onSettle(true)}
          >
            {dialog.confirmLabel ?? (isConfirm ? "Confirm" : "OK")}
          </Button>
        </div>
      </div>
    </div>
  );
}
