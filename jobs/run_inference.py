#!/usr/bin/env python3
"""
Course inference entrypoint (no Jupyter required).

The Next.js app runs (from project root):
  python jobs/run_inference.py

Writes model predictions into SQLite shop.db → order_predictions. Prints:
  RESULT orders_scored=N
"""

from __future__ import annotations

import os
import sqlite3
import sys

try:
    import pandas as pd
    import joblib
except ImportError:
    print("ERROR: pandas or joblib not installed.", file=sys.stderr)
    print("RESULT orders_scored=0")
    sys.exit(1)


def shop_db_path() -> str:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return os.path.join(root, "shop.db")

def model_path() -> str:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return os.path.join(root, "model", "late_delivery_model.sav")

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

    mdl_path = model_path()
    if not os.path.isfile(mdl_path):
        print(f"ERROR: Model not found at {mdl_path}", file=sys.stderr)
        print("RESULT orders_scored=0")
        return 1

    try:
        model = joblib.load(mdl_path)
    except Exception as e:
        print(f"ERROR loading model: {e}", file=sys.stderr)
        print("RESULT orders_scored=0")
        return 1

    try:
        conn = sqlite3.connect(path)
        conn.execute("PRAGMA foreign_keys = ON")
        
        query = """
            SELECT o.order_id, o.order_datetime, o.order_total, COALESCE(i.num_items, 0) as num_items
            FROM orders o
            LEFT JOIN (
              SELECT order_id, SUM(quantity) as num_items 
              FROM order_items 
              GROUP BY order_id
            ) i ON o.order_id = i.order_id
            WHERE NOT EXISTS (
              SELECT 1 FROM shipments s WHERE s.order_id = o.order_id
            )
            ORDER BY o.order_id
        """
        df = pd.read_sql(query, conn)
        
        n = 0
        if not df.empty:
            # Feature engineering
            df['order_datetime'] = pd.to_datetime(df['order_datetime'])
            df['hour_of_day'] = df['order_datetime'].dt.hour
            df['day_of_week'] = df['order_datetime'].dt.dayofweek
            
            feature_cols = ['order_total', 'num_items', 'hour_of_day', 'day_of_week']
            X = df[feature_cols]
            
            # Predict
            probs = model.predict_proba(X)[:, 1]
            preds = model.predict(X)
            
            for i, row in df.iterrows():
                order_id = int(row['order_id'])
                prob = float(probs[i])
                pred = int(preds[i])
                conn.execute(UPSERT_SQL, (order_id, prob, pred))
                n += 1
                
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("RESULT orders_scored=0")
        return 1

    print(f"RESULT orders_scored={n}")
    print("Inference finished using late_delivery_model.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
