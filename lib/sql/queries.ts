/**
 * Centralized SQL strings for the operational schema.
 * Edit here when the DB contract or reporting queries change.
 */

export const SQL = {
  customersList: `
    SELECT customer_id, first_name, last_name, email
    FROM customers
    ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE
  `,

  customerById: `
    SELECT customer_id, first_name, last_name, email
    FROM customers
    WHERE customer_id = ?
  `,

  customerOrderStats: `
    SELECT
      COUNT(*) AS order_count,
      COALESCE(SUM(total_value), 0) AS total_spend
    FROM orders
    WHERE customer_id = ?
  `,

  customerRecentOrders: `
    SELECT order_id, order_timestamp, fulfilled, total_value
    FROM orders
    WHERE customer_id = ?
    ORDER BY order_timestamp DESC
    LIMIT 5
  `,

  productsList: `
    SELECT product_id, product_name, price
    FROM products
    ORDER BY product_name COLLATE NOCASE
  `,

  insertOrder: `
    INSERT INTO orders (customer_id, order_timestamp, fulfilled, total_value)
    VALUES (?, datetime('now'), 0, ?)
  `,

  insertOrderItem: `
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (?, ?, ?, ?)
  `,

  customerOrders: `
    SELECT order_id, order_timestamp, fulfilled, total_value
    FROM orders
    WHERE customer_id = ?
    ORDER BY order_timestamp DESC
  `,

  orderBelongsToCustomer: `
    SELECT 1 AS ok
    FROM orders
    WHERE order_id = ? AND customer_id = ?
  `,

  orderLineItems: `
    SELECT
      pr.product_name,
      oi.quantity,
      oi.unit_price,
      (oi.quantity * oi.unit_price) AS line_total
    FROM order_items oi
    JOIN products pr ON pr.product_id = oi.product_id
    WHERE oi.order_id = ?
    ORDER BY oi.order_item_id
  `,

  warehousePriorityQueue: `
    SELECT
      o.order_id,
      o.order_timestamp,
      o.total_value,
      o.fulfilled,
      c.customer_id,
      c.first_name || ' ' || c.last_name AS customer_name,
      p.late_delivery_probability,
      p.predicted_late_delivery,
      p.prediction_timestamp
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    JOIN order_predictions p ON p.order_id = o.order_id
    WHERE o.fulfilled = 0
    ORDER BY p.late_delivery_probability DESC, o.order_timestamp ASC
    LIMIT 50
  `,

  openOrdersForScoring: `
    SELECT order_id, customer_id, order_timestamp, total_value, fulfilled
    FROM orders
    WHERE fulfilled = 0
    ORDER BY order_id
  `,

  upsertPrediction: `
    INSERT INTO order_predictions (
      order_id,
      late_delivery_probability,
      predicted_late_delivery,
      prediction_timestamp
    ) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(order_id) DO UPDATE SET
      late_delivery_probability = excluded.late_delivery_probability,
      predicted_late_delivery = excluded.predicted_late_delivery,
      prediction_timestamp = excluded.prediction_timestamp
  `,

  listTableNames: `
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `,
} as const;
