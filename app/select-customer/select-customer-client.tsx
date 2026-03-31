"use client";

import { useMemo, useState } from "react";

import { selectCustomerAction } from "@/app/actions/customer";

type Row = {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
};

export function SelectCustomerClient({ customers }: { customers: Row[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) => {
      const hay = `${c.first_name} ${c.last_name} ${c.email} ${c.customer_id}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [customers, q]);

  return (
    <div className="card">
      <div className="field">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, email, or customer id"
          autoComplete="off"
        />
      </div>

      <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th style={{ width: 120 }}>customer_id</th>
              <th style={{ width: 160 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No matches.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const name = `${c.first_name} ${c.last_name}`.trim();
                return (
                  <tr key={c.customer_id}>
                    <td>{name}</td>
                    <td>{c.email}</td>
                    <td className="mono">{c.customer_id}</td>
                    <td>
                      <form action={selectCustomerAction}>
                        <input type="hidden" name="customer_id" value={c.customer_id} />
                        <button className="primary" type="submit">
                          Act as
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
