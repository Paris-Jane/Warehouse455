/**
 * Postgres SQL for Supabase (quoted mixed-case tables). Mirrors SQLite semantics:
 * — "Open" fulfillment queue = orders with no rows in Shipments yet.
 * — Scoring persists to order_predictions (late_delivery_probability, etc.), not Shipments.
 */

const openOrder = `NOT EXISTS (SELECT 1 FROM "Shipments" s WHERE s.order_id = o.order_id)`;

export const PgSql = {
  listPublicTables: `
    SELECT tablename AS name
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `,

  columnsForTable: `
    SELECT
      ordinal_position::int AS cid,
      column_name AS name,
      data_type AS type,
      CASE WHEN is_nullable = 'YES' THEN 0 ELSE 1 END::int AS notnull,
      column_default::text AS dflt_value,
      0::int AS pk
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = $1
    ORDER BY ordinal_position
  `,

  customersList: `
    SELECT customer_id, full_name, email
    FROM "Customers"
    ORDER BY lower(full_name), customer_id
  `,

  customerById: `
    SELECT customer_id, full_name, email
    FROM "Customers"
    WHERE customer_id = $1
  `,

  customerOrderStats: `
    SELECT
      COUNT(*)::int AS order_count,
      COALESCE(SUM(order_total), 0)::float AS total_spend,
      MAX(order_datetime)::text AS last_order_datetime
    FROM "Orders"
    WHERE customer_id = $1
  `,

  customerRecentOrders: `
    SELECT
      o.order_id,
      o.order_datetime::text AS order_datetime,
      o.order_total::float AS order_total,
      (SELECT COUNT(*)::int FROM "Order Items" oi WHERE oi.order_id = o.order_id) AS item_count,
      (SELECT COUNT(*)::int FROM "Shipments" sh WHERE sh.order_id = o.order_id) AS shipment_count
    FROM "Orders" o
    WHERE o.customer_id = $1
    ORDER BY o.order_datetime DESC NULLS LAST
    LIMIT 5
  `,

  productsList: `
    SELECT product_id, product_name, price
    FROM "Products"
    ORDER BY lower(product_name)
  `,

  productPriceById: `
    SELECT product_id, price FROM "Products" WHERE product_id = $1
  `,

  insertOrder: `
    INSERT INTO "Orders" (order_id, customer_id, order_datetime, order_total)
    VALUES (
      (SELECT COALESCE(MAX(order_id), 0) + 1 FROM "Orders"),
      $1,
      NOW(),
      $2
    )
    RETURNING order_id
  `,

  insertOrderItem: `
    INSERT INTO "Order Items" (
      order_item_id, order_id, product_id, quantity, unit_price, line_total
    )
    VALUES (
      (SELECT COALESCE(MAX(order_item_id), 0) + 1 FROM "Order Items"),
      $1, $2, $3, $4, $5
    )
  `,

  customerOrders: `
    SELECT
      o.order_id,
      o.order_datetime::text AS order_datetime,
      o.order_total::float AS order_total,
      (SELECT COUNT(*)::int FROM "Order Items" oi WHERE oi.order_id = o.order_id) AS item_count,
      (SELECT COUNT(*)::int FROM "Shipments" sh WHERE sh.order_id = o.order_id) AS shipment_count
    FROM "Orders" o
    WHERE o.customer_id = $1
    ORDER BY o.order_datetime DESC NULLS LAST
  `,

  orderBelongsToCustomer: `
    SELECT 1 AS ok
    FROM "Orders"
    WHERE order_id = $1 AND customer_id = $2
  `,

  orderHeaderForCustomer: `
    SELECT
      o.order_id,
      o.order_datetime::text AS order_datetime,
      o.order_total::float AS order_total,
      (SELECT COUNT(*)::int FROM "Order Items" oi WHERE oi.order_id = o.order_id) AS item_count
    FROM "Orders" o
    WHERE o.order_id = $1 AND o.customer_id = $2
  `,

  orderLineItems: `
    SELECT
      pr.product_name,
      oi.quantity::int AS quantity,
      oi.unit_price::float AS unit_price,
      oi.line_total::float AS line_total
    FROM "Order Items" oi
    JOIN "Products" pr ON pr.product_id = oi.product_id
    WHERE oi.order_id = $1
    ORDER BY oi.order_item_id
  `,

  warehousePriorityQueue: `
    SELECT
      o.order_id,
      o.order_datetime::text AS order_datetime,
      o.order_total::float AS order_total,
      c.customer_id,
      trim(COALESCE(c.full_name, '')) AS customer_name,
      CASE WHEN p.order_id IS NOT NULL THEN 1 ELSE 0 END::int AS has_prediction,
      COALESCE(p.late_delivery_probability, 0)::float AS late_delivery_probability,
      COALESCE(p.predicted_late_delivery, 0)::int AS predicted_late_delivery,
      COALESCE(p.fraud_probability, 0)::float AS fraud_probability,
      COALESCE(p.predicted_fraud, 0)::int AS predicted_fraud,
      COALESCE(p.prediction_timestamp::text, '') AS prediction_timestamp
    FROM "Orders" o
    JOIN "Customers" c ON c.customer_id = o.customer_id
    LEFT JOIN order_predictions p ON p.order_id = o.order_id
    WHERE ${openOrder}
    ORDER BY
      has_prediction DESC,
      COALESCE(p.fraud_probability, 0) DESC,
      COALESCE(p.late_delivery_probability, 0) DESC,
      o.order_datetime ASC NULLS LAST
    LIMIT 50
  `,

  fraudFlaggedOpenOrders: `
    SELECT
      o.order_id,
      o.order_total::float AS order_total,
      trim(COALESCE(c.full_name, '')) AS customer_name,
      p.fraud_probability::float AS fraud_probability
    FROM "Orders" o
    JOIN "Customers" c ON c.customer_id = o.customer_id
    JOIN order_predictions p ON p.order_id = o.order_id
    WHERE ${openOrder}
      AND p.predicted_fraud = 1
    ORDER BY p.fraud_probability DESC NULLS LAST, o.order_id
  `,

  openOrdersForScoring: `
    SELECT
      o.order_id,
      o.customer_id,
      o.order_datetime::text AS order_timestamp,
      o.order_total::float AS total_value
    FROM "Orders" o
    WHERE ${openOrder}
    ORDER BY o.order_id
  `,

  upsertOrderPrediction: `
    INSERT INTO order_predictions (
      order_id,
      late_delivery_probability,
      predicted_late_delivery,
      fraud_probability,
      predicted_fraud,
      prediction_timestamp
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (order_id) DO UPDATE SET
      late_delivery_probability = EXCLUDED.late_delivery_probability,
      predicted_late_delivery = EXCLUDED.predicted_late_delivery,
      fraud_probability = EXCLUDED.fraud_probability,
      predicted_fraud = EXCLUDED.predicted_fraud,
      prediction_timestamp = EXCLUDED.prediction_timestamp
  `,
} as const;
