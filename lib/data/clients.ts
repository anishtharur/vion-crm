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

export async function listClients(
  params: ListParams,
): Promise<Paged<ClientListRow>> {
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
        : (params.sort &&
            CLIENT_SORT[params.sort as keyof typeof CLIENT_SORT]) ||
          clients.createdAt;
  const orderBy = params.dir === "asc" ? asc(col) : desc(col);

  const total =
    (await db.select({ v: count() }).from(clients).where(where).get())?.v ?? 0;
  const rows = (
    await db
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
  ).map((r) => ({
    ...r.client,
    quoteCount: r.quoteCount,
    invoiceCount: r.invoiceCount,
  }));

  return paged(rows, total, params);
}

export async function getClient(id: number): Promise<Client | undefined> {
  return db.select().from(clients).where(eq(clients.id, id)).get();
}

export type ClientDetail = {
  client: Client;
  quotes: Quote[];
  invoices: Invoice[];
};

export async function getClientDetail(
  id: number,
): Promise<ClientDetail | undefined> {
  const client = await getClient(id);
  if (!client) return undefined;
  return {
    client,
    quotes: await db
      .select()
      .from(quotes)
      .where(eq(quotes.clientId, id))
      .orderBy(desc(quotes.createdAt))
      .all(),
    invoices: await db
      .select()
      .from(invoices)
      .where(eq(invoices.clientId, id))
      .orderBy(desc(invoices.createdAt))
      .all(),
  };
}

/** Lightweight list for select dropdowns. */
export async function listClientOptions(): Promise<
  Pick<Client, "id" | "name" | "company">[]
> {
  return db
    .select({ id: clients.id, name: clients.name, company: clients.company })
    .from(clients)
    .orderBy(clients.name)
    .all();
}
