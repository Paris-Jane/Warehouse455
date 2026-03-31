#!/usr/bin/env python3
"""
Course inference entrypoint (no Jupyter required).

The Next.js app runs (from project root):
  python jobs/run_inference.py

Writes placeholder predictions into SQLite shop.db → order_predictions
(same deterministic logic as the Node mock scorer). Prints:
  RESULT orders_scored=N

Later: replace mock_probability() with your trained model; keep the DB contract.
"""

from __future__ import annotations

import os
import sqlite3
import sys


def shop_db_path() -> str:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return os.path.join(root, "shop.db")


def mock_probability(
    order_id: int,
    customer_id: int,
    total_value: float,
    order_timestamp: str,
) -> float:
    """Match lib/scoring/mock-provider.ts deterministic placeholder."""
    total_cents = int(round(float(total_value) * 100))
    h = (order_id * 374761 + customer_id * 66041 + total_cents * 104729) & 0xFFFFFFFF
    ts = order_timestamp or ""
    for i, ch in enumerate(ts):
        h = (h + ord(ch) * (i + 1)) & 0xFFFFFFFF
    x = (h % 10000) / 10000.0
    return min(0.99, max(0.01, x))


UPSERT_SQL = """
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
"""


def main() -> int:
    path = shop_db_path()
    if not os.path.isfile(path):
        print(f"ERROR: shop.db not found at {path}", file=sys.stderr)
        print("RESULT orders_scored=0")
        return 1

    try:
        conn = sqlite3.connect(path)
        conn.execute("PRAGMA foreign_keys = ON")
        cur = conn.execute(
            """
            SELECT o.order_id, o.customer_id, o.order_datetime, o.order_total
            FROM orders o
            WHERE NOT EXISTS (
              SELECT 1 FROM shipments s WHERE s.order_id = o.order_id
            )
            ORDER BY o.order_id
            """
        )
        rows = cur.fetchall()
        n = 0
        for order_id, customer_id, order_datetime, order_total in rows:
            prob = mock_probability(
                int(order_id),
                int(customer_id) if customer_id is not None else 0,
                float(order_total or 0),
                str(order_datetime or ""),
            )
            pred = 1 if prob >= 0.5 else 0
            conn.execute(UPSERT_SQL, (int(order_id), prob, pred))
            n += 1
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("RESULT orders_scored=0")
        return 1

    print(f"RESULT orders_scored={n}")
    print("Placeholder inference finished (replace mock_probability with your model).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
