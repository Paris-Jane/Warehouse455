#!/usr/bin/env python3
"""
Scaffold entrypoint for a future ML inference pipeline.

The Next.js app runs:
  python jobs/run_inference.py

Integration notes:
- Keep stdout/stderr bounded and structured enough for the app to parse counts if you want.
- Recommended: write predictions into the same SQLite file (`shop.db`) using the
  `order_predictions` contract, then exit 0.

This stub exits successfully without touching the database so the repo runs out of the box.
"""

from __future__ import annotations

import sys


def main() -> int:
    # Examples the TypeScript adapter tries to parse:
    # - RESULT orders_scored=12
    # - orders_scored: 12
    print("RESULT orders_scored=0")
    print("Stub: implement inference + DB writes here.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
