import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import {
  dbCustomerOrderStats,
  dbCustomerRecentOrders,
} from "@/lib/db-access";
import { getDbState } from "@/lib/db";

type RecentOrder = {
  order_id: number;
  order_timestamp: string;
  fulfilled: number;
  total_value: number;
};

export default async function DashboardPage() {
  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <h1>Customer dashboard</h1>
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
  const recent = await dbCustomerRecentOrders(
    state,
    customer.customer_id
  ) as RecentOrder[];

  return (
    <section>
      <h1>Customer dashboard</h1>

      <div className="card">
        <div>
          <strong>
            {customer.first_name} {customer.last_name}
          </strong>
        </div>
        <div className="muted">{customer.email}</div>
        <div style={{ marginTop: "0.75rem" }} className="row">
          <span className="pill">Orders: {stats.order_count}</span>
          <span className="pill">Total spend: ${stats.total_spend.toFixed(2)}</span>
        </div>
        <p className="muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          Total spend is the sum of order totals for this customer.
        </p>
      </div>

      <h2>Five most recent orders</h2>
      {recent.length === 0 ? (
        <p className="muted">No orders yet. Try placing one.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>order_id</th>
                <th>order_timestamp</th>
                <th>fulfilled</th>
                <th>total_value</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.order_id}>
                  <td className="mono">
                    <Link href={`/orders/${o.order_id}`}>{o.order_id}</Link>
                  </td>
                  <td className="mono">{o.order_timestamp}</td>
                  <td>{o.fulfilled ? "yes" : "no"}</td>
                  <td>${o.total_value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1rem" }}>
        <Link href="/place-order">Place an order</Link> ·{" "}
        <Link href="/orders">View full order history</Link>
      </p>
    </section>
  );
}
