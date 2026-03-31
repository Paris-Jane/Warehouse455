import { dbWarehouseQueue } from "@/lib/db-access";
import { getDbState } from "@/lib/db";

type Row = {
  order_id: number;
  order_timestamp: string;
  total_value: number;
  fulfilled: number;
  customer_id: number;
  customer_name: string;
  late_delivery_probability: number;
  predicted_late_delivery: number;
  prediction_timestamp: string;
};

export default async function WarehousePriorityPage() {
  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <h1>Warehouse priority queue</h1>
        <p>{state.message}</p>
      </section>
    );
  }

  let rows: Row[] = [];
  try {
    rows = (await dbWarehouseQueue(state)) as Row[];
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (
      <section>
        <h1>Warehouse priority queue</h1>
        <p style={{ color: "var(--danger)" }}>
          Query failed. For Postgres adjust <span className="mono">lib/sql/postgres.ts</span>; for
          SQLite use the query in <span className="mono">lib/sql/queries.ts</span> (
          <span className="mono">warehousePriorityQueue</span>).{" "}
          <span className="mono">{message}</span>
        </p>
      </section>
    );
  }

  const sqliteCopy = (
    <>
      <p style={{ marginTop: 0 }}>
        This queue shows up to 50 <strong>unfulfilled</strong> orders that have rows in{" "}
        <span className="mono">order_predictions</span>, sorted by highest{" "}
        <span className="mono">late_delivery_probability</span> first, then oldest{" "}
        <span className="mono">order_timestamp</span>. It helps the warehouse ship the riskiest open
        orders first. The SQL matches the chapter spec (join <span className="mono">orders</span>,{" "}
        <span className="mono">customers</span>, <span className="mono">order_predictions</span>).
      </p>
      <p className="muted" style={{ marginBottom: 0 }}>
        If this is empty, run <strong>Run Scoring</strong> on <span className="mono">/scoring</span>{" "}
        so <span className="mono">jobs/run_inference.py</span> (or mock mode) fills{" "}
        <span className="mono">order_predictions</span>.
      </p>
    </>
  );

  const postgresCopy = (
    <>
      <p style={{ marginTop: 0 }}>
        This queue lists <strong>unfulfilled</strong> orders (no <span className="mono">Shipments</span>{" "}
        row with <span className="mono">ship_datetime</span> yet), using the latest shipment signal and{" "}
        <span className="mono">Orders.risk_score</span> as a fallback. This path is for optional
        Postgres/Supabase; the chapter assignment uses SQLite + <span className="mono">order_predictions</span>.
      </p>
      <p className="muted" style={{ marginBottom: 0 }}>
        Run scoring from <span className="mono">/scoring</span> (mock provider) to refresh shipment scores.
      </p>
    </>
  );

  return (
    <section>
      <h1>Warehouse priority queue</h1>

      <div className="card">
        {state.kind === "sqlite" ? sqliteCopy : postgresCopy}
      </div>

      {rows.length === 0 ? (
        <p className="muted">
          {state.kind === "sqlite"
            ? "No rows (need unfulfilled orders with matching order_predictions — run scoring first)."
            : "No unfulfilled orders in the queue."}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>order_id</th>
                <th>order_timestamp</th>
                <th>total_value</th>
                <th>fulfilled</th>
                <th>customer_id</th>
                <th>customer_name</th>
                <th>late_delivery_probability</th>
                <th>predicted_late_delivery</th>
                <th>prediction_timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.order_id}>
                  <td className="mono">{r.order_id}</td>
                  <td className="mono">{r.order_timestamp}</td>
                  <td>${r.total_value.toFixed(2)}</td>
                  <td>{r.fulfilled ? "yes" : "no"}</td>
                  <td className="mono">{r.customer_id}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.late_delivery_probability.toFixed(4)}</td>
                  <td>{r.predicted_late_delivery ? "yes" : "no"}</td>
                  <td className="mono">{r.prediction_timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
