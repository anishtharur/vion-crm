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
  /** Optional small badge (e.g. a count or "NEW"). */
  badge?: string;
};

export type NavGroup = {
  /** Uppercase section label; omitted for the top group. */
  label?: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/quotes", label: "Quotes", icon: FileText, match: (p) => p.startsWith("/quotes") },
      { href: "/orders", label: "Orders", icon: ClipboardList, match: (p) => p.startsWith("/orders") },
      {
        href: "/proformas",
        label: "Pro-formas",
        icon: FileSpreadsheet,
        match: (p) => p.startsWith("/proformas"),
      },
      { href: "/invoices", label: "Invoices", icon: ReceiptText, match: (p) => p.startsWith("/invoices") },
      { href: "/receipts", label: "Receipts", icon: Receipt, match: (p) => p.startsWith("/receipts") },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/clients", label: "Clients", icon: Users, match: (p) => p.startsWith("/clients") },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
    ],
  },
];
