import "server-only";

import { desc, eq, like, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  invoices,
  quotes,
  type Client,
  type Invoice,
  type Quote,
} from "@/lib/db/schema";

export type ClientListRow = Client & {
  quoteCount: number;
  invoiceCount: number;
};

export function listClients(search?: string): ClientListRow[] {
  const term = search?.trim();
  const base = db
    .select({
      client: clients,
      quoteCount: sql<number>`(SELECT COUNT(*) FROM ${quotes} WHERE ${quotes.clientId} = ${clients.id})`,
      invoiceCount: sql<number>`(SELECT COUNT(*) FROM ${invoices} WHERE ${invoices.clientId} = ${clients.id})`,
    })
    .from(clients);

  const rows = (
    term
      ? base.where(
          or(
            like(clients.name, `%${term}%`),
            like(clients.company, `%${term}%`),
            like(clients.email, `%${term}%`),
          ),
        )
      : base
  )
    .orderBy(desc(clients.createdAt))
    .all();

  return rows.map((r) => ({
    ...r.client,
    quoteCount: r.quoteCount,
    invoiceCount: r.invoiceCount,
  }));
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
