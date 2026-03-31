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
          Scoring is executed through a provider selected by{" "}
          <span className="mono">SCORING_PROVIDER</span>. The UI does not embed model logic.
        </p>
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
