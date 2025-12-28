# A/B Test Auto-Promotion System

Enterprise-grade automatic promotion system for A/B test winners with comprehensive safety checks and multi-channel notifications.

## Features

- **Automatic Winner Detection**: Statistical significance analysis with configurable confidence thresholds
- **Safety Checks**: Validates error rates, latency, traffic balance, and recent alerts before promotion
- **Multi-Channel Notifications**: Sends alerts via Slack, email, and PagerDuty
- **Dry-Run Mode**: Test promotion logic without executing database changes
- **Configuration Presets**: Pre-configured settings for aggressive, conservative, and balanced promotion strategies
- **Rollback Support**: Easily revert promotions with full audit trail
- **Concurrency Control**: Limit simultaneous promotions to prevent system instability

## Quick Start

### 1. Environment Variables

```bash
# Enable auto-promotion
AUTO_PROMOTION_ENABLED=true

# Dry-run mode (test without executing)
AUTO_PROMOTION_DRY_RUN=false

# Configuration overrides
AUTO_PROMOTION_MIN_CONFIDENCE=95.0
AUTO_PROMOTION_MIN_SAMPLE_SIZE=1000
AUTO_PROMOTION_MIN_IMPROVEMENT=5.0
AUTO_PROMOTION_MIN_RUNTIME_HOURS=24

# Excluded experiments (comma-separated)
AUTO_PROMOTION_EXCLUDED=critical-experiment-1,legacy-test-2
```

### 2. API Usage

#### Scan All Experiments

```bash
curl -X POST http://localhost:3000/api/experiments/auto-promote \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan",
    "preset": "balanced",
    "dryRun": true
  }'
```

#### Check Single Experiment Eligibility

```bash
curl -X POST http://localhost:3000/api/experiments/auto-promote \
  -H "Content-Type: application/json" \
  -d '{
    "action": "check",
    "experimentName": "homepage-hero-test"
  }'
```

#### Promote Specific Experiment

```bash
curl -X POST http://localhost:3000/api/experiments/auto-promote \
  -H "Content-Type: application/json" \
  -d '{
    "action": "promote",
    "experimentName": "homepage-hero-test",
    "config": {
      "notifications": {
        "enabled": true,
        "channels": ["slack", "email"]
      }
    }
  }'
```

#### Rollback Promotion

```bash
curl -X POST http://localhost:3000/api/experiments/auto-promote \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rollback",
    "promotionId": "uuid-here",
    "reason": "Performance degradation detected in production"
  }'
```

#### Get Current Configuration

```bash
curl http://localhost:3000/api/experiments/auto-promote?preset=conservative
```

### 3. Programmatic Usage

```typescript
import {
  scanAndPromoteWinners,
  promoteWinner,
  checkPromotionEligibility,
} from "@/lib/experiments/auto-promotion-engine";
import { loadAutoPromotionConfig } from "@/lib/experiments/auto-promotion-config";

// Scan all experiments
const config = loadAutoPromotionConfig("balanced");
const results = await scanAndPromoteWinners(config);

console.log(`Promoted ${results.promoted} out of ${results.eligible} eligible experiments`);

// Check specific experiment
const eligibility = await checkPromotionEligibility("my-experiment", config);

if (eligibility.eligible) {
  console.log(`Ready to promote ${eligibility.winningVariant?.variantName}`);
  console.log(`Confidence: ${eligibility.confidence}%`);
  console.log(`Improvement: ${eligibility.improvement}%`);
} else {
  console.log(`Not eligible: ${eligibility.reasons.join(", ")}`);
}

// Promote with custom config
const result = await promoteWinner("my-experiment", {
  ...config,
  dryRun: false,
  notifications: {
    enabled: true,
    channels: ["slack"],
    minimumLevel: "info",
    includeDetailedMetrics: true,
  },
});

if (result.success) {
  console.log(`Promoted ${result.promotedVariantName}!`);
  console.log(`Promotion ID: ${result.promotionId}`);
}
```

## Configuration Presets

### Aggressive
Best for high-traffic sites with rapid iteration cycles.

```typescript
{
  minConfidence: 90.0,      // 90% confidence
  minSampleSize: 500,       // 500 samples minimum
  minImprovement: 3.0,      // 3% improvement required
  minRuntimeHours: 12,      // 12 hours minimum runtime
  maxErrorRate: 0.08,       // 8% error rate threshold
  maxLatencyDegradation: 30.0  // 30% latency increase allowed
}
```

### Conservative
Best for critical systems requiring high confidence.

```typescript
{
  minConfidence: 99.0,      // 99% confidence
  minSampleSize: 5000,      // 5000 samples minimum
  minImprovement: 10.0,     // 10% improvement required
  minRuntimeHours: 72,      // 72 hours minimum runtime
  maxErrorRate: 0.02,       // 2% error rate threshold
  maxLatencyDegradation: 10.0  // 10% latency increase allowed
}
```

### Balanced (Default)
Balanced settings for most use cases.

```typescript
{
  minConfidence: 95.0,      // 95% confidence
  minSampleSize: 2000,      // 2000 samples minimum
  minImprovement: 5.0,      // 5% improvement required
  minRuntimeHours: 24,      // 24 hours minimum runtime
  maxErrorRate: 0.05,       // 5% error rate threshold
  maxLatencyDegradation: 20.0  // 20% latency increase allowed
}
```

## Safety Checks

Before promoting any variant, the system runs comprehensive safety checks:

