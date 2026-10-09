"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";

import { buttonClass } from "@/components/ui/button";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";
import { navGroups } from "./nav";
import { ThemeToggle } from "./theme-toggle";

/* --- persisted sidebar-collapsed state (survives reloads, no setState-in-effect) --- */
const collapseListeners = new Set<() => void>();
function subscribeCollapse(cb: () => void) {
  collapseListeners.add(cb);
  return () => collapseListeners.delete(cb);
}
function getCollapsed() {
  try {
    return localStorage.getItem("sidebar-collapsed") === "1";
  } catch {
    return false;
  }
}
function setCollapsedStored(v: boolean) {
  try {
    localStorage.setItem("sidebar-collapsed", v ? "1" : "0");
  } catch {
    /* ignore */
  }
  collapseListeners.forEach((l) => l());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppShell({
  companyName,
  email,
  userName,
  userEmail,
  children,
}: {
  companyName: string;
  email?: string;
  userName?: string;
  userEmail?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapse, getCollapsed, () => false);

  return (
    <ConfirmProvider>
      <div className="min-h-dvh overflow-x-clip">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <SidebarBody
            companyName={companyName}
            email={email}
            userName={userName}
            userEmail={userEmail}
            pathname={pathname}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsedStored(!collapsed)}
          />
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
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className={cn(buttonClass("ghost", "icon"), "absolute right-2 top-3")}
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarBody
                companyName={companyName}
                email={email}
                userName={userName}
                userEmail={userEmail}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        {/* Main column */}
        <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-16" : "lg:pl-64")}>
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
    </ConfirmProvider>
  );
}

function SidebarBody({
  companyName,
  email,
  userName,
  userEmail,
  pathname,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  companyName: string;
  email?: string;
  userName?: string;
  userEmail?: string;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const [signingOut, startSignOut] = useTransition();
  const accountName = userName || companyName;
  const accountEmail = userEmail || email;
  return (
    <>
      {/* Brand */}
      <Link
        href="/"
        onClick={onNavigate}
        className={cn(
          "flex h-16 shrink-0 items-center gap-2.5 border-b border-border",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          V
        </span>
        {collapsed ? null : (
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            Vion<span className="text-primary"> CRM</span>
          </span>
        )}
      </Link>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary">
        {navGroups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-3")}>
            {collapsed ? (
              gi > 0 ? <div className="mx-3 mb-2 border-t border-border" /> : null
            ) : group.label ? (
              <p className="px-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
            ) : null}

            <div className={cn("flex flex-col gap-0.5", collapsed ? "px-2" : "px-3")}>
              {group.items.map((item) => {
                const active = item.match ? item.match(pathname) : pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center rounded-md text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "")}
                      aria-hidden="true"
                    />
                    {collapsed ? null : (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge ? (
                          <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className={cn("border-t border-border", collapsed ? "px-2 py-2" : "px-3 py-3")}>
        <div
          className={cn(
            "flex items-center rounded-md",
            collapsed ? "flex-col gap-1" : "gap-2.5 px-2 py-1.5",
          )}
          title={collapsed ? accountEmail || accountName : undefined}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-xs font-semibold text-foreground">
            {initials(accountName)}
          </span>
          {collapsed ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{accountName}</p>
              {accountEmail ? (
                <p className="truncate text-xs text-muted-foreground">{accountEmail}</p>
              ) : null}
            </div>
          )}
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            disabled={signingOut}
            onClick={() => startSignOut(() => logout())}
            className={cn(buttonClass("ghost", "icon"), "h-8 w-8 shrink-0")}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Collapse toggle (desktop only) */}
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex shrink-0 items-center border-t border-border py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground",
            collapsed ? "justify-center px-0" : "gap-2 px-5",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      ) : null}
    </>
  );
}
