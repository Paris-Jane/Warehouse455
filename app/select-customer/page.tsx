import Link from "next/link";

import { selectCustomerAction } from "@/app/actions/customer";
import { dbCustomersList } from "@/lib/db-access";
import { getDbState } from "@/lib/db";

import { SelectCustomerClient } from "./select-customer-client";

type Row = {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
};

export default async function SelectCustomerPage({
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
        <h1>Select customer</h1>
        <p className="muted">
          The customer list cannot load until the database is available.
        </p>
        <p>{state.message}</p>
      </section>
    );
  }

  const customers = (await dbCustomersList(state)) as Row[];

  return (
    <section>
      <h1>Select customer</h1>
      <p className="muted">
        No login is required. Pick who you are acting as; we store{" "}
        <span className="mono">customer_id</span> in an HTTP-only cookie.
      </p>

      {err === "db" ? (
        <p style={{ color: "var(--danger)" }}>Database error while saving selection.</p>
      ) : null}
      {err === "invalid" ? (
        <p style={{ color: "var(--danger)" }}>That selection was invalid.</p>
      ) : null}
      {err === "unknown" ? (
        <p style={{ color: "var(--danger)" }}>Unknown customer id.</p>
      ) : null}

      {customers.length === 0 ? (
        <div className="card">
          <p>No customers found.</p>
          <p className="muted">
            With SQLite: run <span className="mono">npm run db:init</span>. With Supabase: load data into
            the <span className="mono">Customers</span> table.
          </p>
        </div>
      ) : (
        <>
          <SelectCustomerClient customers={customers} />

          <div className="card muted" style={{ marginTop: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Fallback (no JS)</div>
            <form action={selectCustomerAction} className="row">
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="customer_id">customer_id</label>
                <input id="customer_id" name="customer_id" inputMode="numeric" required />
              </div>
              <button className="primary" type="submit">
                Save &amp; go to dashboard
              </button>
            </form>
            <p style={{ marginTop: "0.75rem", marginBottom: 0 }}>
              Prefer the searchable list above when JavaScript is enabled.
            </p>
          </div>
        </>
      )}

      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/dashboard">Go to dashboard</Link>
      </p>
    </section>
  );
}
