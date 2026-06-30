import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clients,
  orderItems,
  orders,
  type Client,
  type Order,
  type OrderItem,
} from "@/lib/db/schema";

export type OrderListRow = Order & { clientName: string; clientCompany: string };

export function listOrders(): OrderListRow[] {
  return db
    .select({
      order: orders,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(orders)
    .innerJoin(clients, eq(orders.clientId, clients.id))
    .orderBy(desc(orders.createdAt))
    .all()
    .map((r) => ({ ...r.order, clientName: r.clientName, clientCompany: r.clientCompany }));
}

export type OrderWithItems = {
  order: Order;
  client: Client;
  items: OrderItem[];
};

export function getOrder(id: number): OrderWithItems | undefined {
  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return undefined;
  const client = db.select().from(clients).where(eq(clients.id, order.clientId)).get();
  if (!client) return undefined;
  const items = db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(orderItems.sortOrder)
    .all();
  return { order, client, items };
}
