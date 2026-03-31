import "server-only";

import { getDbReadyOrThrow, getDbState } from "@/lib/db";

import { createMockScoringProvider } from "./mock-provider";
import { createPythonScriptScoringProvider } from "./python-provider";
import type { ScoringProvider } from "./types";

/**
 * Course default with SQLite: `python` runs `jobs/run_inference.py` → `order_predictions`.
 * With `DATABASE_URL` (Postgres), default is `mock` because the Python script only writes `shop.db`.
 * Override anytime with SCORING_PROVIDER=mock | python.
 */
function envProviderKey(): string {
  const raw = process.env.SCORING_PROVIDER?.trim().toLowerCase();
  if (raw === "mock") return "mock";
  if (raw === "python") return "python";
  if (process.env.DATABASE_URL?.trim()) return "mock";
  return "python";
}

export function getScoringProviderLabel(): string {
  return envProviderKey();
}

export async function getScoringProvider(): Promise<ScoringProvider> {
  const key = envProviderKey();
  const ready = getDbReadyOrThrow();

  if (key === "python") {
    return createPythonScriptScoringProvider();
  }

  return createMockScoringProvider(ready);
}

export async function tryGetScoringProvider(): Promise<
  | { ok: true; provider: ScoringProvider; label: string }
  | { ok: false; message: string }
> {
  const state = getDbState();
  if (!state.ok) {
    return { ok: false, message: state.message };
  }
  return {
    ok: true,
    provider: await getScoringProvider(),
    label: getScoringProviderLabel(),
  };
}
