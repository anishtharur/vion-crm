import "server-only";

import { asc, count, desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  invoices,
  quotes,
  type Client,
  type Invoice,
  type Quote,
} from "@/lib/db/schema";
import { paged, type ListParams, type Paged } from "./list-params";

export type ClientListRow = Client & {
  quoteCount: number;
  invoiceCount: number;
};

const quoteCountSql = sql<number>`(SELECT COUNT(*) FROM ${quotes} WHERE ${quotes.clientId} = ${clients.id})`;
const invoiceCountSql = sql<number>`(SELECT COUNT(*) FROM ${invoices} WHERE ${invoices.clientId} = ${clients.id})`;

const CLIENT_SORT = {
  name: clients.name,
  company: clients.company,
  email: clients.email,
} as const;

export function listClients(params: ListParams): Paged<ClientListRow> {
  const term = params.q;
  const where = term
    ? or(
        like(clients.name, `%${term}%`),
        like(clients.company, `%${term}%`),
        like(clients.email, `%${term}%`),
      )
    : undefined;

  const col =
    params.sort === "quotes"
      ? quoteCountSql
      : params.sort === "invoices"
        ? invoiceCountSql
        : (params.sort && CLIENT_SORT[params.sort as keyof typeof CLIENT_SORT]) ||
          clients.createdAt;
  const orderBy = params.dir === "asc" ? asc(col) : desc(col);

  const total = db.select({ v: count() }).from(clients).where(where).get()?.v ?? 0;
  const rows = db
    .select({
      client: clients,
      quoteCount: quoteCountSql,
      invoiceCount: invoiceCountSql,
    })
    .from(clients)
    .where(where)
    .orderBy(orderBy)
    .limit(params.pageSize)
    .offset(params.offset)
    .all()
    .map((r) => ({
      ...r.client,
      quoteCount: r.quoteCount,
      invoiceCount: r.invoiceCount,
    }));

  return paged(rows, total, params);
}

export function getClient(id: number): Client | undefined {
  return db.select().from(clients).where(eq(clients.id, id)).get();
}

export type ClientDetail = {
  client: Client;
  quotes: Quote[];
  invoices: Invoice[];
};

export function getClientDetail(id: number): ClientDetail | undefined {
  const client = getClient(id);
  if (!client) return undefined;
  return {
    client,
    quotes: db
      .select()
      .from(quotes)
      .where(eq(quotes.clientId, id))
      .orderBy(desc(quotes.createdAt))
      .all(),
    invoices: db
      .select()
      .from(invoices)
      .where(eq(invoices.clientId, id))
      .orderBy(desc(invoices.createdAt))
      .all(),
  };
}

/** Lightweight list for select dropdowns. */
export function listClientOptions(): Pick<Client, "id" | "name" | "company">[] {
  return db
    .select({ id: clients.id, name: clients.name, company: clients.company })
    .from(clients)
    .orderBy(clients.name)
    .all();
}
