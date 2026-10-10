import "server-only";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const localDatabasePath = process.env.DATABASE_PATH ?? "./vion.db";
const localDatabaseUrl = /^[a-z]:[\\/]/i.test(localDatabasePath)
  ? `file:///${localDatabasePath.replaceAll("\\", "/")}`
  : `file:${localDatabasePath}`;
const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl;

const globalForDb = globalThis as typeof globalThis & {
  __vionLibsqlClient?: ReturnType<typeof createClient>;
};

const client =
  globalForDb.__vionLibsqlClient ??
  createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__vionLibsqlClient = client;
}

export const db = drizzle({ client, schema });
export { schema };
