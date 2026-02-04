# Auto-Promotion Quick Reference

One-page reference for the Experiment Winner Auto-Promotion system.

## Quick Start

```typescript
import { checkPromotionEligibility, promoteWinner } from "@/lib/monitoring/auto-promotion";

// 1. Check if eligible
const eligibility = await checkPromotionEligibility("my-experiment");

// 2. Promote if ready
if (eligibility.isEligible) {
  await promoteWinner("my-experiment", "manual", "user-id");
}
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/monitoring/experiments/{name}/promote` | GET | Check eligibility |
| `/api/monitoring/experiments/{name}/promote` | POST | Promote winner |
| `/api/monitoring/experiments/{name}/promote` | DELETE | Rollback |
| `/api/monitoring/experiments/{name}/history` | GET | View history |
| `/api/monitoring/auto-promotion/check` | POST | Cron job |

## Safety Checks (Default Thresholds)

| Check | Default | Purpose |
|-------|---------|---------|
| Sample Size | 1,000/variant | Statistical validity |
| Confidence | 95% | Z-score >= 1.96 |
| Improvement | 5% | Meaningful difference |
| Runtime | 48 hours | Day-of-week effects |
| Error Rate | 5% max | Production quality |

## Functions

### Check Eligibility
```typescript
const eligibility = await checkPromotionEligibility(
  "experiment-name",
  config? // Optional custom config
);
```

**Returns:**
```typescript
{
  isEligible: boolean;
  winner?: string;
  confidence?: number;
  improvement?: number;
  reasons: string[];
  warnings: string[];
  safetyChecks: {
    minSampleSize: boolean;
    minConfidence: boolean;
    minImprovement: boolean;
    minRuntime: boolean;
    errorRateAcceptable: boolean;
  }
}
```

### Promote Winner
```typescript
const promotion = await promoteWinner(
  "experiment-name",
  "manual" | "auto",
  "user-id",
  config? // Optional
);
```

**Returns:** `PromotionRecord` with id, confidence, improvement, etc.

### Rollback
```typescript
await rollbackPromotion(
  "experiment-name",
  "reason",
  "user-id"
);
```

### Get History
```typescript
const history = await getPromotionHistory("experiment-name");
```

**Returns:** `PromotionRecord[]`

### Auto-Check All
```typescript
const results = await autoCheckPromotions("user-id", config?);
```

**Returns:**
```typescript
{
  checked: number;
  promoted: number;
  eligible: string[];
  promoted_experiments: string[];
}
```

## Custom Configuration

```typescript
const config: PromotionConfig = {
  minSampleSize: 2000,           // Per variant
  minConfidenceLevel: 99.0,      // Percentage
  minImprovementPercent: 10.0,   // Percentage
  minRuntimeHours: 96,           // Hours
  maxErrorRate: 0.02,            // Decimal (2%)
  requireManualApproval: true,   // Boolean
};

await checkPromotionEligibility("exp", config);
```

## Environment Variables

```bash
AUTO_PROMOTION_ENABLED=true
AUTO_PROMOTION_MIN_SAMPLE_SIZE=1000
AUTO_PROMOTION_MIN_CONFIDENCE=95.0
AUTO_PROMOTION_MIN_IMPROVEMENT=5.0
AUTO_PROMOTION_MIN_RUNTIME_HOURS=48
AUTO_PROMOTION_MAX_ERROR_RATE=0.05
AUTO_PROMOTION_REQUIRE_MANUAL=false
AUTO_PROMOTION_CRON_SECRET=secret
```

## API Examples

### Check Eligibility (GET)
```bash
curl "http://localhost:3000/api/monitoring/experiments/my-exp/promote"
```

### Promote Winner (POST)
```bash
curl -X POST "http://localhost:3000/api/monitoring/experiments/my-exp/promote" \
  -H "Content-Type: application/json" \
  -d '{
    "promotionType": "manual",
    "promotedBy": "user-123",
    "userId": "user-123"
  }'
```

### Rollback (DELETE)
```bash
curl -X DELETE "http://localhost:3000/api/monitoring/experiments/my-exp/promote" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Error rate spike",
    "rolledBackBy": "user-123"
  }'
```

### Get History (GET)
```bash
curl "http://localhost:3000/api/monitoring/experiments/my-exp/history"
```

### Cron Job (POST)
```bash
curl -X POST "http://localhost:3000/api/monitoring/auto-promotion/check" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin",
    "cronSecret": "your-secret"
  }'
```

