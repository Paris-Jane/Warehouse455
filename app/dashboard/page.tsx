import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import { formatDateTime } from "@/lib/format";
import {
  dbCustomerOrderStats,
  dbCustomerRecentOrders,
  type OrderSummaryRow,
} from "@/lib/db-access";
import { getDbState } from "@/lib/db";

function fulfillmentLabel(shipmentCount: number): { text: string; shipped: boolean } {
  if (shipmentCount > 0) return { text: "Shipped", shipped: true };
  return { text: "Open", shipped: false };
}

export default async function DashboardPage() {
  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <header className="page-header">
          <h1 className="page-title">Customer dashboard</h1>
        </header>
        <p>{state.message}</p>
      </section>
    );
  }

  const session = await getSelectedCustomer(state);
  if (session.status === "none" || session.status === "invalid_cookie") {
    redirect("/select-customer");
  }

  const customer = session.customer;
  const stats = await dbCustomerOrderStats(state, customer.customer_id);
  const recent = await dbCustomerRecentOrders(state, customer.customer_id);

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">Customer overview</h1>
        <p className="page-desc">
          Summary and shortcuts for the currently selected customer. Order totals and shipment status
          come from your operational tables (<span className="mono">Orders</span>,{" "}
          <span className="mono">Shipments</span>).
        </p>
      </header>

      <div className="card">
        <h2 className="card__title" style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>
          Selected customer
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <strong style={{ fontSize: "1.1rem" }}>{customer.full_name}</strong>
          <span className="muted">{customer.email}</span>
          <span className="badge-mono" style={{ alignSelf: "flex-start", marginTop: "0.35rem" }}>
            customer_id {customer.customer_id}
          </span>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card__label">Total orders</div>
            <div className="stat-card__value">{stats.order_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Total spend</div>
            <div className="stat-card__value">${stats.total_spend.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Most recent order</div>
            <div className="stat-card__value" style={{ fontSize: "0.95rem", fontWeight: 600 }}>
              {stats.last_order_datetime
                ? formatDateTime(stats.last_order_datetime)
                : "—"}
            </div>
          </div>
        </div>

        <div className="actions-row">
          <Link href="/place-order" className="button primary">
            Place new order
          </Link>
          <Link href="/orders" className="button">
            View order history
          </Link>
        </div>
      </div>

      <h2 className="section-title">Recent orders</h2>
      {recent.length === 0 ? (
        <p className="muted">No orders yet for this customer.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order date</th>
                <th className="num">Items</th>
                <th>Status</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {(recent as OrderSummaryRow[]).map((o) => {
                const st = fulfillmentLabel(o.shipment_count);
                return (
                  <tr key={o.order_id}>
                    <td className="mono">
                      <Link href={`/orders/${o.order_id}`}>{o.order_id}</Link>
                    </td>
                    <td>{formatDateTime(o.order_datetime)}</td>
                    <td className="num">{o.item_count}</td>
                    <td>
                      <span
                        className={
                          st.shipped ? "status-pill status-pill--shipped" : "status-pill status-pill--open"
                        }
                      >
                        {st.text}
                      </span>
                    </td>
                    <td className="num">${o.order_total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
