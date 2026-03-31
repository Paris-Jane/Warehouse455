-- Operational schema (SQLite). Matches course Postgres shape: full_name, order_datetime, order_total, line_total, shipments, order_predictions.
-- Run: npm run db:init (rebuilds shop.db from scratch)

PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS order_predictions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_name TEXT NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers (customer_id),
  order_datetime TEXT NOT NULL DEFAULT (datetime('now')),
  order_total REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders (order_id),
  late_delivery INTEGER NOT NULL DEFAULT 0 CHECK (late_delivery IN (0, 1))
);

CREATE TABLE IF NOT EXISTS order_predictions (
  order_id INTEGER PRIMARY KEY REFERENCES orders (order_id) ON DELETE CASCADE,
  late_delivery_probability REAL NOT NULL,
  predicted_late_delivery INTEGER NOT NULL CHECK (predicted_late_delivery IN (0, 1)),
  prediction_timestamp TEXT NOT NULL
);

INSERT INTO customers (full_name, email) VALUES
  ('Ada Lovelace', 'ada@example.edu'),
  ('Alan Turing', 'alan@example.edu'),
  ('Grace Hopper', 'grace@example.edu');

INSERT INTO products (product_name, price) VALUES
  ('Notebook', 4.5),
  ('Pen Set', 12.0),
  ('Desk Lamp', 29.99),
  ('USB Cable', 8.25);

-- Customer 1: one open order, one shipped order
INSERT INTO orders (customer_id, order_datetime, order_total) VALUES
  (1, datetime('now', '-5 days'), 9.0),
  (1, datetime('now', '-2 days'), 29.99),
  (2, datetime('now', '-1 days'), 8.25);

INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES
  (1, 1, 2, 4.5, 9.0),
  (2, 3, 1, 29.99, 29.99),
  (3, 4, 1, 8.25, 8.25);

-- Order 2 has a shipment (operational signal — not the same as ML predictions)
INSERT INTO shipments (order_id, late_delivery) VALUES (2, 0);
