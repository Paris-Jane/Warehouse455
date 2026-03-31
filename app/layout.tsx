import type { Metadata } from "next";

import type { CustomerRow } from "@/lib/customer";
import { getSelectedCustomer } from "@/lib/customer";
import { getDbState } from "@/lib/db";

import { CustomerBanner } from "./components/CustomerBanner";
import { Nav } from "./components/Nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Warehouse455",
  description: "Student warehouse operations demo with placeholder ML scoring",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const state = getDbState();

  const dbError = !state.ok ? state : null;

  type SessionState =
    | { kind: "none" }
    | { kind: "invalid" }
    | { kind: "ok"; customer: CustomerRow };

  let session: SessionState = { kind: "none" };
  let customer: CustomerRow | null = null;

  if (state.ok) {
    const sel = await getSelectedCustomer(state.db);
    if (sel.status === "none") session = { kind: "none" };
    else if (sel.status === "invalid_cookie") session = { kind: "invalid" };
    else {
      session = { kind: "ok", customer: sel.customer };
      customer = sel.customer;
    }
  }

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <div style={{ fontWeight: 700 }}>Warehouse455</div>
            <Nav />
          </div>
        </header>

        <CustomerBanner dbError={dbError} customer={customer} session={session} />

        <main>{children}</main>
      </body>
    </html>
  );
}
