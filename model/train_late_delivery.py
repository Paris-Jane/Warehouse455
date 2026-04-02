import sqlite3
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
import joblib

SHOP_DB = "shop.db"

conn = sqlite3.connect(SHOP_DB)

# We only select columns that exist in BOTH the analytical DB and the real operational DB
query = """
SELECT 
    o.order_id,
    o.order_total,
    o.order_datetime,
    COALESCE(i.num_items, 0) as num_items,
    s.late_delivery
FROM orders o
LEFT JOIN (
    SELECT order_id, SUM(quantity) as num_items 
    FROM order_items 
    GROUP BY order_id
) i ON o.order_id = i.order_id
JOIN shipments s ON o.order_id = s.order_id
"""

df = pd.read_sql(query, conn)
conn.close()

# Feature engineering (must be reproducible in inference)
df['order_datetime'] = pd.to_datetime(df['order_datetime'])
df['hour_of_day'] = df['order_datetime'].dt.hour
df['day_of_week'] = df['order_datetime'].dt.dayofweek

feature_cols = ['order_total', 'num_items', 'hour_of_day', 'day_of_week']
label_col = 'late_delivery'

X = df[feature_cols]
y = df[label_col].astype(int)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ]
)

pipeline.fit(X_train, y_train)

from sklearn.metrics import classification_report, accuracy_score
y_pred = pipeline.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

joblib.dump(pipeline, "late_delivery_model.sav")
print("Saved model to late_delivery_model.sav")
