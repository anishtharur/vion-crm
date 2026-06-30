import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "accent" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm shadow-primary/20",
  accent:
    "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm shadow-accent/20",
  secondary: "bg-surface-muted text-foreground hover:bg-border",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-muted",
  ghost: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive-hover shadow-sm shadow-destructive/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
  icon: "h-9 w-9",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const buttonClass = (
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) =>
  cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors duration-150 cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props} />
  );
}
