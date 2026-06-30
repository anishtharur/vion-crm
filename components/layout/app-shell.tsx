"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { navItems } from "./nav";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({
  companyName,
  children,
}: {
  companyName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
      {navItems.map((item) => {
        const active = item.match
          ? item.match(pathname)
          : pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                active ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Vion<span className="text-primary"> CRM</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh overflow-x-clip">
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border lg:flex">
        {brand}
        {nav}
        <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
          {companyName}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="glass absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className={buttonClass("ghost", "icon")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
              {companyName}
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className={cn(buttonClass("ghost", "icon"), "lg:hidden")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-display text-sm font-medium text-muted-foreground">
            {companyName}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/quotes/new" className={buttonClass("outline", "sm")}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New quote</span>
            </Link>
            <Link href="/invoices/new" className={buttonClass("primary", "sm")}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New invoice</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
