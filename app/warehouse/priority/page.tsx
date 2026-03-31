import { getDbState } from "@/lib/db";
import { SQL } from "@/lib/sql/queries";

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

export default function WarehousePriorityPage() {
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
    rows = state.db.prepare(SQL.warehousePriorityQueue).all() as Row[];
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (
      <section>
        <h1>Warehouse priority queue</h1>
        <p style={{ color: "var(--danger)" }}>
          Query failed. If your real schema differs, update{" "}
          <span className="mono">lib/sql/queries.ts</span>.{" "}
          <span className="mono">{message}</span>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Warehouse priority queue</h1>

      <div className="card">
        <p style={{ marginTop: 0 }}>
          This queue ranks <strong>unfulfilled</strong> orders by highest predicted late-delivery risk
          first, then oldest orders first. It exists so the warehouse can ship the riskiest open orders
          sooner while predictions are still operational data in{" "}
          <span className="mono">order_predictions</span>.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          If the table is empty, run scoring from <span className="mono">/scoring</span> (mock mode
          writes placeholder predictions for open orders).
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="muted">
          No rows returned. Either there are no unfulfilled orders with predictions yet, or the join
          returned nothing.
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
