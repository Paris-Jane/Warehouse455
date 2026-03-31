import "server-only";

import type { Database } from "better-sqlite3";

import { SQL } from "@/lib/sql/queries";

import type { PredictionInput, ScoringProvider, ScoringResult } from "./types";
import { upsertPredictions } from "./upsert-predictions";

type OpenOrderRow = {
  order_id: number;
  customer_id: number;
  order_timestamp: string;
  total_value: number;
  fulfilled: number;
};

/**
 * Deterministic placeholder scoring from order id, customer, total, and time string.
 * Replace this file's logic later; keep the provider boundary stable.
 */
function mockProbability(row: OpenOrderRow): number {
  const totalCents = Math.round(row.total_value * 100);
  let h =
    row.order_id * 374761 +
    row.customer_id * 66041 +
    totalCents * 104729;
  for (let i = 0; i < row.order_timestamp.length; i++) {
    h = (h + row.order_timestamp.charCodeAt(i) * (i + 1)) >>> 0;
  }
  const x = (h % 10000) / 10000;
  return Math.min(0.99, Math.max(0.01, x));
}

export function createMockScoringProvider(db: Database): ScoringProvider {
  return {
    key: "mock",
    async scoreOpenOrders(): Promise<ScoringResult> {
      const ts = new Date().toISOString();
      try {
        const rows = db.prepare(SQL.openOrdersForScoring).all() as OpenOrderRow[];
        const preds: PredictionInput[] = rows.map((r) => {
          const late_delivery_probability = mockProbability(r);
          const predicted_late_delivery: 0 | 1 =
            late_delivery_probability >= 0.5 ? 1 : 0;
          return {
            order_id: r.order_id,
            late_delivery_probability,
            predicted_late_delivery,
          };
        });

        upsertPredictions(db, preds);

        return {
          ok: true,
          provider: "mock",
          timestamp: ts,
          ordersScored: preds.length,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          provider: "mock",
          timestamp: ts,
          errorMessage: message,
        };
      }
    },
  };
}
