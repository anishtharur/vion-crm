import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  quoteItems,
  quotes,
  type Client,
  type Quote,
  type QuoteItem,
} from "@/lib/db/schema";

export type QuoteListRow = Quote & { clientName: string; clientCompany: string };

export function listQuotes(): QuoteListRow[] {
  return db
    .select({
      quote: quotes,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(quotes)
    .innerJoin(clients, eq(quotes.clientId, clients.id))
    .orderBy(desc(quotes.createdAt))
    .all()
    .map((r) => ({ ...r.quote, clientName: r.clientName, clientCompany: r.clientCompany }));
}

export type QuoteWithItems = {
  quote: Quote;
  client: Client;
  items: QuoteItem[];
};

export function getQuote(id: number): QuoteWithItems | undefined {
  const quote = db.select().from(quotes).where(eq(quotes.id, id)).get();
  if (!quote) return undefined;
  const client = db.select().from(clients).where(eq(clients.id, quote.clientId)).get();
  if (!client) return undefined;
  const items = db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id))
    .orderBy(quoteItems.sortOrder)
    .all();
  return { quote, client, items };
}
