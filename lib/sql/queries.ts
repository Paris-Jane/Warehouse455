/**
 * Centralized SQL strings for SQLite (aligned with operational Postgres schema).
 */

export const SQL = {
  customersList: `
    SELECT customer_id, full_name, email
    FROM customers
    ORDER BY lower(full_name), customer_id
  `,

  customerById: `
    SELECT customer_id, full_name, email
    FROM customers
    WHERE customer_id = ?
  `,

  customerOrderStats: `
    SELECT
      COUNT(*) AS order_count,
      COALESCE(SUM(order_total), 0) AS total_spend,
      MAX(order_datetime) AS last_order_datetime
    FROM orders
    WHERE customer_id = ?
  `,

  customerRecentOrders: `
    SELECT
      o.order_id,
      o.order_datetime AS order_datetime,
      o.order_total AS order_total,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) AS item_count,
      (SELECT COUNT(*) FROM shipments sh WHERE sh.order_id = o.order_id) AS shipment_count
    FROM orders o
    WHERE o.customer_id = ?
    ORDER BY o.order_datetime DESC
    LIMIT 5
  `,

  productsList: `
    SELECT product_id, product_name, price
    FROM products
    ORDER BY product_name COLLATE NOCASE
  `,

  insertOrder: `
    INSERT INTO orders (customer_id, order_datetime, order_total)
    VALUES (?, datetime('now'), ?)
  `,

  insertOrderItem: `
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?)
  `,

  customerOrders: `
    SELECT
      o.order_id,
      o.order_datetime AS order_datetime,
      o.order_total AS order_total,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) AS item_count,
      (SELECT COUNT(*) FROM shipments sh WHERE sh.order_id = o.order_id) AS shipment_count
    FROM orders o
    WHERE o.customer_id = ?
    ORDER BY o.order_datetime DESC
  `,

  orderBelongsToCustomer: `
    SELECT 1 AS ok
    FROM orders
    WHERE order_id = ? AND customer_id = ?
  `,

  orderHeaderForCustomer: `
    SELECT
      o.order_id,
      o.order_datetime AS order_datetime,
      o.order_total AS order_total,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) AS item_count
    FROM orders o
    WHERE o.order_id = ? AND o.customer_id = ?
  `,

  orderLineItems: `
    SELECT
      pr.product_name,
      oi.quantity,
      oi.unit_price,
      oi.line_total
    FROM order_items oi
    JOIN products pr ON pr.product_id = oi.product_id
    WHERE oi.order_id = ?
    ORDER BY oi.order_item_id
  `,

  /** Unshipped orders (no rows in shipments) with prediction join for warehouse prioritization. */
  warehousePriorityQueue: `
    SELECT
      o.order_id,
      o.order_datetime AS order_datetime,
      o.order_total AS order_total,
      c.customer_id,
      c.full_name AS customer_name,
      CASE WHEN p.order_id IS NOT NULL THEN 1 ELSE 0 END AS has_prediction,
      COALESCE(p.late_delivery_probability, 0) AS late_delivery_probability,
      COALESCE(p.predicted_late_delivery, 0) AS predicted_late_delivery,
      COALESCE(p.fraud_probability, 0) AS fraud_probability,
      COALESCE(p.predicted_fraud, 0) AS predicted_fraud,
      COALESCE(p.prediction_timestamp, '') AS prediction_timestamp
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    LEFT JOIN order_predictions p ON p.order_id = o.order_id
    WHERE NOT EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
    ORDER BY
      has_prediction DESC,
      COALESCE(p.fraud_probability, 0) DESC,
      COALESCE(p.late_delivery_probability, 0) DESC,
      o.order_datetime ASC
    LIMIT 50
  `,

  fraudFlaggedOpenOrders: `
    SELECT
      o.order_id,
      o.order_total AS order_total,
      trim(COALESCE(c.full_name, '')) AS customer_name,
      p.fraud_probability AS fraud_probability
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    JOIN order_predictions p ON p.order_id = o.order_id
    WHERE NOT EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
      AND p.predicted_fraud = 1
    ORDER BY p.fraud_probability DESC, o.order_id
  `,

  openOrdersForScoring: `
    SELECT
      o.order_id,
      o.customer_id,
      o.order_datetime AS order_timestamp,
      o.order_total AS total_value
    FROM orders o
    WHERE NOT EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
    ORDER BY o.order_id
  `,

  upsertPrediction: `
    INSERT INTO order_predictions (
      order_id,
      late_delivery_probability,
      predicted_late_delivery,
      fraud_probability,
      predicted_fraud,
      prediction_timestamp
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(order_id) DO UPDATE SET
      late_delivery_probability = excluded.late_delivery_probability,
      predicted_late_delivery = excluded.predicted_late_delivery,
      fraud_probability = excluded.fraud_probability,
      predicted_fraud = excluded.predicted_fraud,
      prediction_timestamp = excluded.prediction_timestamp
  `,

  listTableNames: `
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `,
} as const;
