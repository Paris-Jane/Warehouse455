# Implementation inputs — Supabase + Vercel

**Security:** Never commit real keys. This file must only contain placeholders in git. Put secrets in `.env.local` and Vercel only.

---

## 1. Deployment target

- [x] **Vercel project / URL:** warehouse455 — `https://warehouse455.vercel.app`
- [ ] **Git branch** that deploys to production (e.g. `main`): main
- [x] **Git repo:** `https://github.com/Paris-Jane/Warehouse455.git`
- [x] **Root directory in repo:** `/` (default)

---

## 2. Supabase connection (env only — not committed)

| Variable | Set in Vercel + `.env.local` |
|----------|------------------------------|
NEXT_PUBLIC_SUPABASE_URL=https://xrdlulvfhlcuouixvfxr.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_1BvRlO8HXc6F0cgc3IJBGA_HyO4aBmH

 or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable or anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role JWT (server only) |
| `DATABASE_URL` | **Required for option A (`pg`).** Supabase → Settings → Database → **URI** (use **Transaction pooler** for Vercel). |

---

## 3. Database driver preference

- [x] **A)** `pg` + `DATABASE_URL`

---

## 4. Table names in Postgres (`public` schema)

Quoted identifiers as in your database:

| App concept | Your table name (SQL) |
|-------------|------------------------|
| customers | `"Customers"` |
| products | `"Products"` |
| orders | `"Orders"` |
| order line items | `"Order Items"` |
| (extra) | `"Product Reviews"` |
| See gap below | **Shipments ≠ `order_predictions`** |

---

## 5. Your schema (reference)

### `"Customers"`

`customer_id`, `full_name`, `email`, … (no `first_name` / `last_name` — we will map e.g. split `full_name` or show one field)

### `"Products"`

`product_id`, `product_name`, `price`, …

### `"Orders"`

`order_id`, `customer_id`, `order_datetime`, `order_total`, … (**no `fulfilled`** in schema — needs a rule or new column)

### `"Order Items"`

`order_item_id`, `order_id`, `product_id`, `quantity`, `unit_price`, `line_total`

### `"Product Reviews"`

(Ignored for v1 unless you want features later)

### `"Shipments"`

`shipment_id`, `order_id`, … `late_delivery` — **not** the same as app’s `order_predictions` (one order can have multiple shipments; no `late_delivery_probability` / `prediction_timestamp` for scoring upsert)

---

## 6. Types / conventions (from your DDL)

- IDs: **bigint** PKs
- Order time: **`order_datetime`** (timestamptz)
- **No `fulfilled`** on Orders — **decision needed** (see gaps)
- Money: **double precision** (`price`, `order_total`, etc.)

---

## 7. Local dev

- [x] **Supabase for local + production**

---

## 8. Python job

- [ ] Not decided — pick one when implementing inference:
  - [ ] `DATABASE_URL` + `psycopg2`
  - [ ] Supabase Python client + service role
  - [ ] Not in scope yet

---

## 9. Auth / RLS

- [ ] **Decision needed** (recommended for this app: no login, server-only service role)

---

## 10. Anything else

(Add constraints here.)

---

# Outstanding before implementation (checklist)

Please reply with answers (no secrets):

1. **`DATABASE_URL`** — Paste is **not** needed in git; confirm you will add the **pooler** URI to Vercel + `.env.local`.

2. **`fulfilled` / open orders** — Your `"Orders"` table has no `fulfilled`. Choose one:
   - **A)** Add nullable `fulfilled boolean default false` (or `smallint`) to `"Orders"` via migration, **or**
   - **B)** Define “unfulfilled” as something else (e.g. no row in `"Shipments"`, or `is_fraud = ...`) — describe the rule.

3. **`order_predictions` vs `"Shipments"`** — Scoring + warehouse queue expect **one row per `order_id`** with `late_delivery_probability`, `predicted_late_delivery`, `prediction_timestamp`.  
   **Shipments** is shipment-level and has `late_delivery`, not probability. Choose one:
   - **A)** Create new table **`order_predictions`** in Supabase (recommended, matches current app), **or**
   - **B)** Change app to use **`"Shipments"`** only (we must define: latest shipment per order? how to compute “probability”?).

4. **Customer name** — OK to display **`full_name`** only (no split), or do you want **first / last** parsed from `full_name` (e.g. first token / remainder)?

5. **Git branch** for production deploys (e.g. `main`).

6. **Section 9** — Confirm: **no Supabase Auth**, all DB access on server with **service role**?

7. **Rotate Supabase keys** — Because keys appeared in an earlier commit/chat: Supabase Dashboard → **Settings → API** → reset **service_role** (and anon/publishable if you prefer).

---

When this is filled in (with secrets redacted in any file you commit), send it back to implement.
