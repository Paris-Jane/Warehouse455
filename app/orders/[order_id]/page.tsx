import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import {
  dbOrderBelongsToCustomer,
  dbOrderLineItems,
} from "@/lib/db-access";
import { getDbState } from "@/lib/db";

type LineRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

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
        <h1>Order</h1>
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

  const belongs = await dbOrderBelongsToCustomer(
    state,
    id,
    session.customer.customer_id
  );
  if (!belongs) {
    notFound();
  }

  const lines = (await dbOrderLineItems(state, id)) as LineRow[];

  return (
    <section>
      <h1>Order {id}</h1>
      <p className="muted">
        Line items for customer{" "}
        <span className="mono">customer_id={session.customer.customer_id}</span>.
      </p>

      {lines.length === 0 ? (
        <p className="muted">This order has no line items.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>product_name</th>
                <th>quantity</th>
                <th>unit_price</th>
                <th>line_total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={`${l.product_name}-${idx}`}>
                  <td>{l.product_name}</td>
                  <td>{l.quantity}</td>
                  <td>${l.unit_price.toFixed(2)}</td>
                  <td>${l.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1rem" }}>
        <Link href="/orders">Back to order history</Link>
      </p>
    </section>
  );
}
