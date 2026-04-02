-- Optional Supabase / Postgres: scoring writes to this table (aligned with SQLite order_predictions).
-- Run in SQL editor if your project only had Shipments + Orders before.

CREATE TABLE IF NOT EXISTS "order_predictions" (
  order_id INTEGER PRIMARY KEY REFERENCES "Orders" (order_id) ON DELETE CASCADE,
  late_delivery_probability DOUBLE PRECISION NOT NULL DEFAULT 0,
  predicted_late_delivery INTEGER NOT NULL DEFAULT 0 CHECK (predicted_late_delivery IN (0, 1)),
  fraud_probability DOUBLE PRECISION NOT NULL DEFAULT 0,
  predicted_fraud INTEGER NOT NULL DEFAULT 0 CHECK (predicted_fraud IN (0, 1)),
  prediction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
