import "server-only";

import { getDbReadyOrThrow, getDbState } from "@/lib/db";
import { dbFraudFlaggedOpenOrders } from "@/lib/db-access";

import { tryGetScoringProvider } from "./provider";
import type { ScoringResult } from "./types";

/**
 * Runs the configured scoring provider and returns open orders flagged as fraud
 * (`predicted_fraud = 1`) from `order_predictions` after a successful run.
 */
export async function runScoringWithFlaggedOrders(): Promise<ScoringResult> {
  const ts = new Date().toISOString();
  const dbState = getDbState();
  if (!dbState.ok) {
    return {
      ok: false,
      provider: "unavailable",
      timestamp: ts,
      errorMessage: dbState.message,
    };
  }

  const picked = await tryGetScoringProvider();
  if (!picked.ok) {
    return {
      ok: false,
      provider: "unavailable",
      timestamp: ts,
      errorMessage: picked.message,
    };
  }

  const result = await picked.provider.scoreOpenOrders();
  if (!result.ok) {
    return result;
  }

  try {
    const ready = getDbReadyOrThrow();
    const fraudFlaggedOrders = await dbFraudFlaggedOpenOrders(ready);
    return { ...result, fraudFlaggedOrders };
  } catch {
    return result;
  }
}