## Common Patterns

### Pattern 1: Manual Approval Workflow
```typescript
// 1. Check eligibility
const eligibility = await checkPromotionEligibility("exp");

// 2. Send notification to admin
if (eligibility.isEligible) {
  await sendNotification({
    userId: "admin",
    level: "info",
    type: "significance",
    title: "Experiment Ready for Promotion",
    message: `${eligibility.winner} is ready (${eligibility.confidence}% confidence)`
  });
}

// 3. Admin manually promotes
await promoteWinner("exp", "manual", "admin-user-id");
```

### Pattern 2: Fully Automated
```typescript
// Run hourly via cron
const results = await autoCheckPromotions("system", {
  ...DEFAULT_PROMOTION_CONFIG,
  requireManualApproval: false, // Auto-promote
});

console.log(`Auto-promoted: ${results.promoted_experiments.join(", ")}`);
```

### Pattern 3: Conservative Approval
```typescript
const strictConfig = {
  minSampleSize: 5000,
  minConfidenceLevel: 99.0,
  minImprovementPercent: 15.0,
  minRuntimeHours: 168, // 1 week
  maxErrorRate: 0.01,
  requireManualApproval: true,
};

const eligibility = await checkPromotionEligibility("exp", strictConfig);
```

## Notifications

Promotions automatically trigger notifications via:
- Slack
- PagerDuty
- Email

**Notification includes:**
- Experiment name
- Winning variant
- Confidence level
- Improvement percentage
- Sample size
- Warnings (if any)

## Database Queries

### Check Active Promotions
```sql
SELECT experiment_name, promoted_variant_name, confidence, improvement
FROM experiment_promotions
WHERE rollback_at IS NULL
ORDER BY promoted_at DESC;
```

### Get Promotion Stats
```sql
SELECT * FROM get_promotion_stats();
```

### View Eligibility
```sql
SELECT * FROM experiment_promotion_eligibility
WHERE is_active = true;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Not eligible | Check `eligibility.reasons` for details |
| Sample size too small | Wait for more traffic |
| No statistical significance | Need clearer winner or more samples |
| Runtime too short | Wait until minimum hours passed |
| Error rate too high | Fix errors in variant before promoting |

## Warnings (Non-blocking)

Promotions can succeed with warnings:
- Winner has higher error rate than control
- Winner has 20%+ higher latency

Review warnings carefully before proceeding.

## Rollback Scenarios

When to rollback:
- Error rate spike after promotion
- Latency degradation
- User complaints
- Business metrics decline

```typescript
await rollbackPromotion("exp", "Error rate increased from 2% to 8%", "oncall");
```

## Monitoring Dashboard

Check promotion status:

```typescript
import { getPromotionHistory } from "@/lib/monitoring/auto-promotion";

const history = await getPromotionHistory("exp");

console.log(`Total promotions: ${history.length}`);
console.log(`Active: ${history.filter(p => !p.rollbackAt).length}`);
console.log(`Rolled back: ${history.filter(p => p.rollbackAt).length}`);
```

## Integration with Alert System

```typescript
import { scheduleAutoPromotionChecks } from "@/lib/monitoring/alert-notifier";

// Call periodically
await scheduleAutoPromotionChecks("admin-user-id");
```

## Testing

```typescript
// In test environment
const testConfig = {
  minSampleSize: 10,
  minConfidenceLevel: 80.0,
  minImprovementPercent: 1.0,
  minRuntimeHours: 0.1,
  maxErrorRate: 0.5,
  requireManualApproval: false,
};

await promoteWinner("test-exp", "auto", undefined, testConfig);
await rollbackPromotion("test-exp", "Testing rollback", "test-user");
```

## Files Reference

| File | Purpose |
|------|---------|
| `auto-promotion.ts` | Core logic |
| `auto-promotion-example.ts` | Usage examples |
| `AUTO_PROMOTION.md` | Full documentation |
| `QUICK_REFERENCE.md` | This file |
| `experiments/[name]/promote/route.ts` | API endpoints |
| `013_experiment_promotions.sql` | Database schema |

## Support

- Full docs: `/lib/monitoring/AUTO_PROMOTION.md`
- Examples: `/lib/monitoring/auto-promotion-example.ts`
- Tests: `/lib/monitoring/__tests__/auto-promotion.test.ts`

---

**Quick Reference v1.0** - Tyler-TypeScript - 2025-12-28
