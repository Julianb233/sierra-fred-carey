# Experiment Winner Auto-Promotion System

Comprehensive guide for using the experiment winner auto-promotion workflow.

## Overview

The auto-promotion system automatically promotes winning experiment variants to production when they reach statistical significance and meet safety thresholds. It includes:

- **Statistical significance testing** with Z-test for proportions
- **Safety checks** for error rates, latency, and sample sizes
- **Audit logging** for compliance tracking
- **Rollback capabilities** for quick recovery
- **Gradual or immediate** promotion strategies
- **Automated scheduling** via cron jobs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Auto-Promotion Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Scheduler runs periodically (hourly)                     │
│  2. Checks all active experiments                            │
│  3. For each experiment:                                     │
│     a. Fetch metrics from monitoring system                  │
│     b. Calculate statistical significance                    │
│     c. Run safety checks (error rate, latency, etc.)         │
│     d. Determine if clear winner exists                      │
│     e. Apply promotion if eligible                           │
│     f. Create audit log                                      │
│     g. Send notifications                                    │
│  4. Archive losing variants (optional)                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Files

### 1. Type Definitions: `/types/promotion.ts`

Comprehensive TypeScript interfaces:

```typescript
import type {
  PromotionConfig,
  PromotionResult,
  PromotionAuditLog,
  PromotionEligibilityAnalysis,
  SafetyCheckResult,
  RollbackOptions,
  BatchPromotionCheckResult,
} from "@/types/promotion";
```

### 2. Promotion Logic: `/lib/experiment-promoter.ts`

Core promotion functions:

```typescript
import {
  hasStatisticalSignificance,
  hasClearWinner,
  applyPromotion,
  createPromotionAuditLog,
  archiveLosingVariants,
} from "@/lib/experiment-promoter";
```

### 3. Auto-Scheduler: `/lib/auto-promotion-scheduler.ts`

Automated checking and promotion:

```typescript
import {
  checkExperimentsForPromotion,
  getSchedulerStatus,
  DEFAULT_SCHEDULER_CONFIG,
} from "@/lib/auto-promotion-scheduler";
```

### 4. API Routes

- `POST /api/monitoring/experiments/[name]/promote` - Manual promotion
- `DELETE /api/monitoring/experiments/[name]/promote` - Rollback
- `GET /api/monitoring/experiments/[name]/promote` - Check eligibility
- `POST /api/monitoring/auto-promotion/check` - Run scheduler

## Usage Examples

### Check if Experiment is Ready for Promotion

```typescript
import { hasClearWinner } from "@/lib/experiment-promoter";
import { compareExperimentVariants } from "@/lib/monitoring/ab-test-metrics";
import { DEFAULT_PROMOTION_CONFIG } from "@/types/promotion";

const experimentName = "new-checkout-flow";

// Get experiment metrics
const comparison = await compareExperimentVariants(experimentName);

// Check for clear winner
const result = hasClearWinner(comparison.variants, DEFAULT_PROMOTION_CONFIG);

if (result.hasWinner) {
  console.log(`Winner: ${result.winnerVariant!.variantName}`);
  console.log(`Confidence: ${result.confidence}%`);
  console.log(`Improvement: ${result.improvement.toFixed(2)}%`);
} else {
  console.log("No clear winner:", result.reasons);
}
```

### Manually Promote a Winner

```typescript
import { applyPromotion, createPromotionAuditLog } from "@/lib/experiment-promoter";

const experimentId = "exp-123";
const winnerVariantId = "var-456";

// Apply immediate promotion
const result = await applyPromotion(experimentId, winnerVariantId, "immediate");

if (result.success) {
  // Create audit log
  await createPromotionAuditLog(
    experimentId,
    "new-checkout-flow",
    winnerVariantId,
    "variant-b",
    controlVariantId,
    "control",
    {
      confidence: 97.5,
      improvement: 12.3,
      sampleSize: 5000,
      promotionType: "manual",
      promotedBy: "user-789",
      strategy: "immediate",
      safetyChecks: {
        minSampleSize: true,
        minConfidence: true,
        minImprovement: true,
        minRuntime: true,
        errorRateAcceptable: true,
      },
    }
  );
}
```

### Gradual Promotion

