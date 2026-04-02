import Link from "next/link";

import { getDbState } from "@/lib/db";
import { getScoringProviderLabel } from "@/lib/scoring/provider";

import { ScoringRunner } from "./scoring-runner";

export default function ScoringPage() {
  const state = getDbState();
  const label = getScoringProviderLabel();

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">Run scoring</h1>
        <p className="page-desc">
          Run the fraud model so <span className="mono">order_predictions</span> gets{" "}
          <span className="mono">fraud_probability</span> and <span className="mono">predicted_fraud</span> for
          open orders. Output below includes every order flagged as fraudulent after a successful run.
        </p>
      </header>

      <div className="card">
        <h2 className="card__title" style={{ marginTop: 0 }}>
          How it works
        </h2>
        <ul className="muted" style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", fontSize: "0.9rem" }}>
          <li>
            <strong>Python</strong> (default without <span className="mono">DATABASE_URL</span>): runs{" "}
            <span className="mono">python jobs/run_inference.py</span> using <span className="mono">model/fraud_model.sav</span>{" "}
            (train with <span className="mono">model/fraud_ml_pipeline.ipynb</span>).
          </li>
          <li>
            <strong>Mock</strong> (default with <span className="mono">DATABASE_URL</span>, or set{" "}
            <span className="mono">SCORING_PROVIDER=mock</span>): deterministic fraud scores in SQLite or Postgres.
          </li>
          <li>
            After a successful run, open the{" "}
            <Link href="/warehouse/priority">priority queue</Link> for ranked open orders and fraud scores.
          </li>
        </ul>
        <p style={{ marginBottom: 0, marginTop: "1rem", fontSize: "0.9rem" }}>
          Active provider: <span className="pill mono">{label}</span>
        </p>
      </div>

      {!state.ok ? (
        <p>{state.message}</p>
      ) : (
        <ScoringRunner initialLabel={label} />
      )}
    </section>
  );
}
