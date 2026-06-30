import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils/cn";

const controlBase =
  "w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60";

export function Label({
  children,
  htmlFor,
  required,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
    >
      {children}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea rows={rows} className={cn(controlBase, "py-2", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>;
}
