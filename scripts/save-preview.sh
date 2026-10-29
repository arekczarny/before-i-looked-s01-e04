#!/usr/bin/env bash
# Save one night's digest page as one self-contained HTML file (plan.md § 3, ADR 0003).
# Usage: scripts/save-preview.sh [night] [out-dir]   (LANE_MARKER / LANE_ID come from the environment)
# The output is never committed: out-dir defaults to the git-ignored var/preview.
set -euo pipefail
NIGHT="${1:-2026-10-28}"
OUT="${2:-var/preview}"
PORT="${PREVIEW_PORT:-8799}"
mkdir -p "$OUT"
PORT="$PORT" pnpm exec tsx src/server.ts >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do curl -fs "http://localhost:$PORT/" >/dev/null && break; sleep 0.2; done
curl -fsS "http://localhost:$PORT/digest/$NIGHT" -o "$OUT/index.html"
echo "saved /digest/$NIGHT -> $OUT/index.html ($(wc -c < "$OUT/index.html") bytes)"
