"use client";

import { useMemo, useState } from "react";

import { selectCustomerAction } from "@/app/actions/customer";

import type { CustomerRow } from "@/lib/customer";

export function SelectCustomerClient({ customers }: { customers: CustomerRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) => {
      const hay = `${c.full_name} ${c.email} ${c.customer_id}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [customers, q]);

  return (
    <div className="card card--flush">
      <div className="toolbar card__body" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor="customer-search">Search directory</label>
          <input
            id="customer-search"
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, or customer ID"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="table-wrap table-wrap--flat" style={{ border: "none", borderRadius: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Full name</th>
              <th>Email</th>
              <th className="num" style={{ width: "140px" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <div className="empty-state__title">No matches</div>
                    Try a different search term.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.customer_id}>
                  <td className="mono">{c.customer_id}</td>
                  <td>
                    <strong>{c.full_name}</strong>
                  </td>
                  <td>{c.email}</td>
                  <td className="num">
                    <form action={selectCustomerAction}>
                      <input type="hidden" name="customer_id" value={c.customer_id} />
                      <button className="primary button--sm" type="submit">
                        Select customer
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
