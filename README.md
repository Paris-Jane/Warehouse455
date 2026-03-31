# Warehouse455

Next.js (App Router) + TypeScript + SQLite (`better-sqlite3`) demo for a warehouse operations UI with a **prediction provider** boundary. The app works end-to-end **without** a real ML model by using a mock scorer that writes rows into `order_predictions`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure `shop.db` exists at the project root.

- If you do not already have one, generate it from the bundled schema + seed:

```bash
npm run db:init
```

**Warning:** `npm run db:init` overwrites `shop.db` if it already exists.

3. (Optional) Copy environment defaults:

```bash
cp .env.example .env.local
```

## Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

Production build:

```bash
npm run build
npm start
```

## Switch scoring providers

Set `SCORING_PROVIDER` in `.env.local` (or your shell environment):

- `mock` (default): deterministic placeholder probabilities for all **unfulfilled** orders; upserts into `order_predictions`.
- `python`: runs `python jobs/run_inference.py` from the project root with a timeout and captures stdout/stderr. The stub script does **not** write predictions yet; implement that in Python when your pipeline is ready.

Example:

```bash
SCORING_PROVIDER=mock npm run dev
SCORING_PROVIDER=python npm run dev
```

On macOS, if `python` is not on your PATH, symlink it or adjust your environment; the app invokes exactly `python` as specified in the project requirements.

## Where to plug in the real model later

Replace or extend **only the scoring provider implementations** — not routes, not SQL consumers:

- **Mock logic (swap first):** `lib/scoring/mock-provider.ts` — today’s placeholder math + call to `upsertPredictions`.
- **Python adapter:** `jobs/run_inference.py` — run inference and **write** `order_predictions` rows in `shop.db` (or call another service). Keep stdout/stderr useful for debugging.
- **Future adapters:** add e.g. `lib/scoring/http-provider.ts` and branch in `lib/scoring/provider.ts`.
- **Shared DB write path:** `lib/scoring/upsert-predictions.ts` + SQL in `lib/sql/queries.ts` (`upsertPrediction`).

Pages such as `/scoring` call `runScoringAction()` → `getScoringProvider()` → `scoreOpenOrders()`; the warehouse queue reads predictions with SQL in `lib/sql/queries.ts`.

## Manual QA checklist

- Select a customer on `/select-customer`; confirm cookie-backed banner updates.
- Place an order on `/place-order` with multiple lines; confirm `/orders` shows it and totals look right.
- Open `/orders/[order_id]` and verify line items and ownership (wrong id → 404).
- Run **Run Scoring** on `/scoring` in **mock** mode; confirm `/warehouse/priority` populates for unfulfilled orders with predictions.
- Switch `SCORING_PROVIDER=python`, run scoring, confirm the script output appears in the result panel and the app still loads the same routes without UI changes.
- Visit `/debug/schema` and confirm tables match expectations.

## Project constraints (reminder)

- No authentication: customer is chosen and stored as `customer_id` in an HTTP-only cookie (`customer_id`).
- No ORM: prepared statements via `better-sqlite3`.
- Operational tables only: `customers`, `orders`, `order_items`, `products`, `order_predictions`.
