import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { Database } from "better-sqlite3";
import { Pool } from "pg";

/**
 * Do not statically import `better-sqlite3`: it is a native addon and crashes many
 * serverless runtimes (e.g. Vercel) when loaded even if DATABASE_URL points at Postgres.
 */
function openSqliteDatabase(file: string): Database {
  type BetterSqliteCtor = new (path: string) => Database;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite = require("better-sqlite3") as BetterSqliteCtor;
  const db = new BetterSqlite(file);
  db.pragma("foreign_keys = ON");
  return db;
}

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

/** Drop sslmode from URI so `pg` does not force verify-full (breaks on Vercel with Supabase pooler). */
function stripSslModeQueryParam(connectionUrl: string): string {
  const q = connectionUrl.indexOf("?");
  if (q === -1) return connectionUrl;
  const base = connectionUrl.slice(0, q);
  const rest = connectionUrl.slice(q + 1);
  const params = rest.split("&").filter((p) => !/^sslmode=/i.test(p.trim()));
  return params.length > 0 ? `${base}?${params.join("&")}` : base;
}

function getOrCreatePgPool(): Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!pgPool) {
    const isSupabase = /\.supabase\.co/i.test(url);
    const connectionString = isSupabase ? stripSslModeQueryParam(url) : url;
    // Vercel + Supabase: strict CA verify often yields SELF_SIGNED_CERT_IN_CHAIN; keep TLS, skip chain verify.
    pgPool = new Pool({
      connectionString,
      max: 8,
      ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
    });
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
    const db = openSqliteDatabase(file);

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
