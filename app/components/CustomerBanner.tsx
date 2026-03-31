import Link from "next/link";

import type { CustomerRow } from "@/lib/customer";
import type { DbNotReady } from "@/lib/db";

import { ClearSessionButton } from "./ClearSessionButton";

type Props = {
  dbError: DbNotReady | null;
  customer: CustomerRow | null;
  session:
    | { kind: "none" }
    | { kind: "invalid" }
    | { kind: "ok"; customer: CustomerRow };
};

export function CustomerBanner({ dbError, customer, session }: Props) {
  if (dbError) {
    return (
      <div className="banner error" role="status">
        <div className="banner-inner">
          <strong>Database issue:</strong> {dbError.message}
        </div>
      </div>
    );
  }

  if (session.kind === "invalid") {
    return (
      <div className="banner warn" role="status">
        <div className="banner-inner row" style={{ justifyContent: "space-between" }}>
          <span>
            The saved customer id is not valid.{" "}
            <Link href="/select-customer">Select a customer</Link> again.
          </span>
          <ClearSessionButton />
        </div>
      </div>
    );
  }

  if (session.kind === "none") {
    return (
      <div className="banner warn" role="status">
        <div className="banner-inner">
          No customer selected.{" "}
          <Link href="/select-customer">Choose a customer</Link> to use the shop flows.
        </div>
      </div>
    );
  }

  const c = customer ?? session.customer;
  const name = `${c.first_name} ${c.last_name}`.trim();

  return (
    <div className="banner" role="status">
      <div className="banner-inner row" style={{ justifyContent: "space-between" }}>
        <span>
          Acting as <strong>{name}</strong>{" "}
          <span className="muted">({c.email})</span>{" "}
          <span className="pill mono">customer_id={c.customer_id}</span>
        </span>
        <ClearSessionButton label="Change customer" />
      </div>
    </div>
  );
}
