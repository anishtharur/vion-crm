import "server-only";

import { asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  quoteItems,
  quotes,
  type Client,
  type Quote,
  type QuoteItem,
} from "@/lib/db/schema";
import { paged, type ListParams, type Paged } from "./list-params";

export type QuoteListRow = Quote & {
  clientName: string;
  clientCompany: string;
};

export const QUOTE_SORT = {
  number: quotes.number,
  client: clients.name,
  issued: quotes.issueDate,
  total: quotes.total,
} as const;

export async function listQuotes(
  params: ListParams,
): Promise<Paged<QuoteListRow>> {
  const col =
    (params.sort && QUOTE_SORT[params.sort as keyof typeof QUOTE_SORT]) ||
    quotes.createdAt;
  const orderBy = params.dir === "asc" ? asc(col) : desc(col);

  const total = (await db.select({ v: count() }).from(quotes).get())?.v ?? 0;
  const rows = (
    await db
      .select({
        quote: quotes,
        clientName: clients.name,
        clientCompany: clients.company,
      })
      .from(quotes)
      .innerJoin(clients, eq(quotes.clientId, clients.id))
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset(params.offset)
      .all()
  ).map((r) => ({
    ...r.quote,
    clientName: r.clientName,
    clientCompany: r.clientCompany,
  }));

  return paged(rows, total, params);
}

export type QuoteWithItems = {
  quote: Quote;
  client: Client;
  items: QuoteItem[];
};

export async function getQuote(
  id: number,
): Promise<QuoteWithItems | undefined> {
  const quote = await db.select().from(quotes).where(eq(quotes.id, id)).get();
  if (!quote) return undefined;
  const client = await db
    .select()
    .from(clients)
    .where(eq(clients.id, quote.clientId))
    .get();
  if (!client) return undefined;
  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id))
    .orderBy(quoteItems.sortOrder)
    .all();
  return { quote, client, items };
}
