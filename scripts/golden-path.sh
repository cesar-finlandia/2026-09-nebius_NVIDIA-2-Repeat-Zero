#!/usr/bin/env bash
set -euo pipefail
export RES_FORCED_DEGRADED=1
FIXTURE_PATH="fixtures/tickets.json"
COMPLETED=0
EXCEPTIONS=0
COUNT=$(node -e "const fs=require('node:fs');const j=JSON.parse(fs.readFileSync(process.env.FIXTURE_PATH||'fixtures/tickets.json','utf8'));console.log(Array.isArray(j)?j.length:(j.tickets||[]).length)")
if [ "$COUNT" != "20" ]; then
  echo "golden-path: FAILED fixture-count $COUNT" >&2
  exit 1
fi
for i in $(seq 0 19); do
  if npx vite-node scripts/golden-path-run.ts --index "$i" --traceId "golden-$i"; then
    COMPLETED=$((COMPLETED+1))
  else
    EXCEPTIONS=$((EXCEPTIONS+1))
    echo "golden-path: FAILED index $i" >&2
    exit 1
  fi
done
echo "golden-path: $COMPLETED/20 tickets completed, $EXCEPTIONS exceptions"
