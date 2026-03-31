# Warehouse455

Next.js (App Router) + TypeScript student web app on top of an **operational database**, aligned with the chapter prompts (no auth; customer cookie; orders; **order_predictions**; Python scoring).

## Chapter / assignment alignment

| Prompt | Requirement | Where it lives |
|--------|----------------|----------------|
| **0** | Next.js App Router, `shop.db`, `better-sqlite3`, nav, README | `app/`, `lib/db.ts`, `lib/db-access.ts`, `schema.sql` |
| **0.5** | `/debug/schema` — tables + columns | `app/debug/schema/page.tsx` |
| **1** | `/select-customer`, searchable list, `customer_id` cookie, banner | `app/select-customer/`, `lib/customer.ts`, `app/layout.tsx` |
| **2** | `/dashboard` — name, email, order count, spend, 5 recent orders | `app/dashboard/page.tsx`, `lib/sql/queries.ts` |
| **3** | `/place-order`, transaction, `fulfilled=0`, `total_value` | `app/place-order/`, `app/actions/order.ts` |
| **4** | `/orders`, `/orders/[order_id]` line items | `app/orders/` |
| **5** | `/warehouse/priority` — **exact** SQLite SQL joining `order_predictions` | `SQL.warehousePriorityQueue` in `lib/sql/queries.ts` |
| **6** | `/scoring` runs `python jobs/run_inference.py`, stdout count, safe spawn | `lib/scoring/python-provider.ts`, `jobs/run_inference.py` |
| **7** | Errors, empty states, QA checklist (below) | pages + this README |

**Database contract (SQLite):** only `customers`, `orders`, `order_items`, `products`, `order_predictions` — defined in `schema.sql`. Do not add business tables for the assignment.

**Jupyter / full ML pipeline:** not required here. `jobs/run_inference.py` uses the same **placeholder** math as `lib/scoring/mock-provider.ts`; swap in your model later.

### Optional: Postgres / Supabase

If `DATABASE_URL` is set, the app uses `pg` and `lib/sql/postgres.ts` (alternate table/column names). The **chapter SQL** for the warehouse queue applies to **SQLite only**. Default scoring provider becomes **`mock`** so Node updates the DB the app actually reads.

---

## Supabase: connect and verify

Get the URI from Supabase: **Project Settings → Database → Connection string → URI**. Prefer the **Transaction pooler** (port **6543**) for Vercel/serverless.

You configure the same variable name in **two different places** — local vs deployed:

| Where | What to use | Notes |
|--------|-------------|--------|
| **Your laptop** | **`.env.local`** | Gitignored; **not** uploaded to GitHub or Vercel. Only for `npm run dev`. |
| **Vercel (production)** | **Dashboard env vars** | **Project → Settings → Environment Variables** → add **`DATABASE_URL`** → choose **Production** (and **Preview** if you want preview deploys to hit Supabase too) → **Save** → **Redeploy**. |

**You should not rely on `.env.local` for deployment.** Vercel never reads `.env.local` from the repo. If `DATABASE_URL` is only in `.env.local`, production builds will fall back to SQLite / missing `shop.db` and fail or behave wrong.

**Minimal Vercel setup**

1. Vercel → your project → **Settings** → **Environment Variables**
2. **Key:** `DATABASE_URL`  
   **Value:** full `postgresql://...pooler.supabase.com:6543/postgres` string (with password)
3. Environments: at least **Production**
4. Redeploy the latest deployment

**Local dev with Supabase:** copy that same URI into **`.env.local`** (optional `SCORING_PROVIDER=mock`), restart `npm run dev`. Remove `DATABASE_URL` from `.env.local` when you want **`shop.db`** again.

**Verify**

- **`/debug/schema`** — Postgres tables (e.g. `Customers`) vs SQLite names (`customers`)
- **`/select-customer`** — list loads without a red database banner

**Schema:** must match **`lib/sql/postgres.ts`** (quoted table names). Adjust SQL or your Supabase schema so they align.

**Note:** `NEXT_PUBLIC_SUPABASE_*` / service role keys are only for **`lib/supabase/*`**. The main app DB access uses **`DATABASE_URL`** + `pg`.

---

## Setup (official track: SQLite)

```bash
npm install
npm run db:init    # creates/overwrites shop.db at project root
cp .env.example .env.local   # optional
npm run dev
```

Open `http://localhost:3000`.

### Python for scoring (Prompt 6)

The app runs **`python jobs/run_inference.py`** by default when using SQLite. If your system only has `python3`:

```bash
export PYTHON_BIN=python3
```

Or use **`SCORING_PROVIDER=mock`** (Node writes `order_predictions` directly; no Python).

---

## Run / build

```bash
npm run dev
npm run build && npm start
```

---

## Manual QA checklist (chapter)

1. **Select customer** — `/select-customer`; banner shows selection.
2. **Place order** — `/place-order`; multiple line items; transaction.
3. **Order history** — `/orders` and `/orders/[order_id]` (wrong id → 404).
4. **Run scoring** — `/scoring` with **`SCORING_PROVIDER` unset** (SQLite): runs Python, prints `orders_scored`, no crash on failure.
5. **Priority queue** — `/warehouse/priority` shows rows after scoring (unfulfilled + `order_predictions`).
6. **Debug schema** — `/debug/schema` lists tables/columns for `shop.db`.

---

## Deploying on Vercel

Use **Next.js** preset; **Output Directory** empty (not `public`). See `vercel.json`.

SQLite on Vercel is limited (no durable file). For production, use hosted Postgres (`DATABASE_URL`) + `SCORING_PROVIDER=mock`, or run the app on a VM/Docker with `shop.db`.

---

## Where to plug in the real model

- **Python:** replace `mock_probability()` in `jobs/run_inference.py` and keep writing `order_predictions` keyed by `order_id`.
- **In-process:** `lib/scoring/mock-provider.ts` + `dbUpsertPredictions` in `lib/db-access.ts` (SQLite) or Postgres shipment path in `lib/sql/postgres.ts`.

---

## Project constraints

- No authentication: `customer_id` in HTTP-only cookie.
- No ORM: `better-sqlite3` (SQLite) or `pg` (Postgres) with prepared/parameterized SQL.
- Operational tables only for the assignment schema (see `schema.sql`).
