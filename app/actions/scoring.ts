"use server";

import { runScoringWithFlaggedOrders } from "@/lib/scoring/run-scoring";
import type { ScoringResult } from "@/lib/scoring/types";

export async function runScoringAction(): Promise<ScoringResult> {
  return runScoringWithFlaggedOrders();
}
