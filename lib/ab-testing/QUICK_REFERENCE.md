# A/B Testing Auto-Promotion - Quick Reference

## Installation

```bash
# 1. Apply database migration
psql $DATABASE_URL -f lib/db/migrations/013_ab_promotion_audit.sql

# 2. Run integration test
npx tsx scripts/test-auto-promotion.ts
```

## Basic Usage

```typescript
import {
  checkPromotionEligibility,
  promoteWinningVariant,
  rollbackPromotion,
} from "@/lib/ab-testing";
```

### Check Eligibility

```typescript
const eligibility = await checkPromotionEligibility("my-experiment");

// eligibility.recommendation: "promote" | "wait" | "manual_review" | "not_ready"
// eligibility.safetyChecks: array of 12 safety checks
```

### Promote Winner

```typescript
const result = await promoteWinningVariant("my-experiment", {
  userId: "admin-123",
  triggeredBy: "manual",
});

// result.success: boolean
// result.winningVariant: string
// result.auditLogId: string
```

### Rollback

```typescript
const rollback = await rollbackPromotion("my-experiment", {
  userId: "admin-123",
  reason: "Error rate spike",
});
```

## API Endpoints

```bash
# Check eligibility
GET /api/admin/ab-tests/[id]/promote
Headers: x-admin-key: $ADMIN_SECRET_KEY

# Promote winner
POST /api/admin/ab-tests/[id]/promote
Headers: x-admin-key: $ADMIN_SECRET_KEY, x-user-id: admin-123
Body: {"force": false, "customRules": {...}}

# Rollback
DELETE /api/admin/ab-tests/[id]/promote
Headers: x-admin-key: $ADMIN_SECRET_KEY, x-user-id: admin-123
Body: {"reason": "...", "restoreTraffic": {...}}
```

## Default Rules (Production)

- Min Sample Size: 1000
- Min Confidence: 95%
- Min Improvement: 2%
- Max Error Rate: 5%
- Max P95 Latency: 3000ms
- Min Duration: 24 hours
- Manual Approval: Required

## Custom Rules

```typescript
await promoteWinningVariant("my-experiment", {
  customRules: {
    minSampleSize: 500,
    minConfidenceLevel: 90,
    requireManualApproval: false,
  }
});
```

## Safety Checks (12 Total)

1. Exclusion list check
2. Winner sample size
3. Control sample size
4. Statistical confidence
5. Improvement threshold
6. Winner error rate
7. Error rate comparison
8. Winner latency
9. Latency comparison
10. Min test duration
11. Max test duration
12. Manual approval

## React Component

```tsx
import { PromotionStatus } from "@/components/monitoring";

<PromotionStatus
  experimentId={id}
  experimentName={name}
  isActive={true}
  eligibility={eligibility}
  onPromote={handlePromote}
  onCheckEligibility={checkEligibility}
/>
```

## Force Promotion (Emergency)

```typescript
// ⚠️ USE WITH CAUTION - Skips all safety checks
await promoteWinningVariant("my-experiment", {
  force: true,
  triggeredBy: "manual",
});
```

## Auto-Promotion Job

```typescript
import { checkAllExperimentsForPromotion } from "@/lib/ab-testing";

// Run every hour via cron
const results = await checkAllExperimentsForPromotion();
// results.checked, results.eligible, results.promoted
```

## Exclusion List

```typescript
// lib/ab-testing/promotion-rules.ts
export const AUTO_PROMOTION_EXCLUDE_LIST: Set<string> = new Set([
  "critical-payment-flow",
  "authentication-system",
]);
```

## Audit History

```typescript
import { getPromotionHistory } from "@/lib/ab-testing";

const history = await getPromotionHistory("my-experiment");
// Array of PromotionAuditLog entries
```

## Common Patterns

### Check Before Promote

```typescript
const eligibility = await checkPromotionEligibility("my-experiment");

if (eligibility.recommendation === "promote") {
  await promoteWinningVariant("my-experiment", {
    triggeredBy: "auto",
  });
}
```

### Promote with Notification

```typescript
const result = await promoteWinningVariant("my-experiment", {
  userId: "admin-123",
  triggeredBy: "manual",
});

if (result.success) {
  await sendNotification({
    to: "team@company.com",
    subject: "A/B Test Promoted",
    body: `${result.winningVariant} promoted to 100% traffic`,
  });
}
```

### Rollback with Custom Traffic

```typescript
await rollbackPromotion("my-experiment", {
  userId: "admin-123",
  reason: "Gradual rollback for monitoring",
  restoreTraffic: {
    "control-id": 70,
    "variant-id": 30,
  }
});
```

## Environment Variables

```bash
# Custom rules (JSON)
AB_PROMOTION_RULES='{"minSampleSize":500}'

# Environment (affects defaults)
NODE_ENV=production  # Conservative rules
NODE_ENV=development # Aggressive rules
```

## File Locations

```
lib/ab-testing/
├── index.ts                 # Main exports
├── promotion-rules.ts       # Rules & safety checks
├── auto-promotion.ts        # Promotion engine
├── README.md               # Full documentation
├── example-usage.ts        # 10 examples
└── QUICK_REFERENCE.md      # This file

app/api/admin/ab-tests/[id]/promote/route.ts  # API endpoints
components/monitoring/PromotionStatus.tsx      # React component
lib/db/migrations/013_ab_promotion_audit.sql   # Database schema
scripts/test-auto-promotion.ts                 # Integration test
```

## TypeScript Types

```typescript
import type {
  PromotionRules,           // Configuration rules
  PromotionEligibility,     // Eligibility result
  PromotionSafetyCheck,     // Individual check
  PromotionResult,          // Promotion result
  RollbackResult,           // Rollback result
  PromotionAuditLog,        // Audit log entry
} from "@/lib/ab-testing";
```

## Error Handling

```typescript
try {
  const result = await promoteWinningVariant("my-experiment", {
    userId: "admin-123",
    triggeredBy: "manual",
  });

  if (!result.success) {
    console.error(`Promotion failed: ${result.message}`);
    // Check result.action: "ineligible" | "already_promoted" | "failed"
  }
} catch (error) {
  console.error("Unexpected error:", error);
  // Handle database errors, network errors, etc.
}
```

## Testing

```bash
# Run full integration test
npx tsx scripts/test-auto-promotion.ts

# Run specific example
npx tsx lib/ab-testing/example-usage.ts
```

## Best Practices

1. ✅ Let tests run 24+ hours
2. ✅ Use conservative rules in production
3. ✅ Monitor for 24-48h after promotion
4. ✅ Add critical flows to exclusion list
5. ✅ Review audit logs regularly
6. ✅ Have rollback plan ready
7. ✅ Test in development first
8. ❌ Don't force promote without reason
9. ❌ Don't skip safety checks casually
10. ❌ Don't promote without sufficient samples

## Quick Troubleshooting

**Not eligible?**
```typescript
const eligibility = await checkPromotionEligibility("my-experiment");
const failed = eligibility.safetyChecks.filter(c => !c.passed);
console.log("Failed:", failed.map(c => c.message));
```

**Need to force?**
```typescript
await promoteWinningVariant("my-experiment", { force: true });
```

**Promoted too early?**
```typescript
await rollbackPromotion("my-experiment", {
  reason: "Premature - need more data",
});
```

## Support Resources

- Full docs: `lib/ab-testing/README.md`
- Examples: `lib/ab-testing/example-usage.ts`
- Test script: `scripts/test-auto-promotion.ts`
- Project docs: `EXPERIMENT_AUTO_PROMOTION.md`
