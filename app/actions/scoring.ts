"use server";

import { getDbState } from "@/lib/db";
import { tryGetScoringProvider } from "@/lib/scoring/provider";
import type { ScoringResult } from "@/lib/scoring/types";

export async function runScoringAction(): Promise<ScoringResult> {
  const dbState = getDbState();
  if (!dbState.ok) {
    return {
      ok: false,
      provider: "unavailable",
      timestamp: new Date().toISOString(),
      errorMessage: dbState.message,
    };
  }

  const picked = await tryGetScoringProvider();
  if (!picked.ok) {
    return {
      ok: false,
      provider: "unavailable",
      timestamp: new Date().toISOString(),
      errorMessage: picked.message,
    };
  }

  return picked.provider.scoreOpenOrders();
}
