import "server-only";

import { asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  proformaItems,
  proformas,
  type Client,
  type Proforma,
  type ProformaItem,
} from "@/lib/db/schema";
import { paged, type ListParams, type Paged } from "./list-params";

export type ProformaListRow = Proforma & {
  clientName: string;
  clientCompany: string;
};

export const PROFORMA_SORT = {
  number: proformas.number,
  client: clients.name,
  issued: proformas.issueDate,
  total: proformas.total,
} as const;

export async function listProformas(
  params: ListParams,
): Promise<Paged<ProformaListRow>> {
  const col =
    (params.sort && PROFORMA_SORT[params.sort as keyof typeof PROFORMA_SORT]) ||
    proformas.createdAt;
  const orderBy = params.dir === "asc" ? asc(col) : desc(col);

  const total = (await db.select({ v: count() }).from(proformas).get())?.v ?? 0;
  const rows = (
    await db
      .select({
        proforma: proformas,
        clientName: clients.name,
        clientCompany: clients.company,
      })
      .from(proformas)
      .innerJoin(clients, eq(proformas.clientId, clients.id))
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset(params.offset)
      .all()
  ).map((r) => ({
    ...r.proforma,
    clientName: r.clientName,
    clientCompany: r.clientCompany,
  }));

  return paged(rows, total, params);
}

export type ProformaWithItems = {
  proforma: Proforma;
  client: Client;
  items: ProformaItem[];
};

export async function getProforma(
  id: number,
): Promise<ProformaWithItems | undefined> {
  const proforma = await db
    .select()
    .from(proformas)
    .where(eq(proformas.id, id))
    .get();
  if (!proforma) return undefined;
  const client = await db
    .select()
    .from(clients)
    .where(eq(clients.id, proforma.clientId))
    .get();
  if (!client) return undefined;
  const items = await db
    .select()
    .from(proformaItems)
    .where(eq(proformaItems.proformaId, id))
    .orderBy(proformaItems.sortOrder)
    .all();
  return { proforma, client, items };
}
