import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  invoices,
  payments,
  quotes,
} from "@/lib/db/schema";
import { getSettings } from "@/lib/data/settings";
import { convertToBase, parseRates } from "@/lib/utils/currency";
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
    currency: string;
    issueDate: string;
  }[];
  recentInvoices: {
    id: number;
    number: string;
    clientName: string;
    status: string;
    total: number;
    balance: number;
    currency: string;
    dueDate: string;
  }[];
};

export function getDashboard(): DashboardData {
  const today = todayISO();

  // Everything on the dashboard rolls up into the base currency using the
  // exchange rates from settings, so mixed-currency documents sum correctly.
  const { currencyCode: baseCode, exchangeRates } = getSettings();
  const rates = parseRates(exchangeRates);
  const toBase = (amount: number, code: string | null | undefined) =>
    convertToBase(amount, code, baseCode, rates);

  const clientsCount =
    db.select({ c: sql<number>`count(*)` }).from(clients).get()?.c ?? 0;

  const quotesPending =
    db
      .select({ c: sql<number>`count(*)` })
      .from(quotes)
      .where(sql`${quotes.status} IN ('draft','sent')`)
      .get()?.c ?? 0;

  const pendingQuotes = db
    .select({ total: quotes.total, currency: quotes.currency })
    .from(quotes)
    .where(sql`${quotes.status} IN ('draft','sent')`)
    .all();
  const quotesTotalValue = round2(
    pendingQuotes.reduce((sum, q) => sum + toBase(q.total ?? 0, q.currency), 0),
  );

  // Outstanding = unpaid balance across all invoices.
  const allInvoices = db.select().from(invoices).all();
  let outstanding = 0;
  let overdueAmount = 0;
  const statusMap = new Map<string, { count: number; amount: number }>();
  for (const inv of allInvoices) {
    const balanceRaw = round2((inv.total ?? 0) - (inv.amountPaid ?? 0));
    const balance = toBase(balanceRaw, inv.currency);
    if (balanceRaw > 0) outstanding += balance;
    const ds = displayInvoiceStatus(inv, today);
    if (ds === "overdue") overdueAmount += balance;
    const entry = statusMap.get(ds) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += toBase(inv.total ?? 0, inv.currency);
    statusMap.set(ds, entry);
  }
  outstanding = round2(outstanding);
  overdueAmount = round2(overdueAmount);

  const statusOrder = ["draft", "sent", "partial", "paid", "overdue"];
  const statusBreakdown = statusOrder
    .filter((s) => statusMap.has(s))
    .map((s) => ({ status: s, count: statusMap.get(s)!.count, amount: round2(statusMap.get(s)!.amount) }));

  // Payments grouped by yyyy-mm, each converted from its invoice's currency.
  const paymentRows = db
    .select({
      paidOn: payments.paidOn,
      amount: payments.amount,
      currency: invoices.currency,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .all();
  const paymentByMonth = new Map<string, number>();
  for (const p of paymentRows) {
    const ym = (p.paidOn ?? "").slice(0, 7);
    if (!ym) continue;
    const prev = paymentByMonth.get(ym) ?? 0;
    paymentByMonth.set(ym, round2(prev + toBase(p.amount ?? 0, p.currency)));
  }

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
      currency: quotes.currency,
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
      currency: invoices.currency,
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
      currency: inv.currency,
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
