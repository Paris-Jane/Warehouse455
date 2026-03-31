import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import { dbCustomerOrders } from "@/lib/db-access";
import { getDbState } from "@/lib/db";

type OrderRow = {
  order_id: number;
  order_timestamp: string;
  fulfilled: number;
  total_value: number;
};

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
        <h1>Order history</h1>
        <p>{state.message}</p>
      </section>
    );
  }

  const session = await getSelectedCustomer(state);
  if (session.status === "none" || session.status === "invalid_cookie") {
    redirect("/select-customer");
  }

  const rows = (await dbCustomerOrders(
    state,
    session.customer.customer_id
  )) as OrderRow[];

  return (
    <section>
      <h1>Order history</h1>

      {placed ? (
        <div className="card" style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}>
          Order placed successfully. It should appear below.
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="muted">No orders for this customer yet.</p>
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
              {rows.map((o) => (
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
    </section>
  );
}
