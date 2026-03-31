import Link from "next/link";

const links = [
  { href: "/select-customer", label: "Select Customer" },
  { href: "/dashboard", label: "Customer Dashboard" },
  { href: "/place-order", label: "Place Order" },
  { href: "/orders", label: "Order History" },
  { href: "/warehouse/priority", label: "Warehouse Priority Queue" },
  { href: "/scoring", label: "Run Scoring" },
];

export function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      {links.map((l) => (
        <Link key={l.href} href={l.href}>
          {l.label}
        </Link>
      ))}
      <Link href="/debug/schema" className="muted">
        Schema (debug)
      </Link>
    </nav>
  );
}
