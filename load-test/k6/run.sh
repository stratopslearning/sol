#!/usr/bin/env bash
# Ramp 50 → 100 → 200 → 400 against BASE_URL (local or Vercel preview).
# Requires: k6, a seeded load-test/fixture.json, LOAD_TEST_SECRET, running app.
#
#   LOAD_TEST_SECRET=... BASE_URL=http://localhost:3000 ./load-test/k6/run.sh
#   LOAD_TEST_SECRET=... BASE_URL=https://<preview>.vercel.app ./load-test/k6/run.sh 50
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

: "${LOAD_TEST_SECRET:?Set LOAD_TEST_SECRET (min 16 chars)}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
FIXTURE="${FIXTURE:-$ROOT/load-test/fixture.json}"
TARGET_VUS="${1:-400}"

if [[ ! -f "$FIXTURE" ]]; then
  echo "Missing $FIXTURE — run: npm run load-test:seed" >&2
  exit 1
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed. https://grafana.com/docs/k6/latest/set-up/install-k6/" >&2
  exit 1
fi

run_one() {
  local script="$1"
  local vus="$2"
  local extra="${3:-}"
  echo ""
  echo "=== $script  VUS=$vus  BASE_URL=$BASE_URL ==="
  k6 run \
    -e "BASE_URL=$BASE_URL" \
    -e "LOAD_TEST_SECRET=$LOAD_TEST_SECRET" \
    -e "FIXTURE=$FIXTURE" \
    -e "VUS=$vus" \
    $extra \
    "load-test/k6/$script"
}

STEPS=(50)
if (( TARGET_VUS >= 100 )); then STEPS+=(100); fi
if (( TARGET_VUS >= 200 )); then STEPS+=(200); fi
if (( TARGET_VUS >= 400 )); then STEPS+=(400); fi
# Allow a custom first-step like ./run.sh 50
if (( TARGET_VUS != 50 && TARGET_VUS != 100 && TARGET_VUS != 200 && TARGET_VUS != 400 )); then
  STEPS=("$TARGET_VUS")
fi

for vus in "${STEPS[@]}"; do
  run_one exam-start.js "$vus"
  run_one exam-progress.js "$vus" "-e DURATION=1m"
  run_one dashboard.js "$vus" "-e DURATION=30s"
  run_one professor-results.js 5 "-e DURATION=30s"
  run_one exam-submit-mcq.js "$vus"
  echo "Resetting attempts before next step..."
  LOAD_TEST_DATABASE_URL="${LOAD_TEST_DATABASE_URL:-}" npx tsx scripts/load-test/cleanup.ts --attempts-only
done

echo ""
echo "MCQ ramp complete through ${STEPS[*]} VUs."
echo "Short-answer is opt-in (OpenAI cost):"
echo "  k6 run -e BASE_URL=$BASE_URL -e LOAD_TEST_SECRET=\$LOAD_TEST_SECRET -e VUS=50 load-test/k6/exam-submit-sa.js"
