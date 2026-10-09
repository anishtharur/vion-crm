import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";

import * as schema from "./schema";

/**
 * A single shared SQLite connection for the whole app. Next.js can re-evaluate
 * modules during development (HMR), so we cache the connection on globalThis to
 * avoid opening multiple handles to the same file.
 */
const globalForDb = globalThis as unknown as {
  __vionSqlite?: Database.Database;
};

function createConnection() {
  // Configurable via DATABASE_PATH so the same build runs against a local file in
  // dev and a mounted volume in prod (e.g. /data/vion.db on Railway) with no code
  // change — just the env var. Falls back to ./vion.db at the repo root.
  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "vion.db");
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

const sqlite = globalForDb.__vionSqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__vionSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { schema };
