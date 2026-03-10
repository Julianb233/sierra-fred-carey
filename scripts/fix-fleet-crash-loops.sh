#!/bin/bash
# fix-fleet-crash-loops.sh — Apply fleet crash loop fixes
#
# Can be run by any agency user. Uses the `fleet` CLI for restarts.
# File modifications require dev user — the script will apply what it can
# and report what needs manual intervention.
#
# Fixes:
# 1. Increase Supabase health cooldown from 30s to 60s (reduce hammering during outages)
# 2. Restart crashed agents via fleet CLI (apply exp_backoff_restart_delay)

set -euo pipefail

FLEET_DIR="/home/dev/ai-acrobatics-fleet"
SUPABASE_CLIENT="${FLEET_DIR}/fleet_shared/tools/supabase-client.js"

echo "=== Fleet Crash Loop Fix ==="
echo ""

# ── Fix 1: Increase Supabase health cooldown ──
echo "[1/2] Checking Supabase health cooldown..."
if grep -q "const _HEALTH_COOLDOWN = 30000;" "$SUPABASE_CLIENT" 2>/dev/null; then
    # Try to apply the fix — will only work if we have write permission
    if sed -i 's/const _HEALTH_COOLDOWN = 30000;/const _HEALTH_COOLDOWN = 60000; \/\/ 60s cooldown after failure (was 30s)/' "$SUPABASE_CLIENT" 2>/dev/null; then
        echo "  [OK] Updated: supabase-client.js cooldown → 60s"
    else
        echo "  [SKIP] Cannot write to supabase-client.js (permission denied)"
        echo "         Run as dev user to apply: sudo -u dev sed -i 's/const _HEALTH_COOLDOWN = 30000;/const _HEALTH_COOLDOWN = 60000;/' $SUPABASE_CLIENT"
    fi
elif grep -q "_HEALTH_COOLDOWN = 60000" "$SUPABASE_CLIENT" 2>/dev/null; then
    echo "  [OK] Already at 60s"
else
    echo "  [SKIP] Unexpected cooldown value — check manually"
fi

# ── Fix 2: Restart crashed agents ──
echo ""
echo "[2/2] Checking fleet health and restarting crashed agents..."
if command -v fleet &>/dev/null; then
    # Use fleet CLI — works for any agency user
    fleet status 2>/dev/null | grep -i "offline\|errored\|stopped" && {
        echo "  Found offline agents. Restarting..."
        fleet restart all 2>&1 || echo "  [WARN] fleet restart failed — agents may need manual restart as dev"
    } || echo "  [OK] All agents appear online"
else
    echo "  [SKIP] fleet CLI not found — restart agents manually: sudo -u dev pm2 restart all"
fi

echo ""
echo "=== Fleet Crash Loop Fix Complete ==="
echo ""
echo "Ecosystem config already includes:"
echo "  - exp_backoff_restart_delay: 100ms → 15s exponential backoff"
echo "  - max_restarts: 50 with min_uptime: 30s"
echo "  - max_memory_restart: 512M"
echo ""
echo "If Supabase returns 502, agents will:"
echo "  1. Back off exponentially on restarts (100ms → 200ms → ... → 15s)"
echo "  2. Skip Supabase calls for 60s after each failure (health cooldown)"
echo "  3. Stop restarting after 50 quick restarts (PM2 max_restarts)"