```typescript
import { applyPromotion } from "@/lib/experiment-promoter";

// First, promote to 75%
const gradualResult = await applyPromotion(
  experimentId,
  winnerVariantId,
  "gradual"
);

// Monitor for issues...
// If all good, promote to 100%
const fullResult = await applyPromotion(
  experimentId,
  winnerVariantId,
  "immediate"
);
```

### Run Auto-Promotion Scheduler

```typescript
import { checkExperimentsForPromotion } from "@/lib/auto-promotion-scheduler";

// Run with default config
const results = await checkExperimentsForPromotion();

console.log(`Checked: ${results.experimentsChecked}`);
console.log(`Eligible: ${results.experimentsEligible}`);
console.log(`Promoted: ${results.experimentsPromoted}`);

// Run with custom config
const customResults = await checkExperimentsForPromotion({
  enabled: true,
  dryRun: false,
  minSampleSize: 2000,
  minConfidenceLevel: 99,
  minImprovementPercent: 10,
  minRuntimeHours: 72,
  maxErrorRate: 0.03,
  requireManualApproval: false,
  archiveLosingVariants: true,
  sendNotifications: true,
  notificationUserId: "admin-user-id",
});
```

### Rollback a Promotion

```typescript
import { rollbackPromotion } from "@/lib/monitoring/auto-promotion";

await rollbackPromotion("new-checkout-flow", "High error rate detected", "user-123");
```

## API Usage

### Check Promotion Eligibility (GET)

```bash
curl -X GET \
  "http://localhost:3000/api/monitoring/experiments/new-checkout-flow/promote?minSampleSize=1000&minConfidenceLevel=95"
```

Response:
```json
{
  "success": true,
  "data": {
    "experimentName": "new-checkout-flow",
    "isEligible": true,
    "winner": "variant-b",
    "confidence": 97.5,
    "improvement": 12.3,
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

### Promote Winner (POST)

```bash
curl -X POST \
  http://localhost:3000/api/monitoring/experiments/new-checkout-flow/promote \
  -H "Content-Type: application/json" \
  -d '{
    "promotionType": "manual",
    "promotedBy": "user-123",
    "userId": "user-123"
  }'
```

### Rollback Promotion (DELETE)

```bash
curl -X DELETE \
  http://localhost:3000/api/monitoring/experiments/new-checkout-flow/promote \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "High error rate detected",
    "rolledBackBy": "user-123"
  }'
```

### Run Auto-Promotion Check (POST)

```bash
curl -X POST \
  http://localhost:3000/api/monitoring/auto-promotion/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin-user-id",
    "cronSecret": "your-cron-secret"
  }'
```

## Configuration

### Environment Variables

```bash
# Enable/disable auto-promotion
AUTO_PROMOTION_ENABLED=true

# Dry run mode (check but don't promote)
AUTO_PROMOTION_DRY_RUN=false

# Minimum sample size per variant
AUTO_PROMOTION_MIN_SAMPLE=1000

# Minimum confidence level (90, 95, 99, 99.9)
AUTO_PROMOTION_MIN_CONFIDENCE=95

# Minimum improvement percentage
AUTO_PROMOTION_MIN_IMPROVEMENT=5

# Minimum runtime in hours
AUTO_PROMOTION_MIN_RUNTIME=48

# Maximum error rate threshold
AUTO_PROMOTION_MAX_ERROR_RATE=0.05

# Require manual approval
AUTO_PROMOTION_REQUIRE_MANUAL=false

# Archive losing variants
AUTO_PROMOTION_ARCHIVE_LOSERS=true

# Send notifications
AUTO_PROMOTION_SEND_NOTIFICATIONS=true

# Notification user ID
AUTO_PROMOTION_NOTIFICATION_USER_ID=admin-user-id

