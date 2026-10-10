import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import path from "node:path";

const sourceArgument = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (!sourceArgument || !databaseUrl) {
  console.error("Usage: npm run db:import -- <sqlite-backup-path>");
  console.error("Set DATABASE_URL and, for Turso, DATABASE_AUTH_TOKEN first.");
  process.exit(1);
}

const tables = [
  "settings",
  "clients",
  "quotes",
  "quote_items",
  "orders",
  "order_items",
  "proformas",
  "proforma_items",
  "invoices",
  "invoice_items",
  "payments",
];

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const sourcePath = path.resolve(sourceArgument);
const source = new Database(sourcePath, {
  readonly: true,
  fileMustExist: true,
});
const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

let transaction;

try {
  const sourceTables = source
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => row.name);
  const missingTables = tables.filter((table) => !sourceTables.includes(table));
  if (missingTables.length) {
    throw new Error(
      `Source database is missing tables: ${missingTables.join(", ")}`,
    );
  }

  transaction = await client.transaction("write");

  for (const table of tables) {
    const result = await transaction.execute(
      `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`,
    );
    if (Number(result.rows[0]?.count ?? 0) > 0) {
      throw new Error(
        `Destination table ${table} is not empty; refusing to import.`,
      );
    }
  }

  const imported = {};
  for (const table of tables) {
    const rows = source
      .prepare(`SELECT * FROM ${quoteIdentifier(table)}`)
      .all();
    imported[table] = rows.length;
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const insert = `INSERT INTO ${quoteIdentifier(table)} (${columns
      .map(quoteIdentifier)
      .join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;

    for (const row of rows) {
      await transaction.execute({
        sql: insert,
        args: columns.map((column) => row[column]),
      });
    }
  }

  await transaction.commit();
  console.log(`Imported ${sourcePath} into ${databaseUrl}:`);
  for (const [table, count] of Object.entries(imported)) {
    console.log(`  ${table}: ${count}`);
  }
} catch (error) {
  if (transaction) await transaction.rollback();
  throw error;
} finally {
  source.close();
  client.close();
}
