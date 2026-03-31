import "server-only";

import { SQL } from "@/lib/sql/queries";
import { PgSql } from "@/lib/sql/postgres";
import { upsertPredictionsSqlite } from "@/lib/scoring/upsert-sqlite";

import type { CustomerRow } from "./customer";
import type { DbReady } from "./db";
import type { PredictionInput } from "./scoring/types";

function num(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function dbCustomersList(ready: DbReady): Promise<CustomerRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.customersList).all() as CustomerRow[];
  }
  const { rows } = await ready.pool.query(PgSql.customersList);
  return rows as CustomerRow[];
}

export async function dbCustomerById(
  ready: DbReady,
  customerId: number
): Promise<CustomerRow | null> {
  if (ready.kind === "sqlite") {
    const row = ready.db.prepare(SQL.customerById).get(customerId) as
      | CustomerRow
      | undefined;
    return row ?? null;
  }
  const { rows } = await ready.pool.query(PgSql.customerById, [customerId]);
  return (rows[0] as CustomerRow | undefined) ?? null;
}

export async function dbCustomerOrderStats(
  ready: DbReady,
  customerId: number
): Promise<{ order_count: number; total_spend: number }> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.customerOrderStats).get(customerId) as {
      order_count: number;
      total_spend: number;
    };
  }
  const { rows } = await ready.pool.query(PgSql.customerOrderStats, [customerId]);
  const r = rows[0] as { order_count: number; total_spend: number } | undefined;
  return {
    order_count: num(r?.order_count, 0),
    total_spend: num(r?.total_spend, 0),
  };
}

export type OrderSummaryRow = {
  order_id: number;
  order_timestamp: string;
  fulfilled: number;
  total_value: number;
};

export async function dbCustomerRecentOrders(
  ready: DbReady,
  customerId: number
): Promise<OrderSummaryRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.customerRecentOrders).all(customerId) as OrderSummaryRow[];
  }
  const { rows } = await ready.pool.query(PgSql.customerRecentOrders, [customerId]);
  return rows.map((r) => ({
    order_id: num((r as OrderSummaryRow).order_id),
    order_timestamp: String((r as OrderSummaryRow).order_timestamp ?? ""),
    fulfilled: num((r as OrderSummaryRow).fulfilled),
    total_value: num((r as OrderSummaryRow).total_value),
  }));
}

export type ProductRow = {
  product_id: number;
  product_name: string;
  price: number;
};

export async function dbProductsList(ready: DbReady): Promise<ProductRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.productsList).all() as ProductRow[];
  }
  const { rows } = await ready.pool.query(PgSql.productsList);
  return rows.map((r) => ({
    product_id: num((r as ProductRow).product_id),
    product_name: String((r as ProductRow).product_name ?? ""),
    price: num((r as ProductRow).price),
  }));
}

export async function dbProductPrice(
  ready: DbReady,
  productId: number
): Promise<{ product_id: number; price: number } | null> {
  if (ready.kind === "sqlite") {
    const row = ready.db
      .prepare(`SELECT product_id, price FROM products WHERE product_id = ?`)
      .get(productId) as { product_id: number; price: number } | undefined;
    return row ?? null;
  }
  const { rows } = await ready.pool.query(PgSql.productPriceById, [productId]);
  const r = rows[0] as { product_id: number; price: number } | undefined;
  if (!r) return null;
  return { product_id: num(r.product_id), price: num(r.price) };
}

export async function dbPlaceOrder(
  ready: DbReady,
  customerId: number,
  lines: { product_id: number; quantity: number; unit_price: number }[]
): Promise<void> {
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  if (ready.kind === "sqlite") {
    const insertOrder = ready.db.prepare(SQL.insertOrder);
    const insertItem = ready.db.prepare(SQL.insertOrderItem);
    const run = ready.db.transaction(() => {
      const info = insertOrder.run(customerId, total);
      const orderId = Number(info.lastInsertRowid);
      for (const l of lines) {
        insertItem.run(orderId, l.product_id, l.quantity, l.unit_price);
      }
    });
    run();
    return;
  }

  const client = await ready.pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(PgSql.insertOrder, [customerId, total]);
    const orderId = num((ins.rows[0] as { order_id: number }).order_id);
    for (const l of lines) {
      await client.query(PgSql.insertOrderItem, [
        orderId,
        l.product_id,
        l.quantity,
        l.unit_price,
      ]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function dbCustomerOrders(
  ready: DbReady,
  customerId: number
): Promise<OrderSummaryRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.customerOrders).all(customerId) as OrderSummaryRow[];
  }
  const { rows } = await ready.pool.query(PgSql.customerOrders, [customerId]);
  return rows.map((r) => ({
    order_id: num((r as OrderSummaryRow).order_id),
    order_timestamp: String((r as OrderSummaryRow).order_timestamp ?? ""),
    fulfilled: num((r as OrderSummaryRow).fulfilled),
    total_value: num((r as OrderSummaryRow).total_value),
  }));
}

