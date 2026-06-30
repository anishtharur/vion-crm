import {
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Receipt,
  ReceiptText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /clients/3) as active. */
  match?: (pathname: string) => boolean;
};

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/",
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    match: (p) => p.startsWith("/clients"),
  },
  {
    href: "/quotes",
    label: "Quotes",
    icon: FileText,
    match: (p) => p.startsWith("/quotes"),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: ClipboardList,
    match: (p) => p.startsWith("/orders"),
  },
  {
    href: "/proformas",
    label: "Pro-formas",
    icon: FileSpreadsheet,
    match: (p) => p.startsWith("/proformas"),
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: ReceiptText,
    match: (p) => p.startsWith("/invoices"),
  },
  {
    href: "/receipts",
    label: "Receipts",
    icon: Receipt,
    match: (p) => p.startsWith("/receipts"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];
