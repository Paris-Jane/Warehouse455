"use client";

import { useMemo, useState } from "react";

import { placeOrderAction } from "@/app/actions/order";

type Product = {
  product_id: number;
  product_name: string;
  price: number;
};

type Line = { key: string; product_id: string; quantity: string };

function newLine(): Line {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    product_id: "",
    quantity: "1",
  };
}

function priceFor(products: Product[], id: string): number | null {
  const pid = Number.parseInt(id, 10);
  if (!Number.isFinite(pid)) return null;
  const p = products.find((x) => x.product_id === pid);
  return p ? p.price : null;
}

export function PlaceOrderForm({ products }: { products: Product[] }) {
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);

  const payload = useMemo(() => {
    const items: { product_id: number; quantity: number }[] = [];
    for (const l of lines) {
      const product_id = Number.parseInt(l.product_id, 10);
      const quantity = Number.parseInt(l.quantity, 10);
      if (!Number.isFinite(product_id) || product_id <= 0) continue;
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      items.push({ product_id, quantity });
    }
    return JSON.stringify(items);
  }, [lines]);

  const runningTotal = useMemo(() => {
    let t = 0;
    for (const l of lines) {
      const pr = priceFor(products, l.product_id);
      const q = Number.parseInt(l.quantity, 10);
      if (pr == null || !Number.isFinite(q) || q <= 0) continue;
      t += pr * q;
    }
    return t;
  }, [lines, products]);

  const canSubmit = useMemo(() => {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }, [payload]);

  if (products.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state__title">No products</div>
          <p className="muted" style={{ margin: 0 }}>
            The catalog is empty. Load <span className="mono">Products</span> in the database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={placeOrderAction} className="card card--flush">
      <input type="hidden" name="order_lines" value={payload} readOnly />

      <div className="card__header">
        <h2 className="card__title">Order lines</h2>
      </div>

      <div className="card__body" style={{ paddingTop: "1rem" }}>
        <div className="table-wrap table-wrap--flat" style={{ borderRadius: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num" style={{ width: "120px" }}>
                  Unit price
                </th>
                <th style={{ width: "100px" }} className="num">
                  Qty
                </th>
                <th className="num" style={{ width: "120px" }}>
                  Line total
                </th>
                <th style={{ width: "88px" }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const unit = priceFor(products, l.product_id);
                const q = Number.parseInt(l.quantity, 10);
                const lineOk = unit != null && Number.isFinite(q) && q > 0;
                const lineTotal = lineOk ? unit * q : null;
                return (
                  <tr key={l.key}>
                    <td>
                      <select
                        aria-label={`Product line ${idx + 1}`}
                        value={l.product_id}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) =>
                            prev.map((x) => (x.key === l.key ? { ...x, product_id: v } : x))
                          );
                        }}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.product_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num muted">{unit != null ? `$${unit.toFixed(2)}` : "—"}</td>
                    <td className="num">
                      <input
                        aria-label={`Quantity line ${idx + 1}`}
                        inputMode="numeric"
                        value={l.quantity}
                        style={{ maxWidth: "88px", marginLeft: "auto", display: "block" }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) =>
                            prev.map((x) => (x.key === l.key ? { ...x, quantity: v } : x))
                          );
                        }}
                      />
                    </td>
                    <td className="num">
                      {lineTotal != null ? <strong>${lineTotal.toFixed(2)}</strong> : "—"}
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="button button--sm"
                        onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                        disabled={lines.length <= 1}
                        aria-label={`Remove line ${idx + 1}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <button type="button" className="button" onClick={() => setLines((prev) => [...prev, newLine()])}>
              Add line
            </button>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.15rem" }}>
              Order total (preview)
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              ${runningTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1.25rem" }}>
          <button className="primary" type="submit" disabled={!canSubmit}>
            Submit order
          </button>
        </div>

        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0, fontSize: "0.85rem" }}>
          Server inserts one <span className="mono">orders</span> row (<span className="mono">order_total</span>)
          and matching <span className="mono">order_items</span> rows with <span className="mono">unit_price</span>{" "}
          and <span className="mono">line_total</span> in one transaction.
        </p>
      </div>
    </form>
  );
}
