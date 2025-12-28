# A/B Testing Auto-Promotion System

Enterprise-grade automatic promotion system for A/B test winners with comprehensive safety checks, audit logging, and rollback capabilities.

## Overview

This system automatically detects when A/B test experiments have reached statistical significance and promotes the winning variant to 100% traffic. It includes:

- 12+ comprehensive safety checks
- Configurable promotion rules for different environments
- Full audit trail with rollback capability
- Admin API endpoints for manual control
- React component for dashboard integration
- Scheduled auto-promotion support

## Quick Start

### 1. Database Setup

Apply the audit log migration:

```bash
psql $DATABASE_URL -f /root/github-repos/sierra-fred-carey/lib/db/migrations/013_ab_promotion_audit.sql
```

This creates the `ab_promotion_audit_log` table with proper indexes.

### 2. Check Experiment Eligibility

```typescript
import { checkPromotionEligibility } from "@/lib/ab-testing";

const eligibility = await checkPromotionEligibility("my-experiment");

console.log(eligibility.recommendation); // "promote" | "wait" | "manual_review" | "not_ready"
console.log(eligibility.winningVariant); // "variant-b"
console.log(eligibility.confidenceLevel); // 95.0
```

### 3. Promote Winner

```typescript
import { promoteWinningVariant } from "@/lib/ab-testing";

const result = await promoteWinningVariant("my-experiment", {
  userId: "admin-user-id",
  triggeredBy: "manual",
});

console.log(result.message); // "Successfully promoted 'variant-b' to 100% traffic"
```

### 4. Rollback if Needed

```typescript
import { rollbackPromotion } from "@/lib/ab-testing";

const rollback = await rollbackPromotion("my-experiment", {
  userId: "admin-user-id",
  reason: "Elevated error rate detected",
});
```

## File Structure

```
/root/github-repos/sierra-fred-carey/
├── lib/
│   ├── ab-testing/
│   │   ├── index.ts                  # Main exports
│   │   ├── promotion-rules.ts        # Safety checks & rules
│   │   ├── auto-promotion.ts         # Promotion engine
│   │   ├── README.md                 # Detailed documentation
│   │   └── example-usage.ts          # 10 usage examples
│   └── db/
│       └── migrations/
│           └── 013_ab_promotion_audit.sql  # Database schema
├── app/
│   └── api/
│       └── admin/
│           └── ab-tests/
│               └── [id]/
│                   └── promote/
│                       └── route.ts   # GET/POST/DELETE endpoints
├── components/
│   └── monitoring/
│       ├── PromotionStatus.tsx        # React component
│       └── index.ts                   # Updated exports
└── scripts/
    └── test-auto-promotion.ts         # Integration test script
```

## API Endpoints

### GET /api/admin/ab-tests/[id]/promote

Check promotion eligibility.

**Headers:**
- `x-admin-key`: Admin secret key (required)

