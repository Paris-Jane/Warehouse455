import Link from "next/link";
import { redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import { getDbState } from "@/lib/db";
import { SQL } from "@/lib/sql/queries";

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
        <h1>Place order</h1>
        <p>{state.message}</p>
      </section>
    );
  }

  const session = await getSelectedCustomer(state.db);
  if (session.status === "none" || session.status === "invalid_cookie") {
    redirect("/select-customer");
  }

  const products = state.db.prepare(SQL.productsList).all() as Product[];

  return (
    <section>
      <h1>Place order</h1>
      <p className="muted">
        Acting as{" "}
        <strong>
          {session.customer.first_name} {session.customer.last_name}
        </strong>
        .
      </p>

      {err === "lines" ? (
        <p style={{ color: "var(--danger)" }}>
          Add at least one valid line item (product and positive quantity).
        </p>
      ) : null}
      {err === "product" ? (
        <p style={{ color: "var(--danger)" }}>One of the selected products was not found.</p>
      ) : null}
      {err === "tx" ? (
        <p style={{ color: "var(--danger)" }}>
          The database transaction failed. Please try again.
        </p>
      ) : null}
      {err === "db" ? (
        <p style={{ color: "var(--danger)" }}>Database unavailable.</p>
      ) : null}

      <PlaceOrderForm products={products} />

      <p style={{ marginTop: "1rem" }}>
        <Link href="/orders">Order history</Link>
      </p>
    </section>
  );
}