# Cron secret for security
AUTO_PROMOTION_CRON_SECRET=your-secret-here
```

### Vercel Cron Job

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/monitoring/auto-promotion/check",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Safety Checks

The system performs comprehensive safety checks before promotion:

1. **Sample Size** - Both winner and control must meet minimum sample size
2. **Statistical Confidence** - Must reach required confidence level (default 95%)
3. **Improvement Threshold** - Winner must improve by minimum percentage
4. **Runtime** - Experiment must run for minimum duration
5. **Error Rate** - Winner error rate must be within acceptable limits
6. **Error Rate Comparison** - Winner shouldn't have significantly worse errors than control
7. **Latency** - Winner P95 latency must be acceptable
8. **Latency Comparison** - Winner shouldn't be significantly slower than control

## Best Practices

### 1. Start with Conservative Settings

```typescript
const conservativeConfig: PromotionConfig = {
  minSampleSize: 5000, // Higher sample size
  minConfidenceLevel: 99, // 99% confidence
  minImprovementPercent: 10, // 10% minimum improvement
  minRuntimeHours: 168, // 1 week minimum
  maxErrorRate: 0.01, // 1% max error rate
  requireManualApproval: true, // Manual approval required
  enableGradualRollout: true,
  autoArchiveLosingVariants: false,
};
```

### 2. Use Gradual Rollout for Critical Features

```typescript
// First promote to 75%
await applyPromotion(experimentId, winnerId, "gradual");

// Monitor for 24 hours
// Check error rates, latency, user feedback
// Then promote to 100% if all good
await applyPromotion(experimentId, winnerId, "immediate");
```

### 3. Monitor Promoted Experiments

After promotion, continue monitoring for:
- Error rate spikes
- Latency increases
- User complaints
- Business metric changes

### 4. Enable Dry Run for Testing

```typescript
const dryRunResults = await checkExperimentsForPromotion({
  dryRun: true, // Won't actually promote
});

console.log("Would promote:", dryRunResults.promotions);
```

### 5. Review Audit Logs Regularly

```typescript
import { getPromotionHistory } from "@/lib/monitoring/auto-promotion";

const history = await getPromotionHistory("experiment-name");
for (const entry of history) {
  console.log(`${entry.promotedAt}: ${entry.promotedVariantName}`);
  if (entry.rollbackAt) {
    console.log(`  Rolled back: ${entry.rollbackReason}`);
  }
}
```

## Troubleshooting

### Experiment Not Eligible

Check the eligibility response for reasons:

```typescript
const eligibility = await checkPromotionEligibility(experimentName);
if (!eligibility.isEligible) {
  console.log("Reasons:", eligibility.reasons);
  console.log("Safety checks:", eligibility.safetyChecks);
}
```

### Common Issues

1. **Insufficient sample size** - Wait for more data
2. **Low confidence** - Extend experiment duration
3. **Small improvement** - Consider if experiment is worth promoting
4. **High error rate** - Investigate and fix issues before promoting
5. **Runtime too short** - Wait for minimum runtime

### Rollback After Issues

If you detect issues after promotion:

```typescript
// Immediate rollback
await rollbackPromotion(
  experimentName,
  "Error rate spiked to 5% after promotion",
  "admin-user-id"
);
```

## Database Schema

The system expects these tables:

```sql
-- Experiments table
CREATE TABLE ab_experiments (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  winner_variant_id UUID
);

-- Variants table
CREATE TABLE ab_variants (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES ab_experiments(id),
  variant_name VARCHAR(255),
  traffic_percentage DECIMAL(5,2),
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP
);

-- Promotion audit log
CREATE TABLE experiment_promotions (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES ab_experiments(id),
  experiment_name VARCHAR(255),
  promoted_variant_id UUID REFERENCES ab_variants(id),
  promoted_variant_name VARCHAR(255),
  control_variant_id UUID REFERENCES ab_variants(id),
  control_variant_name VARCHAR(255),
  confidence DECIMAL(5,2),
  improvement DECIMAL(10,4),
  sample_size INTEGER,
  promotion_type VARCHAR(10), -- 'auto' or 'manual'
  promoted_by VARCHAR(255),
  promoted_at TIMESTAMP DEFAULT NOW(),
  rollback_at TIMESTAMP,
  rollback_reason TEXT,
  metadata JSONB
);
```

## Additional Resources

- [A/B Testing Best Practices](./AB_TESTING_BEST_PRACTICES.md)
- [Statistical Significance Guide](./STATISTICAL_SIGNIFICANCE.md)
- [Monitoring Dashboard](./MONITORING_DASHBOARD.md)
- [API Documentation](./API_DOCS.md)
