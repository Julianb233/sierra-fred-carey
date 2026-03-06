#!/usr/bin/env bash
#
# Sahara Vercel CLI Deployment Script
# Replaces ad-hoc pushes with a structured deploy workflow.
#
# Usage:
#   ./scripts/deploy.sh              # Preview deployment (default)
#   ./scripts/deploy.sh preview      # Preview deployment
#   ./scripts/deploy.sh staging      # Deploy to staging
#   ./scripts/deploy.sh production   # Deploy to production (requires main branch)
#
# Requirements:
#   - Vercel CLI installed: npm i -g vercel
#   - Logged in: vercel login
#   - Project linked: vercel link

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET="${1:-preview}"
CURRENT_BRANCH="$(git branch --show-current)"

log()  { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok  ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn ]${NC} $*"; }
fail() { echo -e "${RED}[ FAIL ]${NC} $*"; exit 1; }

# -------------------------------------------------------------------
# Pre-flight checks
# -------------------------------------------------------------------

log "Target: $TARGET | Branch: $CURRENT_BRANCH"

# Verify Vercel CLI is available
command -v vercel >/dev/null 2>&1 || fail "Vercel CLI not found. Install with: npm i -g vercel"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Uncommitted changes detected. Commit or stash before deploying."
fi

# Check for untracked files that matter
UNTRACKED=$(git ls-files --others --exclude-standard -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.css' | head -5)
if [ -n "$UNTRACKED" ]; then
  warn "Untracked source files found:"
  echo "$UNTRACKED"
  read -rp "Continue anyway? [y/N] " confirm
  [ "$confirm" = "y" ] || exit 1
fi

# Production guard: must be on main
if [ "$TARGET" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
  fail "Production deploys require the main branch. Current: $CURRENT_BRANCH"
fi

# Staging guard: must be on main or staging
if [ "$TARGET" = "staging" ] && [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "staging" ]; then
  warn "Staging deploys typically use main or staging branch. Current: $CURRENT_BRANCH"
  read -rp "Continue anyway? [y/N] " confirm
  [ "$confirm" = "y" ] || exit 1
fi

# -------------------------------------------------------------------
# Quality gates
# -------------------------------------------------------------------

log "Running quality gates..."

log "1/4 Linting..."
if npm run lint --silent 2>/dev/null; then
  ok "Lint passed"
else
  fail "Lint failed. Fix errors before deploying."
fi

log "2/4 Type checking..."
if npx tsc --noEmit 2>/dev/null; then
  ok "TypeScript passed"
else
  fail "Type check failed. Fix type errors before deploying."
fi

log "3/4 Running tests..."
if npm run test --silent 2>/dev/null; then
  ok "Tests passed"
else
  fail "Tests failed. Fix failing tests before deploying."
fi

log "4/4 Building locally..."
if npm run build 2>/dev/null; then
  ok "Build succeeded"
else
  fail "Build failed. Fix build errors before deploying."
fi

# -------------------------------------------------------------------
# Deploy
# -------------------------------------------------------------------

echo ""
log "All quality gates passed. Deploying..."

case "$TARGET" in
  preview)
    log "Creating preview deployment..."
    DEPLOY_URL=$(vercel 2>&1 | tail -1)
    ok "Preview deployed: $DEPLOY_URL"
    ;;

  staging)
    log "Deploying to staging..."
    DEPLOY_URL=$(vercel 2>&1 | tail -1)
    ok "Staging deployed: $DEPLOY_URL"
    warn "Verify at the preview URL before promoting to production."
    ;;

  production)
    log "Deploying to PRODUCTION..."
    echo ""
    warn "You are about to deploy to production."
    read -rp "Type 'deploy' to confirm: " confirm
    [ "$confirm" = "deploy" ] || { log "Aborted."; exit 0; }
    echo ""
    DEPLOY_URL=$(vercel --prod 2>&1 | tail -1)
    ok "Production deployed: $DEPLOY_URL"
    ;;

  *)
    fail "Unknown target: $TARGET. Use: preview, staging, or production"
    ;;
esac

# -------------------------------------------------------------------
# Post-deploy summary
# -------------------------------------------------------------------

echo ""
echo "============================================"
echo "  Deployment Summary"
echo "============================================"
echo "  Target:  $TARGET"
echo "  Branch:  $CURRENT_BRANCH"
echo "  Commit:  $(git rev-parse --short HEAD)"
echo "  URL:     $DEPLOY_URL"
echo "  Time:    $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

if [ "$TARGET" != "production" ]; then
  log "Next steps:"
  echo "  1. Open the preview URL and verify your changes"
  echo "  2. Check core flows: login, FRED chat, dashboard"
  echo "  3. If everything looks good: ./scripts/deploy.sh production"
fi
