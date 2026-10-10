import "server-only";

import { asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  orderItems,
  orders,
  type Client,
  type Order,
  type OrderItem,
} from "@/lib/db/schema";
import { paged, type ListParams, type Paged } from "./list-params";

export type OrderListRow = Order & {
  clientName: string;
  clientCompany: string;
};

export const ORDER_SORT = {
  number: orders.number,
  client: clients.name,
  issued: orders.issueDate,
  total: orders.total,
} as const;

export async function listOrders(
  params: ListParams,
): Promise<Paged<OrderListRow>> {
  const col =
    (params.sort && ORDER_SORT[params.sort as keyof typeof ORDER_SORT]) ||
    orders.createdAt;
  const orderBy = params.dir === "asc" ? asc(col) : desc(col);

  const total = (await db.select({ v: count() }).from(orders).get())?.v ?? 0;
  const rows = (
    await db
      .select({
        order: orders,
        clientName: clients.name,
        clientCompany: clients.company,
      })
      .from(orders)
      .innerJoin(clients, eq(orders.clientId, clients.id))
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset(params.offset)
      .all()
  ).map((r) => ({
    ...r.order,
    clientName: r.clientName,
    clientCompany: r.clientCompany,
  }));

  return paged(rows, total, params);
}

export type OrderWithItems = {
  order: Order;
  client: Client;
  items: OrderItem[];
};

export async function getOrder(
  id: number,
): Promise<OrderWithItems | undefined> {
  const order = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return undefined;
  const client = await db
    .select()
    .from(clients)
    .where(eq(clients.id, order.clientId))
    .get();
  if (!client) return undefined;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(orderItems.sortOrder)
    .all();
  return { order, client, items };
}
