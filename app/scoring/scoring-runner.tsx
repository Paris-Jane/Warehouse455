"use client";

import { useState, useTransition } from "react";

import { runScoringAction } from "@/app/actions/scoring";
import type { ScoringResult } from "@/lib/scoring/types";

export function ScoringRunner({ initialLabel }: { initialLabel: string }) {
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="muted" style={{ margin: 0 }}>
          Server provider label (from env): <span className="mono">{initialLabel}</span>
        </div>
        <button
          type="button"
          className="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await runScoringAction();
              setResult(r);
            })
          }
        >
          {pending ? "Running…" : "Run Scoring"}
        </button>
      </div>

      {!result ? (
        <p className="muted" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
          Run scoring to populate or refresh <span className="mono">order_predictions</span>, then
          check the warehouse priority queue.
        </p>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          <div className="row" style={{ marginBottom: "0.65rem" }}>
            <span className="pill">{result.ok ? "success" : "failure"}</span>
            <span className="pill mono">provider={result.provider}</span>
            <span className="pill mono">ts={result.timestamp}</span>
            {typeof result.ordersScored === "number" ? (
              <span className="pill mono">orders_scored={result.ordersScored}</span>
            ) : null}
          </div>

          {result.errorMessage ? (
            <p style={{ color: "var(--danger)", marginTop: 0 }}>{result.errorMessage}</p>
          ) : null}

          {result.stdoutPreview ? (
            <div className="field" style={{ marginTop: "0.75rem" }}>
              <div className="muted">stdout preview</div>
              <pre className="preview mono">{result.stdoutPreview}</pre>
            </div>
          ) : null}

          {result.stderrPreview ? (
            <div className="field" style={{ marginTop: "0.75rem" }}>
              <div className="muted">stderr preview</div>
              <pre className="preview mono">{result.stderrPreview}</pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
