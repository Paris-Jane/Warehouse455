import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import { formatDateTime } from "@/lib/format";
import {
  dbOrderBelongsToCustomer,
  dbOrderHeaderForCustomer,
  dbOrderLineItems,
} from "@/lib/db-access";
import { getDbState } from "@/lib/db";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ order_id: string }>;
}) {
  const { order_id } = await params;

  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <header className="page-header">
          <h1 className="page-title">Order</h1>
        </header>
        <p>{state.message}</p>
      </section>
    );
  }

  const session = await getSelectedCustomer(state);
  if (session.status === "none" || session.status === "invalid_cookie") {
    redirect("/select-customer");
  }

  const id = Number.parseInt(order_id, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const belongs = await dbOrderBelongsToCustomer(state, id, session.customer.customer_id);
  if (!belongs) {
    notFound();
  }

  const header = await dbOrderHeaderForCustomer(state, id, session.customer.customer_id);
  const lines = await dbOrderLineItems(state, id);

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">Order {id}</h1>
        <p className="page-desc">
          Line items for <strong>{session.customer.full_name}</strong>{" "}
          <span className="muted">· customer_id {session.customer.customer_id}</span>
        </p>
      </header>

      {header ? (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="stat-grid" style={{ marginTop: 0 }}>
            <div className="stat-card">
              <div className="stat-card__label">order_datetime</div>
              <div style={{ fontWeight: 600 }}>{formatDateTime(header.order_datetime)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">order_total</div>
              <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>
                ${header.order_total.toFixed(2)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Line items</div>
              <div style={{ fontWeight: 600 }}>{header.item_count}</div>
            </div>
          </div>
        </div>
      ) : null}

      <h2 className="section-title">Order items</h2>
      {lines.length === 0 ? (
        <p className="muted">This order has no line items.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>product_name</th>
                <th className="num">quantity</th>
                <th className="num">unit_price</th>
                <th className="num">line_total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={`${l.product_name}-${idx}`}>
                  <td>{l.product_name}</td>
                  <td className="num">{l.quantity}</td>
                  <td className="num">${l.unit_price.toFixed(2)}</td>
                  <td className="num">${l.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/orders">← Order history</Link>
      </p>
    </section>
  );
}