**Response:**
```json
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

### POST /api/admin/ab-tests/[id]/promote

Manually promote the winning variant.

**Headers:**
- `x-admin-key`: Admin secret key (required)
- `x-user-id`: User ID (optional)

**Body:**
```json
{
  "force": false,
  "customRules": {
    "minSampleSize": 500,
    "minConfidenceLevel": 90
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully promoted 'variant-b' to 100% traffic",
  "winningVariant": "variant-b",
  "action": "promoted",
  "auditLogId": "uuid-here",
  "updatedTraffic": [...]
}
```

### DELETE /api/admin/ab-tests/[id]/promote

Rollback a promotion.

**Headers:**
- `x-admin-key`: Admin secret key (required)
- `x-user-id`: User ID (optional)

**Body:**
```json
{
  "reason": "Elevated error rate detected",
  "restoreTraffic": {
    "variant-id-1": 50,
    "variant-id-2": 50
  }
}
```

## Safety Checks

The system performs 12 comprehensive checks:

1. **Exclusion List** - Experiment not on manual-only list
2. **Winner Sample Size** - Sufficient samples (default: 1000+)
3. **Control Sample Size** - Sufficient samples (default: 1000+)
4. **Statistical Confidence** - Meets confidence threshold (default: 95%)
5. **Improvement Threshold** - Minimum improvement achieved (default: 2%)
6. **Winner Error Rate** - Within acceptable limits (default: <5%)
7. **Error Rate Comparison** - Winner not worse than control
8. **Winner Latency** - P95 latency acceptable (default: <3000ms)
9. **Latency Comparison** - Winner not significantly slower
10. **Minimum Test Duration** - Ran long enough (default: 24h)
11. **Maximum Test Duration** - Flag if too long (default: 7 days)
12. **Manual Approval** - Required if configured

## Promotion Rules

### Production (Default)
```typescript
{
  minSampleSize: 1000,
  minConfidenceLevel: 95,
  minImprovement: 0.02,        // 2%
  maxErrorRate: 0.05,          // 5%
  maxP95LatencyMs: 3000,
  minTestDurationHours: 24,
  maxTestDurationHours: 168,
  requireManualApproval: true
}
```

### Development (Aggressive)
```typescript
{
  minSampleSize: 100,
  minConfidenceLevel: 90,
  minImprovement: 0.01,        // 1%
  maxErrorRate: 0.10,          // 10%
  maxP95LatencyMs: 5000,
  minTestDurationHours: 1,
  maxTestDurationHours: 72,
  requireManualApproval: false
}
```

### Custom Rules
```typescript
await promoteWinningVariant("my-experiment", {
  customRules: {
    minSampleSize: 500,
    minConfidenceLevel: 99,
  }
});
```

## React Component

```tsx
import { PromotionStatus } from "@/components/monitoring";

function ExperimentDashboard() {
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

## Scheduled Auto-Promotion

Set up a cron job to check all experiments:

```typescript
import { checkAllExperimentsForPromotion } from "@/lib/ab-testing";

// Run every hour
const results = await checkAllExperimentsForPromotion();

console.log(`Checked: ${results.checked}`);
console.log(`Promoted: ${results.promoted.length}`);
```

## Testing

Run the integration test:

```bash
npx tsx /root/github-repos/sierra-fred-carey/scripts/test-auto-promotion.ts
```

This will:
1. Create a test experiment with 2 variants
2. Insert 2000 simulated requests
3. Check promotion eligibility
4. Perform manual promotion
5. View promotion history
6. Test rollback
7. Clean up test data

## Environment Variables

```bash
# Custom promotion rules (JSON)
AB_PROMOTION_RULES='{"minSampleSize":500,"minConfidenceLevel":90}'

# Environment mode (affects default rules)
NODE_ENV=production  # Uses conservative rules
NODE_ENV=development # Uses aggressive rules
```

## Audit Trail

All promotions are logged to `ab_promotion_audit_log`:

```typescript
import { getPromotionHistory } from "@/lib/ab-testing";

const history = await getPromotionHistory("my-experiment");

for (const entry of history) {
  console.log(`${entry.action} at ${entry.promotedAt}`);
  console.log(`Winner: ${entry.winningVariantName}`);
  console.log(`Confidence: ${entry.confidenceLevel}%`);

  if (entry.rolledBackAt) {
    console.log(`Rolled back: ${entry.rollbackReason}`);
  }
}
```

## Exclusion List

Block critical experiments from auto-promotion:

```typescript
// lib/ab-testing/promotion-rules.ts
export const AUTO_PROMOTION_EXCLUDE_LIST: Set<string> = new Set([
  "critical-payment-flow",
  "authentication-system",
]);
```

## Best Practices

1. **Let Tests Run** - Minimum 24 hours for statistical validity
2. **Monitor After Promotion** - Watch metrics for 24-48 hours
3. **Use Conservative Rules** - Default rules in production
4. **Quick Rollback** - Be ready to rollback if issues detected
5. **Review Audit Logs** - Regularly check promotion history
6. **Exclude Critical Flows** - Add sensitive experiments to exclusion list

## Troubleshooting

### Experiment Not Eligible

Check which safety checks failed:

```typescript
const eligibility = await checkPromotionEligibility("my-experiment");

const failed = eligibility.safetyChecks.filter(c => !c.passed);
console.log("Failed checks:", failed);
```

### Force Promotion (Emergency)

```typescript
const result = await promoteWinningVariant("my-experiment", {
  force: true,  // Skips safety checks
  triggeredBy: "manual",
});
```

### Rollback After Promotion

```typescript
const rollback = await rollbackPromotion("my-experiment", {
  reason: "Elevated error rate in production",
  restoreTraffic: {
    "control-id": 70,
    "variant-id": 30,
  }
});
```

## Security

- All endpoints require `x-admin-key` header authentication
- User tracking via optional `x-user-id` header
- Complete audit trail with timestamps
- Rollback capability for incident response

## Further Documentation

- **Detailed Guide**: `/root/github-repos/sierra-fred-carey/lib/ab-testing/README.md`
- **Code Examples**: `/root/github-repos/sierra-fred-carey/lib/ab-testing/example-usage.ts`
- **Test Script**: `/root/github-repos/sierra-fred-carey/scripts/test-auto-promotion.ts`
- **Migration**: `/root/github-repos/sierra-fred-carey/lib/db/migrations/013_ab_promotion_audit.sql`

## Support

For issues or questions:
1. Check the detailed README in `lib/ab-testing/README.md`
2. Review example usage in `lib/ab-testing/example-usage.ts`
3. Run the test script to verify setup
4. Check promotion history for audit trail
