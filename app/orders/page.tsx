import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import { formatDateTime } from "@/lib/format";
import { dbCustomerOrders, type OrderSummaryRow } from "@/lib/db-access";
import { getDbState } from "@/lib/db";

function fulfillmentLabel(shipmentCount: number): { text: string; shipped: boolean } {
  if (shipmentCount > 0) return { text: "Shipped", shipped: true };
  return { text: "Open", shipped: false };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const placed = sp.placed === "1" || sp.placed === "true";

  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <header className="page-header">
          <h1 className="page-title">Order history</h1>
        </header>
        <p>{state.message}</p>
      </section>
    );
  }

  const session = await getSelectedCustomer(state);
  if (session.status === "none" || session.status === "invalid_cookie") {
    redirect("/select-customer");
  }

  const rows = await dbCustomerOrders(state, session.customer.customer_id);

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">Order history</h1>
        <p className="page-desc">
          Orders for <strong>{session.customer.full_name}</strong>{" "}
          <span className="muted">(customer_id {session.customer.customer_id})</span>
        </p>
      </header>

      {placed ? (
        <div className="alert alert--success">Order placed successfully. It appears in the list below.</div>
      ) : null}

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__title">No orders yet</div>
            <p className="muted" style={{ margin: 0 }}>
              <Link href="/place-order">Place an order</Link> to see it here.
            </p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order date / time</th>
                <th className="num">Items</th>
                <th>Status</th>
                <th className="num">order_total</th>
                <th style={{ width: "110px" }} />
              </tr>
            </thead>
            <tbody>
              {(rows as OrderSummaryRow[]).map((o) => {
                const st = fulfillmentLabel(o.shipment_count);
                return (
                  <tr key={o.order_id}>
                    <td className="mono">{o.order_id}</td>
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
                    <td className="num">
                      <Link href={`/orders/${o.order_id}`} className="button button--sm">
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1.25rem" }} className="muted">
        <Link href="/dashboard">← Customer dashboard</Link>
      </p>
    </section>
  );
}
