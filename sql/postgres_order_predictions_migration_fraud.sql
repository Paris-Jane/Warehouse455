-- If you already created order_predictions without fraud columns, run:

ALTER TABLE order_predictions
  ADD COLUMN IF NOT EXISTS fraud_probability DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE order_predictions
  ADD COLUMN IF NOT EXISTS predicted_fraud INTEGER NOT NULL DEFAULT 0;

-- Optional: tighten check constraints after backfill (Postgres 12+):
-- ALTER TABLE order_predictions DROP CONSTRAINT IF EXISTS order_predictions_predicted_fraud_check;
-- ALTER TABLE order_predictions ADD CONSTRAINT order_predictions_predicted_fraud_check CHECK (predicted_fraud IN (0, 1));
