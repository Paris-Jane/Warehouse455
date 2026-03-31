import Link from "next/link";

type LinkDef = { href: string; label: string; needsCustomer: boolean };

const links: LinkDef[] = [
  { href: "/select-customer", label: "Select Customer", needsCustomer: false },
  { href: "/dashboard", label: "Customer Dashboard", needsCustomer: true },
  { href: "/place-order", label: "Place Order", needsCustomer: true },
  { href: "/orders", label: "Order History", needsCustomer: true },
  { href: "/warehouse/priority", label: "Warehouse Priority", needsCustomer: false },
  { href: "/scoring", label: "Run Scoring", needsCustomer: false },
];

export function Nav({ customerSelected }: { customerSelected: boolean }) {
  return (
    <nav className="nav" aria-label="Primary">
      {links.map((l) => {
        if (l.needsCustomer && !customerSelected) {
          return (
            <span
              key={l.href}
              className="nav-link nav-link--disabled"
              title="Select a customer first"
            >
              {l.label}
            </span>
          );
        }
        return (
          <Link key={l.href} href={l.href} className="nav-link">
            {l.label}
          </Link>
        );
      })}
      <Link href="/debug/schema" className="nav-link nav-link--muted">
        Schema (debug)
      </Link>
    </nav>
  );
}
