"use server";

import { redirect } from "next/navigation";

import { getSelectedCustomer } from "@/lib/customer";
import { getDbState } from "@/lib/db";
import { SQL } from "@/lib/sql/queries";

type Line = { product_id: number; quantity: number; unit_price: number };

function parseOrderLinesJson(raw: unknown): Line[] | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const lines: Line[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return null;
    const rec = item as Record<string, unknown>;
    const product_id = Number.parseInt(String(rec.product_id ?? ""), 10);
    const quantity = Number.parseInt(String(rec.quantity ?? ""), 10);
    if (!Number.isFinite(product_id) || product_id <= 0) return null;
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    lines.push({ product_id, quantity, unit_price: 0 });
  }
  return lines;
}

export async function placeOrderAction(formData: FormData) {
  const state = getDbState();
  if (!state.ok) {
    redirect("/place-order?error=db");
  }

  const session = await getSelectedCustomer(state.db);
  if (session.status !== "ok") {
    redirect("/select-customer");
  }

  const lines = parseOrderLinesJson(formData.get("order_lines"));
  if (!lines) {
    redirect("/place-order?error=lines");
  }

  const db = state.db;
  const productStmt = db.prepare(
    `SELECT product_id, price FROM products WHERE product_id = ?`
  );

  for (const line of lines) {
    const p = productStmt.get(line.product_id) as
      | { product_id: number; price: number }
      | undefined;
    if (!p) {
      redirect("/place-order?error=product");
    }
    line.unit_price = p.price;
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  const insertOrder = db.prepare(SQL.insertOrder);
  const insertItem = db.prepare(SQL.insertOrderItem);

  const run = db.transaction(() => {
    const info = insertOrder.run(session.customer.customer_id, total);
    const orderId = Number(info.lastInsertRowid);
    for (const l of lines) {
      insertItem.run(orderId, l.product_id, l.quantity, l.unit_price);
    }
  });

  try {
    run();
  } catch {
    redirect("/place-order?error=tx");
  }

  redirect("/orders?placed=1");
}
