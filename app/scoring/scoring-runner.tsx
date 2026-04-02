"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { runScoringAction } from "@/app/actions/scoring";
import type { ScoringResult } from "@/lib/scoring/types";

export function ScoringRunner({ initialLabel }: { initialLabel: string }) {
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card card--flush" style={{ marginTop: "1.25rem" }}>
      <div className="card__header" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="card__title">Run inference</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            Env provider: <span className="mono">{initialLabel}</span>
          </p>
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
          {pending ? "Running…" : "Run scoring"}
        </button>
      </div>

      <div className="card__body">
        {!result ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Output and status appear here after each run. Open the warehouse queue when finished to see ranked
            orders.
          </p>
        ) : (
          <div>
            <div className="row" style={{ marginBottom: "0.75rem", alignItems: "center" }}>
              <span className={`status-pill ${result.ok ? "status-pill--shipped" : "status-pill--open"}`}>
                {result.ok ? "Success" : "Failure"}
              </span>
              <span className="pill mono">{result.provider}</span>
              <span className="pill mono">{result.timestamp}</span>
              {typeof result.ordersScored === "number" ? (
                <span className="pill mono">orders_scored={result.ordersScored}</span>
              ) : null}
            </div>

            {result.errorMessage ? (
              <p style={{ color: "var(--danger)", marginTop: 0, fontSize: "0.9rem" }}>{result.errorMessage}</p>
            ) : null}

            {result.ok ? (
              <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                <Link href="/warehouse/priority">View priority queue →</Link>
              </p>
            ) : null}

            {result.ok && result.fraudFlaggedOrders && result.fraudFlaggedOrders.length > 0 ? (
              <div className="field" style={{ marginTop: "1rem", marginBottom: 0 }}>
                <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                  Flagged as fraudulent (open orders, {result.fraudFlaggedOrders.length})
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>order_id</th>
                        <th>customer</th>
                        <th className="num">order_total</th>
                        <th className="num">fraud_probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.fraudFlaggedOrders.map((row) => (
                        <tr key={row.order_id}>
                          <td className="mono">{row.order_id}</td>
                          <td>{row.customer_name}</td>
                          <td className="num">${row.order_total.toFixed(2)}</td>
                          <td className="num">{row.fraud_probability.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {result.ok && result.fraudFlaggedOrders && result.fraudFlaggedOrders.length === 0 ? (
              <p className="muted" style={{ marginTop: "1rem", marginBottom: 0, fontSize: "0.9rem" }}>
                No open orders were flagged as fraudulent for this run.
              </p>
            ) : null}

            {result.stdoutPreview ? (
              <div className="field" style={{ marginTop: "1rem", marginBottom: 0 }}>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  stdout
                </div>
                <pre className="preview mono">{result.stdoutPreview}</pre>
              </div>
            ) : null}

            {result.stderrPreview ? (
              <div className="field" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  stderr
                </div>
                <pre className="preview mono">{result.stderrPreview}</pre>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
