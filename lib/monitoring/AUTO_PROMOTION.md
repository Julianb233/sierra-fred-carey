# Experiment Winner Auto-Promotion System

Production-grade system for automatically promoting winning A/B test variants with comprehensive safety checks and rollback capabilities.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Safety Checks](#safety-checks)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Monitoring & Alerts](#monitoring--alerts)
- [Best Practices](#best-practices)

## Overview

The Auto-Promotion system automatically detects when A/B test experiments have reached statistical significance and promotes winning variants to production. It includes multiple safety checks, rollback capabilities, and comprehensive audit trails.

### Key Benefits

- **Automated Decision Making**: No manual monitoring required
- **Safety First**: Multiple validation checks before promotion
- **Full Audit Trail**: Complete promotion history with rollback tracking
- **Real-time Notifications**: Immediate alerts on promotions via Slack/PagerDuty
- **Flexible Configuration**: Customizable thresholds per experiment

## Features

### Core Features

1. **Eligibility Checking**
   - Statistical significance validation (Z-test)
   - Minimum sample size requirements
   - Confidence level thresholds (95%, 99%, etc.)
   - Improvement percentage validation
   - Runtime duration checks
   - Error rate limits

2. **Auto-Promotion**
   - Automatic winner selection
   - Traffic rebalancing (winner gets 100%)
   - Experiment deactivation
   - Promotion record creation

3. **Rollback Support**
   - One-click rollback to control
   - Traffic restoration
   - Experiment reactivation
   - Rollback reason tracking

4. **History Tracking**
   - Complete promotion audit trail
   - Metrics snapshots at promotion time
   - Rollback history
   - User attribution

5. **Notifications**
   - Slack notifications on promotion
   - PagerDuty alerts for critical changes
   - Email summaries
   - Warning notifications for edge cases

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Auto-Promotion Flow                      │
└─────────────────────────────────────────────────────────────┘

1. Scheduled Check (Hourly Cron)
   ↓
2. Get Active Experiments
   ↓
3. For Each Experiment:
   ├── Fetch Metrics (ab-test-metrics.ts)
   ├── Calculate Statistical Significance
   ├── Run Safety Checks
   │   ├── Minimum Sample Size ✓
   │   ├── Confidence Level ✓
   │   ├── Improvement Threshold ✓
   │   ├── Runtime Duration ✓
   │   └── Error Rate ✓
   ├── If Eligible:
   │   ├── Create Promotion Record
   │   ├── Update Traffic (100% to winner)
   │   ├── Deactivate Experiment
   │   └── Send Notification
   └── Continue to Next
```

### File Structure

```
lib/monitoring/
├── auto-promotion.ts           # Core promotion logic
├── auto-promotion-example.ts   # Usage examples
├── ab-test-metrics.ts          # Statistical analysis
├── alerts.ts                   # Alert thresholds
├── alert-notifier.ts           # Notification delivery
└── __tests__/
    └── auto-promotion.test.ts  # Comprehensive tests

app/api/monitoring/
├── experiments/[name]/
│   ├── promote/route.ts        # Promotion endpoint
│   └── history/route.ts        # History endpoint
└── auto-promotion/
    └── check/route.ts          # Cron job endpoint

lib/db/migrations/
└── 013_experiment_promotions.sql  # Database schema
```

## Safety Checks

All promotions must pass these safety checks:

### 1. Minimum Sample Size
```typescript
DEFAULT: 1000 requests per variant
```
Ensures statistical validity.

### 2. Confidence Level
```typescript
DEFAULT: 95.0%
```
Z-score >= 1.96 for 95% confidence.

### 3. Improvement Threshold
```typescript
DEFAULT: 5.0%
```
Winner must be meaningfully better than control.

### 4. Runtime Duration
```typescript
DEFAULT: 48 hours
```
Experiment must run long enough to capture day-of-week effects.

### 5. Error Rate
```typescript
DEFAULT: 5.0% maximum
```
Winner cannot have excessive errors.

### Warnings (Non-blocking)

- Winner has higher error rate than control
- Winner has 20%+ higher latency
- Small sample size (< 1000)

## API Reference

### Check Promotion Eligibility

```http
GET /api/monitoring/experiments/{name}/promote
```

**Query Parameters:**
- `minSampleSize` (optional): number
- `minConfidenceLevel` (optional): number
- `minImprovementPercent` (optional): number
- `minRuntimeHours` (optional): number
- `maxErrorRate` (optional): number

**Response:**
```json
{
  "success": true,
  "data": {
    "experimentName": "reality-lens-v2",
    "isEligible": true,
    "winner": "variant-a",
    "winnerVariantId": "uuid",
    "confidence": 95.5,
    "improvement": 12.5,
    "reasons": ["All safety checks passed..."],
    "warnings": [],
    "safetyChecks": {
      "minSampleSize": true,
      "minConfidence": true,
      "minImprovement": true,
      "minRuntime": true,
      "errorRateAcceptable": true
    }
  }
}
```

### Promote Winner

```http
POST /api/monitoring/experiments/{name}/promote
```

**Body:**
```json
{
  "promotionType": "manual",  // "auto" | "manual"
  "promotedBy": "user-123",   // User ID
  "userId": "user-123",       // For notifications
  "config": {                 // Optional custom config
    "minSampleSize": 2000,
    "minConfidenceLevel": 99.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "promotion": {
      "id": "uuid",
      "experimentName": "reality-lens-v2",
      "promotedVariantName": "variant-a",
      "confidence": 95.5,
      "improvement": 12.5,
      "promotedAt": "2025-12-28T12:00:00Z"
    },
    "eligibility": { /* ... */ }
  },
  "message": "Successfully promoted variant variant-a to production"
}
```

### Rollback Promotion

```http
DELETE /api/monitoring/experiments/{name}/promote
```

**Body:**
```json
{
  "reason": "Winner showing increased errors in production",
  "rolledBackBy": "user-123"
}
```

### Get Promotion History

```http
GET /api/monitoring/experiments/{name}/history
```

**Response:**
```json
{
  "success": true,
  "data": {
    "experimentName": "reality-lens-v2",
    "history": [
      {
        "id": "uuid",
        "promotedVariantName": "variant-a",
        "confidence": 95.5,
        "improvement": 12.5,
        "promotionType": "auto",
        "promotedAt": "2025-12-28T12:00:00Z",
        "rollbackAt": null,
        "rollbackReason": null
      }
    ],
    "count": 1,
    "latestPromotion": { /* ... */ }
  }
}
```

### Run Auto-Check (Cron)

```http
POST /api/monitoring/auto-promotion/check
```

**Body:**
```json
{
  "userId": "admin-user-123",
  "cronSecret": "your-secret-here",
  "config": {
    "requireManualApproval": false
  }
}
```

## Usage Examples

### Example 1: Check Eligibility

```typescript
import { checkPromotionEligibility } from "@/lib/monitoring/auto-promotion";

const eligibility = await checkPromotionEligibility("reality-lens-v2");

if (eligibility.isEligible) {
  console.log(`Winner: ${eligibility.winner}`);
  console.log(`Confidence: ${eligibility.confidence}%`);
} else {
  console.log("Not eligible:", eligibility.reasons);
}
```

### Example 2: Manual Promotion

```typescript
import { promoteWinner } from "@/lib/monitoring/auto-promotion";

const promotion = await promoteWinner(
  "reality-lens-v2",
  "manual",
  "user-123"
);

console.log(`Promoted: ${promotion.promotedVariantName}`);
```

### Example 3: Auto-Promotion (All Experiments)

```typescript
import { autoCheckPromotions } from "@/lib/monitoring/auto-promotion";

const results = await autoCheckPromotions("admin-user-123");

console.log(`Checked: ${results.checked}`);
console.log(`Promoted: ${results.promoted}`);
```

### Example 4: Rollback

```typescript
import { rollbackPromotion } from "@/lib/monitoring/auto-promotion";

await rollbackPromotion(
  "reality-lens-v2",
  "Increased error rate detected",
  "user-123"
);
```

## Configuration

### Environment Variables

```bash
# Enable/disable auto-promotion
AUTO_PROMOTION_ENABLED=true

# Require manual approval even when eligible
AUTO_PROMOTION_REQUIRE_MANUAL=false

# Minimum sample size per variant
AUTO_PROMOTION_MIN_SAMPLE_SIZE=1000

# Minimum confidence level (95.0 = 95%)
AUTO_PROMOTION_MIN_CONFIDENCE=95.0

# Minimum improvement percentage
AUTO_PROMOTION_MIN_IMPROVEMENT=5.0

# Minimum runtime in hours
AUTO_PROMOTION_MIN_RUNTIME_HOURS=48

# Maximum error rate
AUTO_PROMOTION_MAX_ERROR_RATE=0.05

# Cron job secret for security
AUTO_PROMOTION_CRON_SECRET=your-secret-here
```

### Custom Config (Per Request)

```typescript
const customConfig: PromotionConfig = {
  minSampleSize: 2000,
  minConfidenceLevel: 99.0,
  minImprovementPercent: 10.0,
  minRuntimeHours: 96,
  maxErrorRate: 0.02,
  requireManualApproval: true,
};

const eligibility = await checkPromotionEligibility(
  "experiment-name",
  customConfig
);
```

## Database Schema

### experiment_promotions Table

```sql
CREATE TABLE experiment_promotions (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id),
  experiment_name TEXT NOT NULL,

  -- Winner info
  promoted_variant_id UUID NOT NULL,
  promoted_variant_name TEXT NOT NULL,

  -- Control info
  control_variant_id UUID NOT NULL,
  control_variant_name TEXT NOT NULL,

  -- Metrics
  confidence DECIMAL(5,2) NOT NULL,
  improvement DECIMAL(8,4) NOT NULL,
  sample_size INTEGER NOT NULL,

  -- Tracking
  promotion_type TEXT NOT NULL, -- 'auto' | 'manual'
  promoted_by UUID,
  promoted_at TIMESTAMP NOT NULL,

  -- Rollback
  rollback_at TIMESTAMP,
  rollback_reason TEXT,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'
);
```

## Monitoring & Alerts

### Notification Triggers

1. **Successful Promotion**
   - Level: `info`
   - Channel: Slack, Email
   - Contains: Winner name, confidence, improvement

2. **Eligibility with Manual Approval**
   - Level: `info`
   - Channel: Slack
   - Contains: Experiment name, approval link

3. **Promotion with Warnings**
   - Level: `warning`
   - Channel: Slack, PagerDuty
   - Contains: Warning details

4. **Rollback Event**
   - Level: `critical`
   - Channel: All channels
   - Contains: Rollback reason, impact

### Scheduled Jobs

Recommended cron schedule:

```yaml
# Vercel cron.config.json
{
  "crons": [
    {
      "path": "/api/monitoring/auto-promotion/check",
      "schedule": "0 * * * *"  # Every hour
    }
  ]
}
```

## Best Practices

### 1. Start Conservative

Begin with strict thresholds and relax over time:

```typescript
const conservativeConfig = {
  minSampleSize: 5000,
  minConfidenceLevel: 99.0,
  minImprovementPercent: 15.0,
  minRuntimeHours: 168, // 1 week
  requireManualApproval: true,
};
```

### 2. Monitor Post-Promotion

Always monitor metrics after promotion for 24-48 hours:

- Error rate spikes
- Latency degradation
- User complaints
- Conversion rate changes

### 3. Test Rollback Procedure

Regularly test rollback to ensure it works:

```typescript
// Test in staging
await promoteWinner("test-experiment", "manual", "test-user");
await rollbackPromotion("test-experiment", "Testing rollback", "test-user");
```

### 4. Use Gradual Rollout

Consider gradual rollout after promotion:

```sql
-- Instead of 100% immediately, ramp up gradually
UPDATE ab_variants SET traffic_percentage = 75 WHERE id = 'winner-id';
-- Monitor for 24h, then go to 100%
```

### 5. Document Decisions

Always include metadata in manual promotions:

```typescript
await promoteWinner("experiment-name", "manual", "user-123", {
  ...DEFAULT_PROMOTION_CONFIG,
  metadata: {
    reason: "CEO approval for critical feature",
    reviewers: ["user-456", "user-789"],
    jiraTicket: "PROJ-123",
  },
});
```

### 6. Set Up Alerts

Configure PagerDuty for critical events:

```typescript
// In alert-notifier.ts
if (promotion.warnings.length > 0) {
  await sendNotification({
    userId: "oncall",
    level: "warning",
    type: "significance",
    title: "Promotion with Warnings",
    message: `${experimentName}: ${warnings.join(", ")}`,
  });
}
```

## Troubleshooting

### Promotion Not Triggering

**Check:**
1. Experiment is active: `SELECT * FROM ab_experiments WHERE name = '...'`
2. Sample size is sufficient: `SELECT COUNT(*) FROM ai_requests WHERE variant_id = '...'`
3. Runtime is long enough: Check `start_date`
4. Statistical significance: Check `confidence_level` in metrics

### False Positives

**Solution:** Increase thresholds:
- Raise `minConfidenceLevel` to 99%
- Increase `minSampleSize` to 5000+
- Extend `minRuntimeHours` to 168 (1 week)

### High Error Rate After Promotion

**Immediate Action:**
```typescript
await rollbackPromotion(
  "experiment-name",
  "Error rate spike detected post-promotion",
  "oncall-user"
);
```

## Contributing

When adding new safety checks:

1. Add to `PromotionConfig` interface
2. Update `checkPromotionEligibility` function
3. Add tests in `auto-promotion.test.ts`
4. Update this documentation

## License

MIT