export async function dbOrderBelongsToCustomer(
  ready: DbReady,
  orderId: number,
  customerId: number
): Promise<boolean> {
  if (ready.kind === "sqlite") {
    const row = ready.db
      .prepare(SQL.orderBelongsToCustomer)
      .get(orderId, customerId) as { ok: number } | undefined;
    return !!row;
  }
  const { rows } = await ready.pool.query(PgSql.orderBelongsToCustomer, [
    orderId,
    customerId,
  ]);
  return rows.length > 0;
}

export type LineItemRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export async function dbOrderLineItems(
  ready: DbReady,
  orderId: number
): Promise<LineItemRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.orderLineItems).all(orderId) as LineItemRow[];
  }
  const { rows } = await ready.pool.query(PgSql.orderLineItems, [orderId]);
  return rows.map((r) => ({
    product_name: String((r as LineItemRow).product_name ?? ""),
    quantity: num((r as LineItemRow).quantity),
    unit_price: num((r as LineItemRow).unit_price),
    line_total: num((r as LineItemRow).line_total),
  }));
}

export type WarehouseRow = {
  order_id: number;
  order_timestamp: string;
  total_value: number;
  fulfilled: number;
  customer_id: number;
  customer_name: string;
  late_delivery_probability: number;
  predicted_late_delivery: number;
  prediction_timestamp: string;
};

export async function dbWarehouseQueue(ready: DbReady): Promise<WarehouseRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.warehousePriorityQueue).all() as WarehouseRow[];
  }
  const { rows } = await ready.pool.query(PgSql.warehousePriorityQueue);
  return rows.map((r) => ({
    order_id: num((r as WarehouseRow).order_id),
    order_timestamp: String((r as WarehouseRow).order_timestamp ?? ""),
    total_value: num((r as WarehouseRow).total_value),
    fulfilled: num((r as WarehouseRow).fulfilled),
    customer_id: num((r as WarehouseRow).customer_id),
    customer_name: String((r as WarehouseRow).customer_name ?? ""),
    late_delivery_probability: num((r as WarehouseRow).late_delivery_probability),
    predicted_late_delivery: num((r as WarehouseRow).predicted_late_delivery),
    prediction_timestamp: String((r as WarehouseRow).prediction_timestamp ?? ""),
  }));
}

type OpenOrderRow = {
  order_id: number;
  customer_id: number;
  order_timestamp: string;
  total_value: number;
  fulfilled: number;
};

export async function dbOpenOrdersForScoring(ready: DbReady): Promise<OpenOrderRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.openOrdersForScoring).all() as OpenOrderRow[];
  }
  const { rows } = await ready.pool.query(PgSql.openOrdersForScoring);
  return rows.map((r) => ({
    order_id: num((r as OpenOrderRow).order_id),
    customer_id: num((r as OpenOrderRow).customer_id),
    order_timestamp: String((r as OpenOrderRow).order_timestamp ?? ""),
    total_value: num((r as OpenOrderRow).total_value),
    fulfilled: num((r as OpenOrderRow).fulfilled),
  }));
}

export async function dbUpsertPredictions(
  ready: DbReady,
  predictions: PredictionInput[]
): Promise<void> {
  if (ready.kind === "sqlite") {
    upsertPredictionsSqlite(ready.db, predictions);
    return;
  }

  const client = await ready.pool.connect();
  try {
    await client.query("BEGIN");
    for (const p of predictions) {
      const u = await client.query(PgSql.updateLatestShipmentLateDelivery, [
        p.order_id,
        p.predicted_late_delivery,
      ]);
      if ((u.rowCount ?? 0) === 0) {
        await client.query(PgSql.insertShipmentScore, [
          p.order_id,
          p.predicted_late_delivery,
        ]);
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export type TableNameRow = { name: string };

export async function dbListTableNames(ready: DbReady): Promise<TableNameRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(SQL.listTableNames).all() as TableNameRow[];
  }
  const { rows } = await ready.pool.query(PgSql.listPublicTables);
  return rows as TableNameRow[];
}

export type ColumnInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

export async function dbTableColumns(
  ready: DbReady,
  tableName: string
): Promise<ColumnInfoRow[]> {
  if (ready.kind === "sqlite") {
    return ready.db.prepare(`PRAGMA table_info(${tableName})`).all() as ColumnInfoRow[];
  }
  const { rows } = await ready.pool.query(PgSql.columnsForTable, [tableName]);
  return rows.map((r, i) => ({
    cid: num((r as { cid?: number }).cid, i),
    name: String((r as { name: string }).name),
    type: String((r as { type: string }).type),
    notnull: num((r as { notnull: number }).notnull),
    dflt_value: (r as { dflt_value: string | null }).dflt_value ?? null,
    pk: num((r as { pk: number }).pk),
  }));
}
