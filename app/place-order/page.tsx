import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import { dbProductsList } from "@/lib/db-access";
import { getDbState } from "@/lib/db";

import { PlaceOrderForm } from "./place-order-form";

type Product = {
  product_id: number;
  product_name: string;
  price: number;
};

export default async function PlaceOrderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const err = typeof sp.error === "string" ? sp.error : undefined;

  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <header className="page-header">
          <h1 className="page-title">Place order</h1>
        </header>
        <p>{state.message}</p>
      </section>
    );
  }

  const session = await getSelectedCustomer(state);
  if (session.status === "none" || session.status === "invalid_cookie") {
    redirect("/select-customer");
  }

  const products = (await dbProductsList(state)) as Product[];

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">Place order</h1>
        <p className="page-desc">
          Build an order for <strong>{session.customer.full_name}</strong>. Totals and{" "}
          <span className="mono">line_total</span> values are finalized on the server inside a single
          transaction.
        </p>
      </header>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontWeight: 600 }}>{session.customer.full_name}</div>
        <div className="muted" style={{ fontSize: "0.9rem" }}>
          {session.customer.email}
        </div>
        <span className="badge-mono" style={{ marginTop: "0.5rem", display: "inline-block" }}>
          customer_id {session.customer.customer_id}
        </span>
      </div>

      {err === "lines" ? (
        <div className="alert alert--error">
          Add at least one valid line item (product and positive quantity).
        </div>
      ) : null}
      {err === "product" ? (
        <div className="alert alert--error">One of the selected products was not found.</div>
      ) : null}
      {err === "tx" ? (
        <div className="alert alert--error">The database transaction failed. Please try again.</div>
      ) : null}
      {err === "db" ? (
        <div className="alert alert--error">Database unavailable.</div>
      ) : null}

      <PlaceOrderForm products={products} />

      <p style={{ marginTop: "1.25rem" }} className="muted">
        <Link href="/orders">Order history</Link>
        {" · "}
        <Link href="/dashboard">Dashboard</Link>
      </p>
    </section>
  );
}
