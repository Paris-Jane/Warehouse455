/**
 * Postgres SQL for Supabase schema (quoted mixed-case table names).
 * Fulfilled = order has a shipment with ship_datetime set.
 * Mock scoring writes to "Shipments".late_delivery (0/1), not order_predictions.
 */

const fulfilled = `CASE WHEN EXISTS (
  SELECT 1 FROM "Shipments" sh
  WHERE sh.order_id = o.order_id AND sh.ship_datetime IS NOT NULL
) THEN 1 ELSE 0 END`;

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
    SELECT
      customer_id,
      NULLIF(trim(split_part(COALESCE(full_name, ''), ' ', 1)), '') AS first_name,
      CASE
        WHEN strpos(trim(COALESCE(full_name, '')), ' ') > 0 THEN
          trim(substr(trim(full_name) FROM strpos(trim(full_name), ' ') + 1))
        ELSE ''
      END AS last_name,
      COALESCE(email, '') AS email
    FROM "Customers"
    ORDER BY
      lower(CASE
        WHEN strpos(trim(COALESCE(full_name, '')), ' ') > 0 THEN
          trim(substr(trim(full_name) FROM strpos(trim(full_name), ' ') + 1))
        ELSE trim(COALESCE(full_name, ''))
      END),
      lower(split_part(trim(COALESCE(full_name, '')), ' ', 1))
  `,

  customerById: `
    SELECT
      customer_id,
      NULLIF(trim(split_part(COALESCE(full_name, ''), ' ', 1)), '') AS first_name,
      CASE
        WHEN strpos(trim(COALESCE(full_name, '')), ' ') > 0 THEN
          trim(substr(trim(full_name) FROM strpos(trim(full_name), ' ') + 1))
        ELSE ''
      END AS last_name,
      COALESCE(email, '') AS email
    FROM "Customers"
    WHERE customer_id = $1
  `,

  customerOrderStats: `
    SELECT
      COUNT(*)::int AS order_count,
      COALESCE(SUM(order_total), 0)::float AS total_spend
    FROM "Orders"
    WHERE customer_id = $1
  `,

  customerRecentOrders: `
    SELECT
      order_id,
      order_datetime::text AS order_timestamp,
      ${fulfilled} AS fulfilled,
      order_total AS total_value
    FROM "Orders" o
    WHERE customer_id = $1
    ORDER BY order_datetime DESC NULLS LAST
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
    INSERT INTO "Orders" (
      order_id, customer_id, order_datetime, order_total,
      order_subtotal, shipping_fee, tax_amount
    )
    VALUES (
      (SELECT COALESCE(MAX(order_id), 0) + 1 FROM "Orders"),
      $1,
      NOW(),
      $2,
      $2,
      0,
      0
    )
    RETURNING order_id
  `,

  insertOrderItem: `
    INSERT INTO "Order Items" (
      order_item_id, order_id, product_id, quantity, unit_price, line_total
    )
    VALUES (
      (SELECT COALESCE(MAX(order_item_id), 0) + 1 FROM "Order Items"),
      $1, $2, $3, $4,
      ($3::float * $4::float)
    )
  `,

  customerOrders: `
    SELECT
      order_id,
      order_datetime::text AS order_timestamp,
      ${fulfilled} AS fulfilled,
      order_total AS total_value
    FROM "Orders" o
    WHERE customer_id = $1
    ORDER BY order_datetime DESC NULLS LAST
  `,

  orderBelongsToCustomer: `
    SELECT 1 AS ok
    FROM "Orders"
    WHERE order_id = $1 AND customer_id = $2
  `,

  orderLineItems: `
    SELECT
      pr.product_name,
      oi.quantity::int AS quantity,
      oi.unit_price::float AS unit_price,
      (oi.quantity::float * oi.unit_price::float) AS line_total
    FROM "Order Items" oi
    JOIN "Products" pr ON pr.product_id = oi.product_id
    WHERE oi.order_id = $1
    ORDER BY oi.order_item_id
  `,

  /** Priority queue: open orders, latest shipment row for prediction fields */
  warehousePriorityQueue: `
    SELECT
      o.order_id,
      o.order_datetime::text AS order_timestamp,
      o.order_total::float AS total_value,
      ${fulfilled} AS fulfilled,
      c.customer_id,
      trim(COALESCE(c.full_name, '')) AS customer_name,
      CASE
        WHEN ls.late_delivery IS NOT NULL AND ls.late_delivery <> 0 THEN 0.9::float
        ELSE LEAST(0.99::float, GREATEST(0.02::float, COALESCE(o.risk_score, 30)::float / 100.0))
      END AS late_delivery_probability,
      COALESCE(ls.late_delivery::int, 0) AS predicted_late_delivery,
      COALESCE(ls.ship_datetime, o.order_datetime)::text AS prediction_timestamp
    FROM "Orders" o
    JOIN "Customers" c ON c.customer_id = o.customer_id
    LEFT JOIN LATERAL (
      SELECT s.shipment_id, s.late_delivery, s.ship_datetime
      FROM "Shipments" s
      WHERE s.order_id = o.order_id
      ORDER BY s.shipment_id DESC
      LIMIT 1
    ) ls ON true
    WHERE ${fulfilled} = 0
    ORDER BY late_delivery_probability DESC, o.order_datetime ASC NULLS LAST
    LIMIT 50
  `,

  openOrdersForScoring: `
    SELECT
      o.order_id,
      o.customer_id,
      o.order_datetime::text AS order_timestamp,
      o.order_total::float AS total_value,
      ${fulfilled}::int AS fulfilled
    FROM "Orders" o
    WHERE ${fulfilled} = 0
    ORDER BY o.order_id
  `,

  updateLatestShipmentLateDelivery: `
    UPDATE "Shipments" s
    SET late_delivery = $2
    FROM (
      SELECT shipment_id
      FROM "Shipments"
      WHERE order_id = $1
      ORDER BY shipment_id DESC
      LIMIT 1
    ) x
    WHERE s.shipment_id = x.shipment_id
  `,

  insertShipmentScore: `
    INSERT INTO "Shipments" (shipment_id, order_id, late_delivery)
    VALUES (
      (SELECT COALESCE(MAX(shipment_id), 0) + 1 FROM "Shipments"),
      $1,
      $2
    )
  `,
} as const;
