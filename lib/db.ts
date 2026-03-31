import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const REQUIRED_TABLES = [
  "customers",
  "orders",
  "order_items",
  "products",
  "order_predictions",
] as const;

export type DbReady = { ok: true; db: Database };
export type DbNotReady =
  | { ok: false; reason: "missing_file"; message: string }
  | { ok: false; reason: "open_error"; message: string }
  | { ok: false; reason: "missing_table"; message: string };

export type DbState = DbReady | DbNotReady;

function shopDbPath(): string {
  return path.join(process.cwd(), "shop.db");
}

function listExistingTables(db: Database): string[] {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

let cached: DbState | null = null;

/**
 * Single shared DB handle for the Node server process.
 * Returns structured errors when the file or schema is not usable.
 */
export function getDbState(): DbState {
  if (cached) return cached;

  const file = shopDbPath();
  if (!fs.existsSync(file)) {
    cached = {
      ok: false,
      reason: "missing_file",
      message: `SQLite database not found at ${file}. Run: npm run db:init`,
    };
    return cached;
  }

  try {
    const db = new Database(file);
    db.pragma("foreign_keys = ON");

    const existing = new Set(listExistingTables(db));
    const missing = REQUIRED_TABLES.filter((t) => !existing.has(t));
    if (missing.length > 0) {
      db.close();
      cached = {
        ok: false,
        reason: "missing_table",
        message: `Missing required table(s): ${missing.join(", ")}`,
      };
      return cached;
    }

    cached = { ok: true, db };
    return cached;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    cached = {
      ok: false,
      reason: "open_error",
      message: `Could not open database: ${message}`,
    };
    return cached;
  }
}

export function getDbOrThrow(): Database {
  const s = getDbState();
  if (!s.ok) throw new Error(s.message);
  return s.db;
}
