import "server-only";

import type { Database } from "better-sqlite3";

import { SQL } from "@/lib/sql/queries";

import type { PredictionInput } from "./types";

export function upsertPredictionsSqlite(db: Database, predictions: PredictionInput[]) {
  const stmt = db.prepare(SQL.upsertPrediction);
  const run = db.transaction((rows: PredictionInput[]) => {
    for (const p of rows) {
      stmt.run(
        p.order_id,
        p.late_delivery_probability,
        p.predicted_late_delivery,
        p.fraud_probability,
        p.predicted_fraud
      );
    }
  });
  run(predictions);
}
