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
        <p>No products are available. The products table is empty.</p>
      </div>
    );
  }

  return (
    <form action={placeOrderAction} className="card">
      <input type="hidden" name="order_lines" value={payload} readOnly />

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {lines.map((l, idx) => (
          <div key={l.key} className="row" style={{ alignItems: "end" }}>
            <div className="field" style={{ flex: "1 1 240px", margin: 0 }}>
              <label htmlFor={`product-${l.key}`}>Product</label>
              <select
                id={`product-${l.key}`}
                value={l.product_id}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x) => (x.key === l.key ? { ...x, product_id: v } : x))
                  );
                }}
              >
                <option value="">Choose…</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} (${p.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ width: 140, margin: 0 }}>
              <label htmlFor={`qty-${l.key}`}>Qty</label>
              <input
                id={`qty-${l.key}`}
                inputMode="numeric"
                value={l.quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x) => (x.key === l.key ? { ...x, quantity: v } : x))
                  );
                }}
              />
            </div>

            <button
              type="button"
              className="button"
              onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
              disabled={lines.length <= 1}
              aria-label={`Remove line ${idx + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: "0.85rem" }}>
        <button
          type="button"
          className="button"
          onClick={() => setLines((prev) => [...prev, newLine()])}
        >
          Add line
        </button>
        <button className="primary" type="submit" disabled={!canSubmit}>
          Submit order
        </button>
      </div>

      <p className="muted" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
        Orders are inserted in a single DB transaction: one <span className="mono">orders</span> row
        plus <span className="mono">order_items</span> rows, with{" "}
        <span className="mono">total_value</span> computed server-side.
      </p>
    </form>
  );
}