### 1. Error Rate Check
Ensures winning variant error rate is below threshold.

```typescript
winner.errorRate <= config.thresholds.maxErrorRate
```

### 2. Latency Degradation Check
Validates that P95 latency hasn't increased beyond acceptable limits.

```typescript
latencyIncrease <= config.thresholds.maxLatencyDegradation
```

### 3. Traffic Balance Check
Confirms traffic distribution is within expected ranges.

```typescript
Math.abs(actualTraffic - expectedTraffic) / expectedTraffic < 0.5
```

### 4. Recent Alerts Check
Verifies no critical alerts in the lookback window.

```typescript
criticalAlerts.length <= config.safetyChecks.maxCriticalAlerts
```

## Notifications

The system sends notifications to configured channels when promotions occur:

- **Slack**: Real-time notifications with detailed metrics
- **Email**: Formatted email with promotion summary
- **PagerDuty**: Critical alerts for high-priority experiments

Configure notification preferences in your notification configs:

```sql
INSERT INTO notification_configs (
  user_id,
  channel,
  webhook_url,
  enabled,
  alert_levels
) VALUES (
  'user-uuid',
  'slack',
  'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  true,
  ARRAY['info', 'warning', 'critical']
);
```

## Scheduled Scanning

Set up a cron job or scheduled task to periodically scan for eligible promotions:

```typescript
// In your cron handler or scheduled job
import { scanAndPromoteWinners } from "@/lib/experiments/auto-promotion-engine";
import { loadAutoPromotionConfig } from "@/lib/experiments/auto-promotion-config";

export async function dailyPromotionScan() {
  const config = loadAutoPromotionConfig("balanced");
  const results = await scanAndPromoteWinners(config);
  
  console.log(`Daily scan: ${results.promoted} promotions executed`);
  return results;
}
```

## Database Schema

The system uses two main tables:

### experiment_promotions
Tracks active promotions with full metadata.

```sql
- id: UUID
- experiment_id: UUID
- promoted_variant_name: TEXT
- confidence: DECIMAL(5,2)
- improvement: DECIMAL(8,4)
- promotion_type: TEXT ('auto' | 'manual')
- promoted_at: TIMESTAMP
- rollback_at: TIMESTAMP (NULL if active)
- metadata: JSONB
```

### ab_promotion_audit_log
Comprehensive audit trail for all promotion actions.

```sql
- id: UUID
- experiment_name: TEXT
- winning_variant_name: TEXT
- action: TEXT ('promoted' | 'rolled_back')
- confidence_level: NUMERIC(5,2)
- improvement: NUMERIC(10,6)
- safety_checks_json: JSONB
- promoted_at: TIMESTAMP
```

## Best Practices

1. **Start with Dry-Run Mode**: Test your configuration before enabling live promotions
2. **Monitor Closely**: Review promotion logs and metrics regularly
3. **Set Conservative Thresholds**: Start conservative and adjust based on results
4. **Use Exclusion Lists**: Exclude critical experiments from auto-promotion
5. **Configure Notifications**: Ensure stakeholders are notified of all promotions
6. **Review Safety Checks**: Customize safety checks based on your specific requirements
7. **Test Rollbacks**: Verify rollback procedures work as expected

## Troubleshooting

### Experiment Not Eligible

Check eligibility reasons:

```bash
curl -X POST /api/experiments/auto-promote \
  -d '{"action": "check", "experimentName": "my-test"}'
```

Common reasons:
- Insufficient runtime
- Low confidence level
- Sample size too small
- Failed safety checks
- Experiment in exclusion list

### Notifications Not Sending

Verify notification configs:

```sql
SELECT * FROM notification_configs 
WHERE enabled = true 
  AND 'info' = ANY(alert_levels);
```

### Promotion Failures

Check logs for detailed error messages:

```typescript
console.log("[Auto-Promotion] Error promoting experiment:", error);
```

## API Reference

### POST /api/experiments/auto-promote

**Actions:**
- `scan`: Scan all experiments and promote eligible winners
- `promote`: Promote specific experiment
- `check`: Check eligibility without promoting
- `rollback`: Rollback a promotion

**Parameters:**
- `experimentName`: string (required for promote/check)
- `promotionId`: string (required for rollback)
- `reason`: string (required for rollback)
- `config`: Partial<AutoPromotionConfig> (optional)
- `preset`: "aggressive" | "conservative" | "balanced" (optional)
- `dryRun`: boolean (optional)

### GET /api/experiments/auto-promote

**Query Parameters:**
- `preset`: "aggressive" | "conservative" | "balanced" (optional)

**Returns:**
- Current configuration
- Validation status
- Available presets

## TypeScript Types

```typescript
interface AutoPromotionConfig {
  enabled: boolean;
  thresholds: AutoPromotionThresholds;
  safetyChecks: SafetyCheckConfig;
  notifications: PromotionNotificationConfig;
  dryRun: boolean;
  excludedExperiments: string[];
  maxConcurrentPromotions: number;
}

interface PromotionResult {
  success: boolean;
  experimentName: string;
  promotedVariantName?: string;
  confidence?: number;
  improvement?: number;
  promotionId?: string;
  error?: string;
  dryRun: boolean;
  notificationsSent: number;
}

interface SafetyCheckResult {
  name: string;
  passed: boolean;
  message: string;
  value?: number;
  threshold?: number;
  severity: "info" | "warning" | "critical";
}
```

## License

Part of sierra-fred-carey project.
