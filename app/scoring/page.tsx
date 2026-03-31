import { getDbState } from "@/lib/db";
import { getScoringProviderLabel } from "@/lib/scoring/provider";

import { ScoringRunner } from "./scoring-runner";

export default function ScoringPage() {
  const state = getDbState();
  const label = getScoringProviderLabel();

  return (
    <section>
      <h1>Run scoring</h1>

      <div className="card">
        <p style={{ marginTop: 0 }}>
          Triggers the inference job (default: <span className="mono">python jobs/run_inference.py</span>
          ). With <span className="mono">shop.db</span>, the script writes{" "}
          <span className="mono">order_predictions</span>. Use{" "}
          <span className="mono">SCORING_PROVIDER=mock</span> if Python is not installed (e.g. some
          serverless hosts).
        </p>
        {state.ok && state.kind === "postgres" ? (
          <p className="muted">
            You are using Postgres: the Python script only updates SQLite{" "}
            <span className="mono">shop.db</span>. Use <span className="mono">SCORING_PROVIDER=mock</span>{" "}
            for scoring, or run inference against Postgres separately.
          </p>
        ) : null}
        <p style={{ marginBottom: 0 }}>
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
