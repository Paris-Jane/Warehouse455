import Link from "next/link";

import { selectCustomerAction } from "@/app/actions/customer";
import { getSelectedCustomer } from "@/lib/customer";
import { dbCustomersList } from "@/lib/db-access";
import { getDbState } from "@/lib/db";

import { SelectCustomerClient } from "./select-customer-client";

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
        <header className="page-header">
          <h1 className="page-title">Select customer</h1>
          <p className="page-desc">The customer directory cannot load until the database is available.</p>
        </header>
        <p className="muted">{state.message}</p>
      </section>
    );
  }

  const session = await getSelectedCustomer(state);
  const customers = await dbCustomersList(state);

  return (
    <section>
      <header className="page-header">
        <h1 className="page-title">Customer directory</h1>
        <p className="page-desc">
          Choose who you are <strong>acting as</strong> for this session. This is not authentication —
          we store <span className="mono">customer_id</span> in an HTTP-only cookie and scope the
          dashboard, orders, and checkout to that customer.
        </p>
      </header>

      {session.status === "ok" ? (
        <div className="alert alert--success">
          You have an active customer.{" "}
          <Link href="/dashboard">Open customer dashboard</Link> or select a different customer below.
        </div>
      ) : null}

      {err === "db" ? (
        <div className="alert alert--error">Database error while saving your selection.</div>
      ) : null}
      {err === "invalid" ? (
        <div className="alert alert--error">That selection was invalid.</div>
      ) : null}
      {err === "unknown" ? (
        <div className="alert alert--error">Unknown customer id.</div>
      ) : null}

      {customers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state__title">No customers</div>
            <p className="muted" style={{ margin: 0 }}>
              With SQLite, run <span className="mono">npm run db:init</span>. With Supabase, load rows
              into the <span className="mono">Customers</span> table.
            </p>
          </div>
        </div>
      ) : (
        <>
          <SelectCustomerClient customers={customers} />

          <div className="card muted" style={{ marginTop: "1.25rem" }}>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Without JavaScript</p>
            <form action={selectCustomerAction} className="row">
              <div className="field" style={{ margin: 0, flex: "1 1 200px" }}>
                <label htmlFor="customer_id">customer_id</label>
                <input id="customer_id" name="customer_id" inputMode="numeric" required />
              </div>
              <button className="primary" type="submit" style={{ marginBottom: "2px" }}>
                Select &amp; continue
              </button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
