import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  FileText,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBars } from "@/components/dashboard/status-bars";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getDashboard } from "@/lib/data/dashboard";
import { getSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = getDashboard();
  const { currencySymbol: sym, companyName } = getSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back`}
        description={`Here's how ${companyName} is doing.`}
        actions={
          <>
            <Link href="/quotes/new" className={buttonClass("outline", "md")}>
              <Plus className="h-4 w-4" />
              Quote
            </Link>
            <Link href="/invoices/new" className={buttonClass("primary", "md")}>
              <Plus className="h-4 w-4" />
              Invoice
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatMoney(d.outstanding, sym)}
          hint={d.overdueAmount > 0 ? `${formatMoney(d.overdueAmount, sym)} overdue` : "All on track"}
          icon={CircleDollarSign}
          href="/invoices"
          accent
        />
        <StatCard
          label="Collected this month"
          value={formatMoney(d.collectedThisMonth, sym)}
          icon={TrendingUp}
        />
        <StatCard
          label="Open quotes"
          value={String(d.quotesPending)}
          hint={`${formatMoney(d.quotesTotalValue, sym)} potential`}
          icon={FileText}
          href="/quotes"
        />
        <StatCard
          label="Clients"
          value={String(d.clientsCount)}
          icon={Users}
          href="/clients"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cash collected" description="Payments received over the last 6 months." />
          <CardBody>
            <RevenueChart data={d.monthly} currencySymbol={sym} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Invoice status" />
          <CardBody>
            <StatusBars data={d.statusBreakdown} currencySymbol={sym} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent quotes"
            action={
              <Link href="/quotes" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <CardBody className="p-0">
            <RecentList
              empty="No quotes yet."
              rows={d.recentQuotes.map((q) => ({
                id: q.id,
                href: `/quotes/${q.id}`,
                number: q.number,
                clientName: q.clientName,
                status: q.status,
                amount: q.total,
                date: q.issueDate,
              }))}
              sym={sym}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent invoices"
            action={
              <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <CardBody className="p-0">
            <RecentList
              empty="No invoices yet."
              rows={d.recentInvoices.map((inv) => ({
                id: inv.id,
                href: `/invoices/${inv.id}`,
                number: inv.number,
                clientName: inv.clientName,
                status: inv.status,
                amount: inv.total,
                date: inv.dueDate,
              }))}
              sym={sym}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function RecentList({
  rows,
  sym,
  empty,
}: {
  rows: {
    id: number;
    href: string;
    number: string;
    clientName: string;
    status: string;
    amount: number;
    date: string;
  }[];
  sym: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={r.href}
            className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.number}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.clientName} · {formatDate(r.date)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge status={r.status} />
              <span className="w-24 text-right font-medium tabular-nums">
                {formatMoney(r.amount, sym)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
