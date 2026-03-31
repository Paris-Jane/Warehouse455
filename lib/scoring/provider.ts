import "server-only";

import { getDbOrThrow, getDbState } from "@/lib/db";

import { createMockScoringProvider } from "./mock-provider";
import { createPythonScriptScoringProvider } from "./python-provider";
import type { ScoringProvider } from "./types";

function envProviderKey(): string {
  const raw = process.env.SCORING_PROVIDER?.trim().toLowerCase();
  if (raw === "python") return "python";
  return "mock";
}

/**
 * Factory for the active scoring implementation.
 * UI and routes should depend on this, not on concrete providers.
 */
export function getScoringProvider(): ScoringProvider {
  const key = envProviderKey();
  const db = getDbOrThrow();

  if (key === "python") {
    return createPythonScriptScoringProvider();
  }

  return createMockScoringProvider(db);
}

export function getScoringProviderLabel(): string {
  return envProviderKey();
}

/**
 * Used by the scoring page when the DB is unavailable.
 */
export function tryGetScoringProvider():
  | { ok: true; provider: ScoringProvider; label: string }
  | { ok: false; message: string } {
  const state = getDbState();
  if (!state.ok) {
    return { ok: false, message: state.message };
  }
  return {
    ok: true,
    provider: getScoringProvider(),
    label: getScoringProviderLabel(),
  };
}
