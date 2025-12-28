# A/B Test Monitoring Infrastructure

Comprehensive observability system for tracking A/B test performance, detecting statistical significance, and generating actionable alerts.

## Overview

The Sahara project includes production-grade A/B test monitoring that provides:

- **Real-time metrics collection** - Performance, error rates, and traffic distribution
- **Statistical significance detection** - Z-test based winner identification
- **Automated alerting** - Critical, warning, and info level alerts
- **Percentile latency tracking** - P50, P95, P99 performance metrics
- **RESTful monitoring APIs** - Easy integration with dashboards and external tools

## Architecture

```
A/B Test Flow:
User Request → Variant Assignment (logged) → AI Processing → Response (metrics collected)
                     ↓                                              ↓
              ai_requests.variant_id                      ai_responses.latency_ms
                                                                     ↓
                                              Monitoring System Aggregates Metrics
                                                                     ↓
                                              Statistical Analysis + Alerting
```

### Key Components

1. **Metrics Collection** (`lib/monitoring/ab-test-metrics.ts`)
   - Collects variant-level performance data
   - Calculates percentile latencies
   - Tracks error rates and success rates

2. **Statistical Analysis**
   - Z-test for two proportions
   - Confidence level calculation (90%, 95%, 99%, 99.9%)
   - Minimum sample size enforcement (100 requests)

3. **Alert Generation**
   - Performance degradation detection
   - Error rate monitoring
   - Traffic distribution validation
   - Sample size warnings

4. **Monitoring APIs** (`app/api/monitoring/*`)
   - Dashboard endpoint
   - Per-experiment metrics
   - Per-variant detailed stats
   - Alerts aggregation

## Monitoring APIs

### 1. Dashboard Endpoint

**GET** `/api/monitoring/dashboard`

Returns real-time overview of all active experiments.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeExperiments": [
      {
        "experimentName": "reality_lens_prompt_v2",
        "experimentId": "uuid",
        "isActive": true,
        "startDate": "2025-12-20T00:00:00Z",
        "variants": [
          {
            "variantId": "uuid",
            "variantName": "control",
            "experimentName": "reality_lens_prompt_v2",
            "totalRequests": 1523,
            "uniqueUsers": 487,
            "trafficPercentage": 50,
            "avgLatencyMs": 856,
            "p50LatencyMs": 720,
            "p95LatencyMs": 1420,
            "p99LatencyMs": 2100,
            "errorRate": 0.023,
            "errorCount": 35,
            "successRate": 0.977,
            "sampleSize": 1523,
            "startDate": "2025-12-27T00:00:00Z",
            "endDate": "2025-12-28T00:00:00Z"
          },
          {
            "variantId": "uuid",
            "variantName": "variant_a",
            "totalRequests": 1489,
            "uniqueUsers": 472,
            "trafficPercentage": 50,
            "avgLatencyMs": 823,
            "p50LatencyMs": 695,
            "p95LatencyMs": 1380,
            "p99LatencyMs": 1950,
            "errorRate": 0.019,
            "errorCount": 28,
            "successRate": 0.981,
            "sampleSize": 1489
          }
        ],
        "totalRequests": 3012,
        "totalUsers": 959,
        "hasStatisticalSignificance": false,
        "alerts": []
      }
    ],
    "totalActiveTests": 1,
    "totalRequests24h": 3012,
    "criticalAlerts": []
  },
  "timestamp": "2025-12-28T05:45:00Z"
}
```

### 2. Experiment Metrics Endpoint

**GET** `/api/monitoring/experiments/[name]`

Detailed metrics for a specific experiment with time range filtering.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `days` (optional): Number of days to look back (default: 7)

**Example:**
```bash
curl "https://sierra-fred-carey.vercel.app/api/monitoring/experiments/reality_lens_prompt_v2?days=7"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "experimentName": "reality_lens_prompt_v2",
    "experimentId": "uuid",
    "isActive": true,
    "variants": [...],
    "hasStatisticalSignificance": true,
    "winningVariant": "variant_a",
    "confidenceLevel": 95.0,
    "alerts": [
      {
        "level": "warning",
        "type": "performance",
        "message": "Elevated P95 latency: 2150ms",
        "variantName": "control",
        "metric": "p95LatencyMs",
        "value": 2150,
        "threshold": 2000,
        "timestamp": "2025-12-28T05:45:00Z"
      }
    ]
  },
  "timeRange": {
    "startDate": "2025-12-21T05:45:00Z",
    "endDate": "2025-12-28T05:45:00Z"
  },
  "timestamp": "2025-12-28T05:45:00Z"
}
```

### 3. Variant Metrics Endpoint

**GET** `/api/monitoring/variants/[id]`

Granular metrics for a single variant.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `days` (optional): Number of days to look back (default: 7)

**Example:**
```bash
curl "https://sierra-fred-carey.vercel.app/api/monitoring/variants/uuid-here?days=1"
```

### 4. Alerts Endpoint

**GET** `/api/monitoring/alerts`

Aggregated alerts across all experiments.

**Query Parameters:**
- `level` (optional): Filter by level (`info`, `warning`, `critical`)
- `type` (optional): Filter by type (`performance`, `errors`, `traffic`, `significance`)

**Example:**
```bash
curl "https://sierra-fred-carey.vercel.app/api/monitoring/alerts?level=critical"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [...],
    "total": 3,
    "breakdown": {
      "critical": 1,
      "warning": 2,
      "info": 0
    }
  },
  "timestamp": "2025-12-28T05:45:00Z"
}
```

## Metrics Explained

### Traffic Metrics

- **totalRequests**: Total number of AI requests assigned to this variant
- **uniqueUsers**: Number of distinct users who used this variant
- **trafficPercentage**: Configured traffic allocation (should sum to 100% across variants)

### Performance Metrics

- **avgLatencyMs**: Mean response time in milliseconds
- **p50LatencyMs**: Median latency (50th percentile)
- **p95LatencyMs**: 95th percentile latency (95% of requests faster than this)
- **p99LatencyMs**: 99th percentile latency (worst-case excluding outliers)

**Why percentiles matter:**
- P50 shows typical user experience
- P95 shows experience for most users (catches slowness)
- P99 catches edge cases and worst-case scenarios

### Quality Metrics

- **errorRate**: Percentage of requests that resulted in errors (0.0 - 1.0)
- **errorCount**: Absolute number of failed requests
- **successRate**: Percentage of successful requests (1 - errorRate)

### Statistical Metrics

- **sampleSize**: Number of requests (used for significance testing)
- **confidenceLevel**: Statistical confidence that winner is truly better (90%, 95%, 99%, 99.9%)

## Alert Thresholds

### Error Rate Alerts

| Level | Threshold | Action |
|-------|-----------|--------|
| **Warning** | 5% error rate | Investigate logs, monitor closely |
| **Critical** | 10% error rate | Immediate action required, consider disabling variant |

### Performance Alerts

| Level | Threshold | Action |
|-------|-----------|--------|
| **Warning** | P95 > 2000ms | Review slow queries, optimize if persistent |
| **Critical** | P95 > 5000ms | User experience degraded, investigate immediately |

### Traffic Distribution Alerts

| Level | Threshold | Action |
|-------|-----------|--------|
| **Warning** | < 10% of expected traffic | Check variant assignment logic, verify experiment is active |

### Sample Size Alerts

| Level | Threshold | Action |
|-------|-----------|--------|
| **Info** | < 100 requests | Wait for more data before drawing conclusions |

## Statistical Significance

### Methodology

We use **Z-test for two proportions** to determine if variant differences are statistically significant.

**Formula:**
```
z = (p1 - p2) / SE

