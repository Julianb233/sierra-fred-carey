#!/bin/bash
# Quick Start: Deploy sierra-fred-carey to Vercel Staging
#
# This script sets up GitHub Actions secrets for Vercel deployment
# PREREQUISITES: GitHub CLI (gh) installed and authenticated
#
# USAGE:
#   1. Get your Vercel token from https://vercel.com/account/tokens
#   2. Run: ./QUICK-START.sh "YOUR_VERCEL_TOKEN_HERE"

set -e

VERCEL_TOKEN="${1:-}"
REPO="Julianb233/sierra-fred-carey"
VERCEL_ORG_ID="team_Fs8nLavBTXBbOfb7Yxcydw83"
VERCEL_PROJECT_ID="prj_SMYMDJ30eBOJKoFWxFwLoI73rupP"

# Validate input
if [ -z "$VERCEL_TOKEN" ]; then
  echo "ERROR: Vercel token is required"
  echo ""
  echo "USAGE: $0 <VERCEL_TOKEN>"
  echo ""
  echo "Steps to get your token:"
  echo "1. Visit: https://vercel.com/account/tokens"
  echo "2. Click 'Create Token'"
  echo "3. Copy the generated token (starts with 'vk_')"
  echo "4. Run: $0 'vk_your_token_here'"
  exit 1
fi

echo "========================================"
echo "Sierra Fred Carey - Vercel Deployment"
echo "========================================"
echo ""
echo "Setting GitHub Actions secrets..."
echo ""

# Set VERCEL_TOKEN
echo "[1/3] Setting VERCEL_TOKEN..."
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" -R "$REPO"
echo "      ✓ VERCEL_TOKEN configured"

# Set VERCEL_ORG_ID
echo "[2/3] Setting VERCEL_ORG_ID..."
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" -R "$REPO"
echo "      ✓ VERCEL_ORG_ID configured"

# Set VERCEL_PROJECT_ID
echo "[3/3] Setting VERCEL_PROJECT_ID..."
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" -R "$REPO"
echo "      ✓ VERCEL_PROJECT_ID configured"

echo ""
echo "========================================"
echo "Verifying secrets..."
echo "========================================"
echo ""

gh secret list -R "$REPO" | grep -E "VERCEL_TOKEN|VERCEL_ORG_ID|VERCEL_PROJECT_ID"

echo ""
echo "========================================"
echo "SUCCESS! Secrets configured."
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Push a commit to staging branch to trigger deployment"
echo "2. Monitor: gh run list -R $REPO --branch staging"
echo "3. Watch: gh run watch -R $REPO"
echo ""
echo "Optional: Set up Slack notifications"
echo "  gh secret set SLACK_WEBHOOK --body 'YOUR_WEBHOOK_URL' -R $REPO"
echo ""
