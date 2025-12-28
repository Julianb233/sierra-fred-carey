#!/bin/bash

# Test Slack Notification API
# Usage: ./scripts/test-slack-api.sh <webhook-url>

set -e

WEBHOOK_URL="${1:-$SLACK_WEBHOOK_URL}"
API_URL="${API_URL:-http://localhost:3000}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Error: Slack webhook URL not provided"
  echo ""
  echo "Usage:"
  echo "  ./scripts/test-slack-api.sh <webhook-url>"
  echo "  or set SLACK_WEBHOOK_URL environment variable"
  exit 1
fi

if [[ ! "$WEBHOOK_URL" =~ ^https://hooks.slack.com/ ]]; then
  echo "❌ Error: Invalid Slack webhook URL format"
  echo "Expected: https://hooks.slack.com/services/..."
  exit 1
fi

echo "🚀 Testing Slack Notification API"
echo "API: $API_URL"
echo "Webhook: ${WEBHOOK_URL:0:40}..."
echo ""

# Test 1: Send info alert
echo "Test 1: Sending info alert..."
RESPONSE=$(curl -s -X POST "$API_URL/api/notifications/slack" \
  -H "Content-Type: application/json" \
  -d "{
    \"webhookUrl\": \"$WEBHOOK_URL\",
    \"level\": \"info\",
    \"type\": \"significance\",
    \"title\": \"Test Info Alert\",
    \"message\": \"This is a test info-level notification from the API\"
  }")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Info alert sent successfully"
else
  echo "❌ Info alert failed:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
sleep 1

# Test 2: Send warning alert
echo "Test 2: Sending warning alert..."
RESPONSE=$(curl -s -X POST "$API_URL/api/notifications/slack" \
  -H "Content-Type: application/json" \
  -d "{
    \"webhookUrl\": \"$WEBHOOK_URL\",
    \"level\": \"warning\",
    \"type\": \"performance\",
    \"title\": \"Test Warning Alert\",
    \"message\": \"API latency exceeded threshold\",
    \"metric\": \"p95_latency_ms\",
    \"value\": 750,
    \"threshold\": 500
  }")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Warning alert sent successfully"
else
  echo "❌ Warning alert failed:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
sleep 1

# Test 3: Send critical alert
echo "Test 3: Sending critical alert..."
RESPONSE=$(curl -s -X POST "$API_URL/api/notifications/slack" \
  -H "Content-Type: application/json" \
  -d "{
    \"webhookUrl\": \"$WEBHOOK_URL\",
    \"level\": \"critical\",
    \"type\": \"errors\",
    \"title\": \"Test Critical Alert\",
    \"message\": \"Error rate exceeded critical threshold\",
    \"experimentName\": \"test-experiment\",
    \"variantName\": \"variant-a\",
    \"metric\": \"error_rate\",
    \"value\": 8.5,
    \"threshold\": 2.0
  }")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Critical alert sent successfully"
else
  echo "❌ Critical alert failed:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "📊 Test Summary:"
echo "================"
echo "✅ All 3 tests passed!"
echo ""
echo "Next steps:"
echo "1. Check your Slack channel for the test messages"
echo "2. Create a notification config in the database"
echo "3. Integrate into your monitoring system"