where:
  p1 = success rate of variant A
  p2 = success rate of variant B (control)
  pooled_p = (p1*n1 + p2*n2) / (n1 + n2)
  SE = sqrt(pooled_p * (1 - pooled_p) * (1/n1 + 1/n2))
```

### Confidence Levels

| Z-Score | Confidence | Interpretation |
|---------|------------|----------------|
| ≥ 3.29 | 99.9% | Extremely strong evidence |
| ≥ 2.58 | 99.0% | Very strong evidence |
| ≥ 1.96 | 95.0% | Strong evidence (industry standard) |
| ≥ 1.645 | 90.0% | Moderate evidence |
| < 1.645 | < 90% | Insufficient evidence |

### Requirements for Statistical Validity

1. **Minimum sample size**: 100 requests per variant
2. **Both variants must meet minimum**: Can't compare 1000 vs 50 samples
3. **Random assignment**: Hash-based deterministic assignment ensures this
4. **Independent samples**: Each user request is independent

## Integration Guide

### For Developers

#### 1. Using Monitoring in Your Code

```typescript
import { compareExperimentVariants } from '@/lib/monitoring/ab-test-metrics';

// Get experiment comparison
const comparison = await compareExperimentVariants(
  'my_experiment',
  new Date('2025-12-20'),
  new Date('2025-12-28')
);

if (comparison.hasStatisticalSignificance) {
  console.log(`Winner: ${comparison.winningVariant}`);
  console.log(`Confidence: ${comparison.confidenceLevel}%`);
}

// Check for critical alerts
const criticalAlerts = comparison.alerts.filter(a => a.level === 'critical');
if (criticalAlerts.length > 0) {
  // Send to Slack, PagerDuty, etc.
}
```

#### 2. Creating Alerts Integration

```typescript
import { getMonitoringDashboard } from '@/lib/monitoring/ab-test-metrics';

// In a cron job or scheduled task
export async function checkCriticalAlerts() {
  const dashboard = await getMonitoringDashboard();
  
  if (dashboard.criticalAlerts.length > 0) {
    // Send to alerting system
    await sendToSlack(dashboard.criticalAlerts);
    await sendToPagerDuty(dashboard.criticalAlerts);
  }
}
```

#### 3. Variant Assignment Logging

Variant assignments are automatically logged when you call `getVariantAssignment()`:

```typescript
import { getVariantAssignment } from '@/lib/ai/ab-testing';

