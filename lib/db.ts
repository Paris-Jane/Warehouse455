import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { Database } from "better-sqlite3";
import DatabaseConstructor from "better-sqlite3";
import { Pool } from "pg";

const SQLITE_TABLES = [
  "customers",
  "orders",
  "order_items",
  "products",
  "order_predictions",
] as const;

export type DbReadySqlite = { ok: true; kind: "sqlite"; db: Database };
export type DbReadyPostgres = { ok: true; kind: "postgres"; pool: Pool };
export type DbReady = DbReadySqlite | DbReadyPostgres;

export type DbNotReady =
  | { ok: false; reason: "missing_file"; message: string }
  | { ok: false; reason: "open_error"; message: string }
  | { ok: false; reason: "missing_table"; message: string };

export type DbState = DbReady | DbNotReady;

function shopDbPath(): string {
  return path.join(process.cwd(), "shop.db");
}

function listExistingSqliteTables(db: Database): string[] {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

let cached: DbState | null = null;
let pgPool: Pool | null = null;

function getOrCreatePgPool(): Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!pgPool) {
    pgPool = new Pool({ connectionString: url, max: 8 });
  }
  return pgPool;
}

/**
 * When `DATABASE_URL` is set, uses Supabase/Postgres (pg pool).
 * Otherwise uses SQLite `shop.db` (local dev / legacy).
 */
export function getDbState(): DbState {
  if (cached) return cached;

  if (process.env.DATABASE_URL?.trim()) {
    try {
      const pool = getOrCreatePgPool();
      cached = { ok: true, kind: "postgres", pool };
      return cached;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      cached = {
        ok: false,
        reason: "open_error",
        message: `Postgres pool error: ${message}`,
      };
      return cached;
    }
  }

  const file = shopDbPath();
  if (!fs.existsSync(file)) {
    cached = {
      ok: false,
      reason: "missing_file",
      message: `SQLite database not found at ${file}. Run: npm run db:init — or set DATABASE_URL for Supabase.`,
    };
    return cached;
  }

  try {
    const db = new DatabaseConstructor(file);
    db.pragma("foreign_keys = ON");

    const existing = new Set(listExistingSqliteTables(db));
    const missing = SQLITE_TABLES.filter((t) => !existing.has(t));
    if (missing.length > 0) {
      db.close();
      cached = {
        ok: false,
        reason: "missing_table",
        message: `Missing required table(s): ${missing.join(", ")}`,
      };
      return cached;
    }

    cached = { ok: true, kind: "sqlite", db };
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

export function getDbReadyOrThrow(): DbReady {
  const s = getDbState();
  if (!s.ok) throw new Error(s.message);
  return s;
}

/** @deprecated Use getDbReadyOrThrow(); sqlite-only callers should branch on kind. */
export function getDbOrThrow(): Database {
  const s = getDbState();
  if (!s.ok) throw new Error(s.message);
  if (s.kind !== "sqlite") {
    throw new Error("getDbOrThrow() is SQLite-only; use DATABASE_URL unset or branch on db kind.");
  }
  return s.db;
}
