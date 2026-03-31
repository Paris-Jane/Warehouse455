-- Operational schema for Warehouse455 (SQLite). Run: npm run db:init

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
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
  order_timestamp TEXT NOT NULL,
  fulfilled INTEGER NOT NULL DEFAULT 0,
  total_value REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS order_predictions (
  order_id INTEGER PRIMARY KEY REFERENCES orders (order_id) ON DELETE CASCADE,
  late_delivery_probability REAL NOT NULL,
  predicted_late_delivery INTEGER NOT NULL,
  prediction_timestamp TEXT NOT NULL
);

-- Seed data for local development
INSERT INTO customers (first_name, last_name, email) VALUES
  ('Ada', 'Lovelace', 'ada@example.edu'),
  ('Alan', 'Turing', 'alan@example.edu'),
  ('Grace', 'Hopper', 'grace@example.edu');

INSERT INTO products (product_name, price) VALUES
  ('Notebook', 4.5),
  ('Pen Set', 12.0),
  ('Desk Lamp', 29.99),
  ('USB Cable', 8.25);

INSERT INTO orders (customer_id, order_timestamp, fulfilled, total_value) VALUES
  (1, datetime('now', '-5 days'), 0, 9.0),
  (1, datetime('now', '-2 days'), 1, 29.99),
  (2, datetime('now', '-1 days'), 0, 8.25);

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 2, 4.5),
  (2, 3, 1, 29.99),
  (3, 4, 1, 8.25);