// Automatically logs assignment
const variant = await getVariantAssignment(
  userId,
  'my_experiment',
  sessionId // optional
);
```

This logs to:
- Console (for CloudWatch, Vercel logs)
- Monitoring system (for analytics)

### For Dashboard Integration

#### Fetch Dashboard Data

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function MonitoringDashboard() {
  const [dashboard, setDashboard] = useState(null);
  
  useEffect(() => {
    async function loadDashboard() {
      const res = await fetch('/api/monitoring/dashboard');
      const data = await res.json();
      setDashboard(data.data);
    }
    
    loadDashboard();
    const interval = setInterval(loadDashboard, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);
  
  if (!dashboard) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Active Tests: {dashboard.totalActiveTests}</h1>
      <p>24h Requests: {dashboard.totalRequests24h}</p>
      
      {dashboard.criticalAlerts.length > 0 && (
        <div className="alert alert-critical">
          {dashboard.criticalAlerts.map(alert => (
            <div key={alert.timestamp}>
              {alert.message}
            </div>
          ))}
        </div>
      )}
      
      {dashboard.activeExperiments.map(exp => (
        <ExperimentCard key={exp.experimentId} experiment={exp} />
      ))}
    </div>
  );
}
```

## Database Schema

Monitoring uses existing tables from the Unified Intelligence Architecture:

- `ab_experiments`: Experiment definitions
- `ab_variants`: Variant configurations
- `ai_requests`: Request logs (includes `variant_id`)
- `ai_responses`: Response metrics (includes `latency_ms`, `error`)

No additional tables required - monitoring is built on existing infrastructure.

## Best Practices

### 1. Sample Size

✅ **Good**: Wait for at least 100 requests per variant before making decisions
❌ **Bad**: Declaring a winner after 10 requests

### 2. Time Range

✅ **Good**: Run experiments for at least 7 days to capture weekly patterns
❌ **Bad**: Running for only a few hours

### 3. Statistical Significance

✅ **Good**: Wait for 95% confidence before declaring a winner
❌ **Bad**: Acting on trends without statistical validation

### 4. Alert Fatigue

✅ **Good**: Fix critical alerts immediately, batch info alerts for weekly review
❌ **Bad**: Ignoring alerts because there are too many

### 5. Performance Baseline

✅ **Good**: Establish P95 baseline before starting experiments
❌ **Bad**: Not knowing what "normal" performance looks like

## Troubleshooting

### "No metrics showing up"

**Check:**
1. Is the experiment active? `SELECT * FROM ab_experiments WHERE is_active = true`
2. Are variants being assigned? Check console logs for `[A/B Test] Assigned user...`
3. Are requests being logged? `SELECT COUNT(*) FROM ai_requests WHERE variant_id IS NOT NULL`

### "Metrics seem incorrect"

**Verify:**
1. Time range in API call - default is last 24h
2. Timezone handling - all times are UTC
3. Database query performance - check for slow queries

### "Statistical significance not detecting winner"

**Requirements:**
1. Both variants need ≥ 100 requests
2. Difference must be statistically meaningful (not just 0.1%)
3. Success rates must be different enough for Z-score ≥ 1.96

### "Too many alerts"

**Solutions:**
1. Adjust thresholds in `lib/monitoring/ab-test-metrics.ts`
2. Filter alerts by level (`critical` only)
3. Implement alert aggregation (e.g., daily digest)

## Performance Considerations

### Query Optimization

- Metrics queries use indexes on:
  - `ai_requests(variant_id, created_at)`
  - `ai_responses(request_id)`
  - `ab_variants(experiment_id)`

- Percentile calculations use PostgreSQL's `PERCENTILE_CONT()` - efficient for large datasets

### Caching

- Experiment list cached for 5 minutes
- Dashboard data should be cached client-side (60s recommended)
- Variant metrics can be cached for 1-5 minutes

### Scalability

- Monitoring queries are read-only
- Use read replicas for high-traffic monitoring
- Consider materialized views for very large datasets (>1M requests)

## Future Enhancements

### Planned Features

1. **Conversion tracking**: Track business metrics (signups, purchases)
2. **Automated winner selection**: Auto-promote winning variants
3. **Multi-armed bandit**: Dynamic traffic allocation based on performance
4. **Bayesian A/B testing**: Alternative to frequentist statistics
5. **Segment analysis**: Performance by user cohort
6. **Custom metrics**: User-defined success criteria
7. **Export to BI tools**: BigQuery, Snowflake integration
8. **Real-time WebSocket updates**: Live dashboard without polling

## Support

For issues or questions:

1. Check this documentation
2. Review console logs (`[Monitoring]` and `[A/B Test]` prefixes)
3. Query the database directly for raw data
4. Contact the development team

## References

- [Database Schema](../lib/db/migrations/007_unified_intelligence.sql)
- [Metrics Collection](../lib/monitoring/ab-test-metrics.ts)
- [A/B Testing Library](../lib/ai/ab-testing.ts)
- [Admin A/B Test API](../app/api/admin/ab-tests/route.ts)
