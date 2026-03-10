#!/bin/bash
# fix-fleet-crash-loops.sh — Apply fleet crash loop fixes
# Run as the 'dev' user: sudo -u dev bash scripts/fix-fleet-crash-loops.sh
#
# Fixes:
# 1. Increase Supabase health cooldown from 30s to 60s (reduce hammering during outages)
# 2. Add pm2 save to start-fleet.sh (prevent PM2 config drift on restarts)
# 3. Restart fleet with updated ecosystem.config.cjs (apply exp_backoff_restart_delay)

set -euo pipefail

FLEET_DIR="/home/dev/ai-acrobatics-fleet"

echo "=== Fleet Crash Loop Fix ==="
echo ""

# ── Fix 1: Increase Supabase health cooldown ──
echo "[1/3] Increasing Supabase health cooldown from 30s to 60s..."
SUPABASE_CLIENT="${FLEET_DIR}/fleet_shared/tools/supabase-client.js"
if grep -q "const _HEALTH_COOLDOWN = 30000;" "$SUPABASE_CLIENT"; then
    sed -i 's/const _HEALTH_COOLDOWN = 30000;/const _HEALTH_COOLDOWN = 60000; \/\/ 60s cooldown after failure (was 30s)/' "$SUPABASE_CLIENT"
    echo "      Updated: supabase-client.js cooldown → 60s"
else
    echo "      Already updated or different value found"
fi

# ── Fix 2: Add pm2 save to start-fleet.sh ──
echo "[2/3] Adding 'pm2 save' to start-fleet.sh..."
START_SCRIPT="${FLEET_DIR}/start-fleet.sh"
if ! grep -q "pm2 save" "$START_SCRIPT"; then
    # Add pm2 save after the pm2 start command
    sed -i '/^pm2 start ecosystem.config.cjs$/a pm2 save\necho "      PM2 state saved (prevents config drift on restarts)."' "$START_SCRIPT"
    echo "      Updated: start-fleet.sh now saves PM2 state after start"
else
    echo "      Already has pm2 save"
fi

# ── Fix 3: Restart fleet to apply ecosystem config ──
echo "[3/3] Restarting fleet with updated ecosystem config..."
echo "      This applies: exp_backoff_restart_delay, max_restarts: 50, min_uptime: 30s"
cd "$FLEET_DIR"
bash start-fleet.sh

echo ""
echo "=== Fleet Crash Loop Fix Complete ==="
echo ""
echo "What was fixed:"
echo "  - Supabase health cooldown: 30s → 60s (reduces hammering during outages)"
echo "  - PM2 config: applied exp_backoff_restart_delay (100ms→15s exponential backoff)"
echo "  - PM2 config: max_restarts=50 with min_uptime=30s (prevents infinite restart loops)"
echo "  - PM2 state: saved to disk (survives daemon restarts without config drift)"
echo ""
echo "If Supabase is still returning 502, agents will now:"
echo "  1. Back off exponentially on restarts (100ms → 200ms → 400ms → ... → 15s)"
echo "  2. Skip Supabase calls for 60s after each failure (health cooldown)"
echo "  3. Stop restarting after 50 quick restarts (PM2 max_restarts)"
