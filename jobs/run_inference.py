#!/usr/bin/env python3
"""
Fraud inference for open (unshipped) orders.

The Next.js app runs (from project root):
  python jobs/run_inference.py

Loads `model/fraud_model.sav` (sklearn Pipeline from the course notebook) and
`model/model_metadata.json` for feature names. Writes SQLite `shop.db` →
`order_predictions` (fraud_probability, predicted_fraud; late-delivery columns
set to 0). Prints:
  RESULT orders_scored=N
  RESULT fraud_flagged_ids=id1,id2,...
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path

try:
    import pandas as pd
    import joblib
except ImportError:
    print("ERROR: numpy, pandas, or joblib not installed.", file=sys.stderr)
    print("Install: pip install -r requirements.txt")
    print("RESULT orders_scored=0")
    print("RESULT fraud_flagged_ids=")
    sys.exit(1)


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def shop_db_path() -> Path:
    return project_root() / "shop.db"


def fraud_model_path() -> Path:
    return project_root() / "model" / "fraud_model.sav"


def metadata_path() -> Path:
    return project_root() / "model" / "model_metadata.json"


UPSERT_SQL = """
INSERT INTO order_predictions (
  order_id,
  late_delivery_probability,
  predicted_late_delivery,
  fraud_probability,
  predicted_fraud,
  prediction_timestamp
) VALUES (?, 0, 0, ?, ?, datetime('now'))
ON CONFLICT(order_id) DO UPDATE SET
  late_delivery_probability = excluded.late_delivery_probability,
  predicted_late_delivery = excluded.predicted_late_delivery,
  fraud_probability = excluded.fraud_probability,
  predicted_fraud = excluded.predicted_fraud,
  prediction_timestamp = excluded.prediction_timestamp
"""


FEATURE_QUERY = """
WITH item_agg AS (
  SELECT
    oi.order_id,
    SUM(oi.quantity) AS num_items,
    SUM(oi.line_total) AS total_value,
    AVG(pr.cost) AS avg_cost
  FROM order_items oi
  JOIN products pr ON pr.product_id = oi.product_id
  GROUP BY oi.order_id
),
cust_counts AS (
  SELECT customer_id, COUNT(*) AS customer_order_count
  FROM orders
  GROUP BY customer_id
)
SELECT
  o.order_id,
  o.risk_score,
  o.order_datetime,
  COALESCE(ia.num_items, 0) AS num_items,
  COALESCE(ia.total_value, o.order_total) AS total_value,
  COALESCE(ia.avg_cost, o.order_total) AS avg_cost,
  c.birthdate,
  COALESCE(cc.customer_order_count, 1) AS customer_order_count
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
LEFT JOIN item_agg ia ON ia.order_id = o.order_id
LEFT JOIN cust_counts cc ON cc.customer_id = o.customer_id
WHERE NOT EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
ORDER BY o.order_id
"""


def load_feature_names() -> list[str]:
    path = metadata_path()
    if not path.is_file():
        raise FileNotFoundError(f"model_metadata.json not found at {path}")
    with open(path, encoding="utf-8") as f:
        meta = json.load(f)
    feats = meta.get("features")
    if not isinstance(feats, list) or not feats:
        raise ValueError("model_metadata.json missing non-empty 'features' array")
    return [str(x) for x in feats]


def add_customer_age(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    od = pd.to_datetime(out["order_datetime"], errors="coerce")
    bd = pd.to_datetime(out["birthdate"], errors="coerce")
    age = ((od - bd).dt.days // 365).astype("float64")
    out["customer_age"] = age
    return out


def main() -> int:
    db_path = shop_db_path()
    if not db_path.is_file():
        print(f"ERROR: shop.db not found at {db_path}", file=sys.stderr)
        print("RESULT orders_scored=0")
        print("RESULT fraud_flagged_ids=")
        return 1

    mdl_path = fraud_model_path()
    if not mdl_path.is_file():
        print(
            f"ERROR: Fraud model not found at {mdl_path}. Train with model/fraud_ml_pipeline.ipynb "
            "and save fraud_model.sav to model/.",
            file=sys.stderr,
        )
        print("RESULT orders_scored=0")
        print("RESULT fraud_flagged_ids=")
        return 1

    try:
        feature_cols = load_feature_names()
    except (OSError, ValueError, json.JSONDecodeError) as e:
        print(f"ERROR reading model metadata: {e}", file=sys.stderr)
        print("RESULT orders_scored=0")
        print("RESULT fraud_flagged_ids=")
        return 1

    try:
        model = joblib.load(mdl_path)
    except Exception as e:
        print(f"ERROR loading model: {e}", file=sys.stderr)
        print("RESULT orders_scored=0")
        print("RESULT fraud_flagged_ids=")
        return 1

    threshold = float(os.environ.get("FRAUD_THRESHOLD", "0.5"))

    try:
        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA foreign_keys = ON")
        df = pd.read_sql(FEATURE_QUERY, conn)

        flagged_ids: list[int] = []
        n = 0

        if not df.empty:
            df = add_customer_age(df)
            missing = [c for c in feature_cols if c not in df.columns]
            if missing:
                raise RuntimeError(f"Missing feature columns after ETL: {missing}")

            X = df[feature_cols].apply(pd.to_numeric, errors="coerce")

            probs = model.predict_proba(X)[:, 1]
            preds = (probs >= threshold).astype(int)

            for order_id, prob, pred in zip(df["order_id"].astype(int), probs, preds):
                oid = int(order_id)
                p = float(prob)
                pf = int(pred)
                conn.execute(UPSERT_SQL, (oid, p, pf))
                n += 1
                if pf == 1:
                    flagged_ids.append(oid)

        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("RESULT orders_scored=0")
        print("RESULT fraud_flagged_ids=")
        return 1
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("RESULT orders_scored=0")
        print("RESULT fraud_flagged_ids=")
        return 1

    ids_str = ",".join(str(i) for i in flagged_ids)
    print(f"RESULT orders_scored={n}")
    print(f"RESULT fraud_flagged_ids={ids_str}")
    print("Inference finished using fraud_model.sav.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
