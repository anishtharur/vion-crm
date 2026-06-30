import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  proformaItems,
  proformas,
  type Client,
  type Proforma,
  type ProformaItem,
} from "@/lib/db/schema";

export type ProformaListRow = Proforma & {
  clientName: string;
  clientCompany: string;
};

export function listProformas(): ProformaListRow[] {
  return db
    .select({
      proforma: proformas,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(proformas)
    .innerJoin(clients, eq(proformas.clientId, clients.id))
    .orderBy(desc(proformas.createdAt))
    .all()
    .map((r) => ({
      ...r.proforma,
      clientName: r.clientName,
      clientCompany: r.clientCompany,
    }));
}

export type ProformaWithItems = {
  proforma: Proforma;
  client: Client;
  items: ProformaItem[];
};

export function getProforma(id: number): ProformaWithItems | undefined {
  const proforma = db.select().from(proformas).where(eq(proformas.id, id)).get();
  if (!proforma) return undefined;
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, proforma.clientId))
    .get();
  if (!client) return undefined;
  const items = db
    .select()
    .from(proformaItems)
    .where(eq(proformaItems.proformaId, id))
    .orderBy(proformaItems.sortOrder)
    .all();
  return { proforma, client, items };
}
