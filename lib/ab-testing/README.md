# A/B Testing Auto-Promotion System

Enterprise-grade automatic promotion system for A/B test winners with comprehensive safety checks, audit logging, and rollback capabilities.

## Features

- **Statistical Significance Detection**: Automatically detects when experiments reach statistical significance
- **Configurable Safety Checks**: 12+ safety checks including sample size, confidence level, error rates, latency, and test duration
- **Auto-Promotion Engine**: Automatically promotes winning variants based on configurable rules
- **Manual Promotion Override**: Force promotion with manual approval when needed
- **Rollback Capability**: Instantly rollback promotions if issues are detected
- **Comprehensive Audit Logging**: Full audit trail of all promotions and rollbacks
- **Exclusion List**: Block critical experiments from auto-promotion
- **Environment-Based Rules**: Different rules for development vs production

## Quick Start

### 1. Run Database Migration

```bash
# Apply the audit log table migration
psql $DATABASE_URL -f lib/db/migrations/013_ab_promotion_audit.sql
```

### 2. Check Promotion Eligibility

```typescript
import { checkPromotionEligibility } from "@/lib/ab-testing";

const eligibility = await checkPromotionEligibility("my-experiment");

console.log(eligibility.recommendation); // "promote" | "wait" | "manual_review" | "not_ready"
console.log(eligibility.reason); // Human-readable explanation
console.log(eligibility.safetyChecks); // Detailed safety check results
```

### 3. Promote a Winning Variant

```typescript
import { promoteWinningVariant } from "@/lib/ab-testing";

const result = await promoteWinningVariant("my-experiment", {
  userId: "admin-user-id",
  triggeredBy: "manual", // or "auto"
});

if (result.success) {
  console.log(`Promoted ${result.winningVariant} to 100% traffic`);
  console.log(`Audit log ID: ${result.auditLogId}`);
}
```

### 4. Rollback if Needed

```typescript
import { rollbackPromotion } from "@/lib/ab-testing";

const rollbackResult = await rollbackPromotion("my-experiment", {
  userId: "admin-user-id",
  reason: "Elevated error rate detected in production",
  restoreTraffic: {
    // Optional: manual traffic distribution
    "variant-1-id": 50,
    "variant-2-id": 50,
  },
});
```

## API Endpoints

### Check Promotion Eligibility

```bash
GET /api/admin/ab-tests/[id]/promote
Headers:
  x-admin-key: your-admin-secret-key

Response:
{
  "success": true,
  "eligibility": {
    "eligible": true,
    "recommendation": "promote",
    "winningVariant": "variant-b",
    "confidenceLevel": 95.0,
    "improvement": 0.05,
    "safetyChecks": [...],
    "reason": "All safety checks passed - ready for auto-promotion"
  },
  "currentTraffic": [...],
  "promotionHistory": [...]
}
```

### Manually Promote Variant

```bash
POST /api/admin/ab-tests/[id]/promote
Headers:
  x-admin-key: your-admin-secret-key
  x-user-id: admin-user-id
Body:
{
  "force": false,  // Skip safety checks (use with caution!)
  "customRules": {
    "minSampleSize": 500,
    "minConfidenceLevel": 90
  }
}

Response:
{
  "success": true,
  "message": "Successfully promoted 'variant-b' to 100% traffic",
  "winningVariant": "variant-b",
  "action": "promoted",
  "auditLogId": "uuid-here",
  "updatedTraffic": [...]
}
```

### Rollback Promotion

```bash
DELETE /api/admin/ab-tests/[id]/promote
Headers:
  x-admin-key: your-admin-secret-key
  x-user-id: admin-user-id
Body:
{
  "reason": "Elevated error rate detected",
  "restoreTraffic": {
    "variant-id-1": 50,
    "variant-id-2": 50
  }
}

Response:
{
  "success": true,
  "message": "Successfully rolled back promotion: Elevated error rate detected",
  "rolledBackTo": "variant-id",
  "auditLogId": "uuid-here"
}
```

## Promotion Rules

### Default (Production) Rules

```typescript
{
  minSampleSize: 1000,         // Require 1000+ samples per variant
  minConfidenceLevel: 95,      // 95% confidence (z-score >= 1.96)
  minImprovement: 0.02,        // 2% minimum improvement
  maxErrorRate: 0.05,          // 5% maximum error rate
  maxP95LatencyMs: 3000,       // 3 second p95 latency limit
  minTestDurationHours: 24,    // Run for at least 24 hours
  maxTestDurationHours: 168,   // Force review after 7 days
  requireManualApproval: true  // Default to manual approval
}
```

### Aggressive (Development) Rules

```typescript
{
  minSampleSize: 100,
  minConfidenceLevel: 90,
  minImprovement: 0.01,
  maxErrorRate: 0.10,
  maxP95LatencyMs: 5000,
  minTestDurationHours: 1,
  maxTestDurationHours: 72,
  requireManualApproval: false
}
```

### Custom Rules

```typescript
// Override default rules
const eligibility = await checkPromotionEligibility("my-experiment", {
  minSampleSize: 500,
  minConfidenceLevel: 99,
  requireManualApproval: false,
});
```

### Environment Configuration

Set environment variables to customize behavior:

```bash
# Use custom promotion rules (JSON)
AB_PROMOTION_RULES='{"minSampleSize":500,"minConfidenceLevel":90}'

# Disable auto-promotion in production
NODE_ENV=production  # Uses DEFAULT_PROMOTION_RULES with requireManualApproval=true
```

## Safety Checks

The system performs 12 comprehensive safety checks:

1. **Exclusion List**: Ensure experiment isn't on manual-only list
2. **Winner Sample Size**: Verify winner has sufficient samples
3. **Control Sample Size**: Verify control has sufficient samples
4. **Statistical Confidence**: Check confidence level meets threshold
5. **Improvement Threshold**: Verify minimum improvement achieved
6. **Winner Error Rate**: Check winner's error rate is acceptable
7. **Error Rate Comparison**: Winner shouldn't be worse than control
8. **Winner Latency**: Check p95 latency is within limits
9. **Latency Comparison**: Winner shouldn't be significantly slower
10. **Minimum Test Duration**: Ensure test ran long enough
11. **Maximum Test Duration**: Flag tests running too long
12. **Manual Approval**: Require manual review if configured

Each check includes:
- Pass/fail status
- Severity level (info, warning, critical)
- Human-readable message
- Actual value and threshold

## Exclusion List

Block critical experiments from auto-promotion:

```typescript
// lib/ab-testing/promotion-rules.ts
export const AUTO_PROMOTION_EXCLUDE_LIST: Set<string> = new Set([
  "critical-payment-flow",
  "authentication-system",
  "data-migration-test",
]);
```

## Audit Logging

All promotions and rollbacks are logged to the `ab_promotion_audit_log` table:

```typescript
import { getPromotionHistory } from "@/lib/ab-testing";

const history = await getPromotionHistory("my-experiment");

for (const entry of history) {
  console.log(`${entry.action} at ${entry.promotedAt}`);
  console.log(`Winner: ${entry.winningVariantName}`);
  console.log(`Confidence: ${entry.confidenceLevel}%`);
  console.log(`Improvement: ${(entry.improvement * 100).toFixed(2)}%`);

  if (entry.rolledBackAt) {
    console.log(`Rolled back at ${entry.rolledBackAt}: ${entry.rollbackReason}`);
  }
}
```

## Scheduled Auto-Promotion

Set up a cron job to check all experiments periodically:

```typescript
import { checkAllExperimentsForPromotion } from "@/lib/ab-testing";

// Run every hour
const results = await checkAllExperimentsForPromotion();

console.log(`Checked: ${results.checked} experiments`);
console.log(`Eligible: ${results.eligible.length}`);
console.log(`Promoted: ${results.promoted.length}`);
console.log(`Errors: ${results.errors.length}`);
```

## React Components

### Promotion Status Component

```tsx
import { PromotionStatus } from "@/components/monitoring";

function ExperimentDashboard() {
  const [eligibility, setEligibility] = useState(null);

  const checkEligibility = async () => {
    const response = await fetch(`/api/admin/ab-tests/${experimentId}/promote`, {
      headers: { "x-admin-key": adminKey },
    });
    const data = await response.json();
    setEligibility(data.eligibility);
  };

  const handlePromote = async () => {
    const response = await fetch(`/api/admin/ab-tests/${experimentId}/promote`, {
      method: "POST",
      headers: {
        "x-admin-key": adminKey,
        "x-user-id": userId,
        "Content-Type": "application/json",
      },
    });
    // Handle response
  };

  return (
    <PromotionStatus
      experimentId={experimentId}
      experimentName={experimentName}
      isActive={isActive}
      eligibility={eligibility}
      onPromote={handlePromote}
      onCheckEligibility={checkEligibility}
    />
  );
}
```

## TypeScript Types

```typescript
import type {
  PromotionRules,
  PromotionEligibility,
  PromotionSafetyCheck,
  PromotionResult,
  RollbackResult,
  PromotionAuditLog,
} from "@/lib/ab-testing";
```

## Best Practices

1. **Start Conservative**: Use default rules in production, aggressive rules only in dev
2. **Monitor After Promotion**: Watch metrics closely for 24-48 hours after promotion
3. **Use Exclusion List**: Add critical experiments to exclusion list
4. **Review Audit Logs**: Regularly review promotion history for patterns
5. **Test Duration**: Let experiments run for at least 24 hours before promoting
6. **Sample Size**: Ensure both variants have sufficient sample size (1000+ recommended)
7. **Quick Rollback**: Have rollback plan ready when promoting manually
8. **Custom Rules**: Override rules when you have specific requirements

## Troubleshooting

### Experiment Not Eligible

Check the safety checks to see which ones failed:

```typescript
const eligibility = await checkPromotionEligibility("my-experiment");

const failed = eligibility.safetyChecks.filter((c) => !c.passed);
console.log("Failed checks:", failed);
```

### Force Promotion

In emergencies, you can force promotion (skips safety checks):

```typescript
const result = await promoteWinningVariant("my-experiment", {
  force: true,
  triggeredBy: "manual",
  userId: "admin-user-id",
});
```

### Rollback Failed Promotion

If you promoted too early:

```typescript
const rollback = await rollbackPromotion("my-experiment", {
  reason: "Premature promotion - need more data",
  userId: "admin-user-id",
});
```

## Security

- All promotion endpoints require admin authentication (`x-admin-key` header)
- User tracking via optional `x-user-id` header
- All actions logged to audit table with timestamps
- Rollback capability for quick recovery

## Performance

- Promotion checks use existing monitoring queries (no additional DB load)
- Caching is inherited from monitoring system (5-minute TTL)
- Audit log table is indexed for fast queries
- Safety checks run in memory (no additional DB queries)

## Further Reading

- Statistical Significance: See `lib/monitoring/ab-test-metrics.ts` for Z-test implementation
- Monitoring System: See `lib/monitoring/README.md` for metrics collection
- Database Schema: See `lib/db/migrations/013_ab_promotion_audit.sql` for table structure
