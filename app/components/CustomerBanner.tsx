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
      <div className="banner banner--error" role="status">
        <div className="banner-inner">
          <strong>Database issue:</strong> {dbError.message}
        </div>
      </div>
    );
  }

  if (session.kind === "invalid") {
    return (
      <div className="banner banner--warn" role="status">
        <div className="banner-inner banner-inner--split">
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
      <div className="banner banner--warn" role="status">
        <div className="banner-inner">
          No active customer. Open{" "}
          <Link href="/select-customer">Select Customer</Link> to choose who you are acting as before
          using the dashboard, placing orders, or viewing order history.
        </div>
      </div>
    );
  }

  const c = customer ?? session.customer;

  return (
    <div className="banner banner--active" role="status">
      <div className="banner-inner banner-inner--split">
        <div className="banner-customer">
          <span className="banner-label">Acting as</span>
          <strong className="banner-name">{c.full_name}</strong>
          <span className="banner-meta">{c.email}</span>
          <span className="badge-mono">ID {c.customer_id}</span>
        </div>
        <ClearSessionButton label="Change customer" />
      </div>
    </div>
  );
}
