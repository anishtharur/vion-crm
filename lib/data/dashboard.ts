import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  invoices,
  payments,
  quotes,
} from "@/lib/db/schema";
import { displayInvoiceStatus } from "@/lib/utils/invoice-status";
import { round2 } from "@/lib/utils/money";
import { todayISO } from "@/lib/utils/format";

export type DashboardData = {
  clientsCount: number;
  quotesPending: number;
  quotesTotalValue: number;
  outstanding: number;
  overdueAmount: number;
  collectedThisMonth: number;
  monthly: { label: string; ym: string; amount: number }[];
  statusBreakdown: { status: string; count: number; amount: number }[];
  recentQuotes: {
    id: number;
    number: string;
    clientName: string;
    status: string;
    total: number;
    issueDate: string;
  }[];
  recentInvoices: {
    id: number;
    number: string;
    clientName: string;
    status: string;
    total: number;
    balance: number;
    dueDate: string;
  }[];
};

export function getDashboard(): DashboardData {
  const today = todayISO();

  const clientsCount =
    db.select({ c: sql<number>`count(*)` }).from(clients).get()?.c ?? 0;

  const quotesPending =
    db
      .select({ c: sql<number>`count(*)` })
      .from(quotes)
      .where(sql`${quotes.status} IN ('draft','sent')`)
      .get()?.c ?? 0;

  const quotesTotalValue = round2(
    db
      .select({ s: sql<number>`COALESCE(SUM(${quotes.total}), 0)` })
      .from(quotes)
      .where(sql`${quotes.status} IN ('draft','sent')`)
      .get()?.s ?? 0,
  );

  // Outstanding = unpaid balance across all invoices.
  const allInvoices = db.select().from(invoices).all();
  let outstanding = 0;
  let overdueAmount = 0;
  const statusMap = new Map<string, { count: number; amount: number }>();
  for (const inv of allInvoices) {
    const balance = round2((inv.total ?? 0) - (inv.amountPaid ?? 0));
    if (balance > 0) outstanding += balance;
    const ds = displayInvoiceStatus(inv, today);
    if (ds === "overdue") overdueAmount += balance;
    const entry = statusMap.get(ds) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += inv.total ?? 0;
    statusMap.set(ds, entry);
  }
  outstanding = round2(outstanding);
  overdueAmount = round2(overdueAmount);

  const statusOrder = ["draft", "sent", "partial", "paid", "overdue"];
  const statusBreakdown = statusOrder
    .filter((s) => statusMap.has(s))
    .map((s) => ({ status: s, count: statusMap.get(s)!.count, amount: round2(statusMap.get(s)!.amount) }));

  // Payments grouped by yyyy-mm.
  const paymentRows = db
    .select({
      ym: sql<string>`substr(${payments.paidOn}, 1, 7)`,
      sum: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
    })
    .from(payments)
    .groupBy(sql`substr(${payments.paidOn}, 1, 7)`)
    .all();
  const paymentByMonth = new Map(paymentRows.map((r) => [r.ym, round2(r.sum)]));

  const monthly = lastSixMonths(today).map(({ ym, label }) => ({
    ym,
    label,
    amount: paymentByMonth.get(ym) ?? 0,
  }));
  const thisYm = today.slice(0, 7);
  const collectedThisMonth = paymentByMonth.get(thisYm) ?? 0;

  const recentQuotes = db
    .select({
      id: quotes.id,
      number: quotes.number,
      clientName: clients.name,
      status: quotes.status,
      total: quotes.total,
      issueDate: quotes.issueDate,
    })
    .from(quotes)
    .innerJoin(clients, eq(quotes.clientId, clients.id))
    .orderBy(desc(quotes.createdAt))
    .limit(5)
    .all();

  const recentInvoices = db
    .select({
      id: invoices.id,
      number: invoices.number,
      clientName: clients.name,
      status: invoices.status,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.createdAt))
    .limit(5)
    .all()
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      clientName: inv.clientName,
      status: displayInvoiceStatus(
        { status: inv.status, total: inv.total, amountPaid: inv.amountPaid, dueDate: inv.dueDate },
        today,
      ),
      total: inv.total,
      balance: round2((inv.total ?? 0) - (inv.amountPaid ?? 0)),
      dueDate: inv.dueDate,
    }));

  return {
    clientsCount,
    quotesPending,
    quotesTotalValue,
    outstanding,
    overdueAmount,
    collectedThisMonth,
    monthly,
    statusBreakdown,
    recentQuotes,
    recentInvoices,
  };
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function lastSixMonths(today: string): { ym: string; label: string }[] {
  const [y, m] = today.split("-").map(Number);
  const out: { ym: string; label: string }[] = [];
  // m is 1-based; build from 5 months ago to current.
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0-based
    const ym = `${year}-${String(month + 1).padStart(2, "0")}`;
    out.push({ ym, label: MONTH_LABELS[month] });
  }
  return out;
}
