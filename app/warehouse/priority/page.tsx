import { dbWarehouseQueue, type WarehouseRow } from "@/lib/db-access";
import { formatDateTime } from "@/lib/format";
import { getDbState } from "@/lib/db";

export default async function WarehousePriorityPage() {
  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <header className="page-header">
          <h1 className="page-title">Warehouse priority queue</h1>
        </header>
        <p>{state.message}</p>
      </section>
    );
  }

  let rows: WarehouseRow[] = [];
  try {
    rows = await dbWarehouseQueue(state);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (
      <section>
        <header className="page-header">
          <h1 className="page-title">Warehouse priority queue</h1>
        </header>
        <div className="alert alert--error">
          Query failed ({message}). For Postgres ensure <span className="mono">order_predictions</span> exists
          (see <span className="mono">sql/postgres_order_predictions.sql</span>) and table names match{" "}
          <span className="mono">lib/sql/postgres.ts</span>.
        </div>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">Late delivery priority queue</h1>
        <p className="page-desc">
          Up to <strong>50</strong> orders that are still <strong>open</strong> (no row in{" "}
          <span className="mono">shipments</span> / <span className="mono">Shipments</span> yet), ranked by
          model output in <span className="mono">order_predictions</span>. Rows without a prediction sort to
          the bottom until you run scoring. <span className="mono">Shipments.late_delivery</span> is operational
          data and is not treated as a probability score.
        </p>
      </header>

      <div className="card">
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          Use <strong>Run Scoring</strong> to populate or refresh <span className="mono">order_predictions</span>{" "}
          (SQLite: <span className="mono">jobs/run_inference.py</span> or mock provider; Postgres: mock provider
          writes the same table).
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="muted">
          No open orders in the queue. Orders disappear here once they have at least one shipment, or there are
          no rows yet.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>order_id</th>
                <th>order_datetime</th>
                <th className="num">order_total</th>
                <th>customer</th>
                <th>Prediction</th>
                <th className="num">late_delivery_probability</th>
                <th>predicted_late_delivery</th>
                <th>prediction_timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.order_id}>
                  <td className="mono">{r.order_id}</td>
                  <td>{formatDateTime(r.order_datetime)}</td>
                  <td className="num">${r.order_total.toFixed(2)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.customer_name}</div>
                    <div className="muted mono" style={{ fontSize: "0.8rem" }}>
                      id {r.customer_id}
                    </div>
                  </td>
                  <td>
                    {r.has_prediction ? (
                      <span className="status-pill status-pill--shipped">Scored</span>
                    ) : (
                      <span className="status-pill status-pill--open">Pending</span>
                    )}
                  </td>
                  <td className="num">
                    {r.has_prediction ? r.late_delivery_probability.toFixed(4) : "—"}
                  </td>
                  <td>
                    {r.has_prediction ? (r.predicted_late_delivery ? "yes" : "no") : "—"}
                  </td>
                  <td className="mono" style={{ fontSize: "0.8rem" }}>
                    {r.has_prediction && r.prediction_timestamp
                      ? formatDateTime(r.prediction_timestamp)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
