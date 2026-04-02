#!/usr/bin/env bash
# Run fraud scoring once (e.g. from crontab every 24 hours).
# Usage:
#   chmod +x scripts/cron-scoring.sh
#   crontab -e
#   0 0 * * * /full/path/to/Warehouse455/scripts/cron-scoring.sh >> /tmp/warehouse455-scoring.log 2>&1
#
# Or invoke the Python job directly (SQLite / local):
#   0 0 * * * cd /full/path/to/Warehouse455 && python3 jobs/run_inference.py

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "${CRON_SCORING_URL:-}" && -n "${CRON_SECRET:-}" ]]; then
  curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${CRON_SCORING_URL}"
elif command -v python3 >/dev/null 2>&1; then
  python3 jobs/run_inference.py
else
  python jobs/run_inference.py
fi
