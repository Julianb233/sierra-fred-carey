#!/bin/bash
# Usage: scripts/ci/check-delta.sh
# Exit 0 if no regressions, exit 1 if new errors introduced
#
# Compares current lint errors and test failures against
# the baseline snapshot. Fails if either count increased.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE="$SCRIPT_DIR/baseline-snapshot.json"

if [ ! -f "$BASELINE" ]; then
  echo "ERROR: Baseline snapshot not found at $BASELINE"
  exit 1
fi

# Read baseline values
BASELINE_LINT_ERRORS=$(node -e "console.log(require('$BASELINE').lint.errors)")
BASELINE_LINT_WARNINGS=$(node -e "console.log(require('$BASELINE').lint.warnings)")
BASELINE_TEST_FAILING=$(node -e "console.log(require('$BASELINE').tests.failing)")
BASELINE_TEST_TOTAL=$(node -e "console.log(require('$BASELINE').tests.total)")

echo "=== CI Delta Check ==="
echo "Baseline: $BASELINE"
echo ""

# ---------- Lint ----------
echo "--- Lint ---"
LINT_JSON=$(npx eslint . --format json 2>/dev/null || true)
CURRENT_LINT_ERRORS=$(echo "$LINT_JSON" | node -e "
  const d=require('fs').readFileSync('/dev/stdin','utf8');
  try { const j=JSON.parse(d); console.log(j.reduce((a,f)=>a+f.errorCount,0)); }
  catch(e) { console.log(-1); }
")
CURRENT_LINT_WARNINGS=$(echo "$LINT_JSON" | node -e "
  const d=require('fs').readFileSync('/dev/stdin','utf8');
  try { const j=JSON.parse(d); console.log(j.reduce((a,f)=>a+f.warningCount,0)); }
  catch(e) { console.log(-1); }
")

if [ "$CURRENT_LINT_ERRORS" = "-1" ]; then
  echo "ERROR: Could not parse lint output"
  exit 1
fi

LINT_STATUS="OK"
LINT_EXIT=0
if [ "$CURRENT_LINT_ERRORS" -gt "$BASELINE_LINT_ERRORS" ]; then
  LINT_DIFF=$((CURRENT_LINT_ERRORS - BASELINE_LINT_ERRORS))
  LINT_STATUS="FAIL (+$LINT_DIFF new errors)"
  LINT_EXIT=1
fi

echo "LINT ERRORS:   $CURRENT_LINT_ERRORS (baseline: $BASELINE_LINT_ERRORS) -- $LINT_STATUS"

WARN_STATUS="OK"
if [ "$CURRENT_LINT_WARNINGS" -gt "$BASELINE_LINT_WARNINGS" ]; then
  WARN_DIFF=$((CURRENT_LINT_WARNINGS - BASELINE_LINT_WARNINGS))
  WARN_STATUS="WARN (+$WARN_DIFF new warnings)"
fi
echo "LINT WARNINGS: $CURRENT_LINT_WARNINGS (baseline: $BASELINE_LINT_WARNINGS) -- $WARN_STATUS"
echo ""

# ---------- Tests ----------
echo "--- Tests ---"
TEST_OUTPUT=$(npx vitest run --reporter=json 2>&1 || true)
TEST_JSON=$(echo "$TEST_OUTPUT" | node -e "
  const d=require('fs').readFileSync('/dev/stdin','utf8');
  const i=d.indexOf('{\"');
  if(i===-1){console.log('{}');process.exit(0);}
  try{const j=JSON.parse(d.slice(i));console.log(JSON.stringify({
    total:j.numTotalTests||0,
    passing:j.numPassedTests||0,
    failing:j.numFailedTests||0
  }));}catch(e){console.log('{}');}
")

CURRENT_TEST_FAILING=$(echo "$TEST_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.failing||0)")
CURRENT_TEST_TOTAL=$(echo "$TEST_JSON" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.total||0)")

TEST_STATUS="OK"
TEST_EXIT=0
if [ "$CURRENT_TEST_FAILING" -gt "$BASELINE_TEST_FAILING" ]; then
  TEST_DIFF=$((CURRENT_TEST_FAILING - BASELINE_TEST_FAILING))
  TEST_STATUS="FAIL (+$TEST_DIFF new failures)"
  TEST_EXIT=1
fi

echo "TEST FAILURES: $CURRENT_TEST_FAILING (baseline: $BASELINE_TEST_FAILING) -- $TEST_STATUS"
echo "TEST TOTAL:    $CURRENT_TEST_TOTAL (baseline: $BASELINE_TEST_TOTAL)"
echo ""

# ---------- Summary ----------
if [ "$LINT_EXIT" -eq 1 ] || [ "$TEST_EXIT" -eq 1 ]; then
  echo "=== RESULT: FAIL -- New regressions detected ==="
  exit 1
else
  echo "=== RESULT: PASS -- No new regressions ==="
  exit 0
fi
