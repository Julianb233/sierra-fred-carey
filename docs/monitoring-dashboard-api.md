# Monitoring Dashboard - Real API Integration

## Overview

The monitoring dashboard (`/app/dashboard/monitoring/page.tsx`) is fully integrated with real-time API data. All metrics, experiments, and alerts are fetched from production APIs with automatic refresh.

## Architecture

```
┌─────────────────────┐
│  Dashboard Page     │
│  (Client Component) │
└──────────┬──────────┘
           │
           ├─────────────────────────────────┐
           │                                 │
           v                                 v
┌──────────────────────┐          ┌──────────────────────┐
│  /api/monitoring/    │          │  /api/monitoring/    │
│  dashboard           │          │  alerts              │
└──────────┬───────────┘          └──────────┬───────────┘
           │                                 │
           v                                 v
┌──────────────────────┐          ┌──────────────────────┐
│  getMonitoring       │          │  getMonitoring       │
│  Dashboard()         │          │  Dashboard()         │
│  (lib/monitoring/)   │          │  + filter alerts     │
└──────────┬───────────┘          └──────────────────────┘
           │
           v
┌──────────────────────┐
│  Neon Database       │
│  - ab_experiments    │
│  - ab_variants       │
│  - ai_requests       │
│  - ai_responses      │
└──────────────────────┘
```

## API Endpoints

### GET /api/monitoring/dashboard

Returns comprehensive dashboard data including:

**Response Structure:**
```typescript
{
  success: boolean;
  data: {
    activeExperiments: ExperimentComparison[];
    totalActiveTests: number;
    totalRequests24h: number;
    criticalAlerts: Alert[];
  };
  timestamp: string;
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "activeExperiments": [
      {
        "experimentName": "Homepage Hero Test",
        "experimentId": "exp-001",
        "isActive": true,
        "startDate": "2024-01-01T00:00:00Z",
        "variants": [
          {
            "variantName": "control",
            "totalRequests": 5000,
            "avgLatencyMs": 120,
            "errorRate": 0.01,
            "conversionRate": 0.15
          }
        ],
        "totalRequests": 10000,
        "totalUsers": 8500,
        "hasStatisticalSignificance": true,
        "winningVariant": "variant-a",
        "confidenceLevel": 95,
        "alerts": []
      }
    ],
    "totalActiveTests": 1,
    "totalRequests24h": 50000,
    "criticalAlerts": []
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### GET /api/monitoring/alerts

Returns all alerts across active experiments with optional filtering.

**Query Parameters:**
- `level` - Filter by alert level: `info`, `warning`, `critical`
- `type` - Filter by alert type: `performance`, `errors`, `traffic`, `significance`
- `notify` - If `true`, send notifications for alerts

**Response Structure:**
```typescript
{
  success: boolean;
  data: {
    alerts: Alert[];
    total: number;
    breakdown: {
      critical: number;
      warning: number;
      info: number;
    };
  };
  timestamp: string;
}
```

## Data Flow

### 1. Initial Load

```typescript
useEffect(() => {
  fetchDashboardData();  // Fetch experiments and metrics
  fetchAlerts();         // Fetch alerts separately
}, []);
```

### 2. Data Transformation

Raw API data is transformed for UI components:

```typescript
// Transform experiments
const uiExperiments = activeExperiments.map(transformExperiment);

// Transform alerts
const uiAlerts = alerts.map(transformAlert);

// Calculate metrics
const metrics = calculateMetrics(activeExperiments);
```

### 3. State Updates

```typescript
setTotalRequests(totalRequests24h);
setAvgLatency(metrics.avgLatency);
setErrorRate(metrics.errorRate);
setActiveExperimentCount(totalActiveTests);
setExperiments(uiExperiments);
setAlerts(uiAlerts);
```

## Real-time Updates

### Auto-refresh Every 30 Seconds

```typescript
const interval = setInterval(() => {
  fetchDashboardData();
  fetchAlerts();
}, 30000);

// Cleanup on unmount
return () => clearInterval(interval);
```

### Manual Refresh

```typescript
const handleRefresh = () => {
  setRefreshing(true);
  fetchDashboardData();
  fetchAlerts();
};
```

## Type Safety

All data transformations are strongly typed:

```typescript
// API Response Types
interface DashboardResponse {
  success: boolean;
  data: {
    activeExperiments: ExperimentComparison[];
    totalActiveTests: number;
    totalRequests24h: number;
    criticalAlerts: Alert[];
  };
  timestamp: string;
}

// UI Component Types
interface UIExperiment {
  id: string;
  name: string;
  status: "active" | "completed" | "paused" | "draft";
  variants: string[];
  traffic: number;
  startDate: string;
  endDate?: string;
  winner?: string;
  significance?: number;
}
```

## Error Handling

### Network Errors

```typescript
try {
  const response = await fetch("/api/monitoring/dashboard");
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
} catch (err) {
  console.error("[Dashboard] Error:", err);
  setError(err.message);
}
```

### API Errors

```typescript
const dashboardData = await response.json();
if (!dashboardData.success) {
  throw new Error("Dashboard API returned error");
}
```

### UI Error Display

```tsx
{error && (
  <Card className="border-red-200 bg-red-50">
    <CardContent>
      <div className="flex items-center gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
        <div>
          <p className="font-medium">Failed to load dashboard data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

## Component Data Flow

```
API Response
    ↓
Transform Functions (types/monitoring.ts)
    ↓
React State
    ↓
UI Components
    ├── MetricsCard (metrics)
    ├── ExperimentList (experiments)
    ├── AlertsTable (alerts)
    └── LiveMetricsPanel (real-time data)
```

## Performance Optimizations

1. **Separate Alerts Fetch** - Alerts are fetched independently to avoid blocking main dashboard data
2. **Memoized Calculations** - Chart data is generated once per render
3. **Controlled Refresh** - 30-second interval prevents excessive API calls
4. **Loading States** - UI shows loading state during initial fetch only
5. **Error Boundaries** - Errors don't crash the entire dashboard

## Testing

Run integration tests:

```bash
npm test tests/dashboard-integration.test.ts
```

Tests verify:
- ✓ API response parsing
- ✓ Data transformations
- ✓ Error handling
- ✓ Type safety
- ✓ Real-time polling
- ✓ Chart data generation

## Debugging

Enable debug logging:

```typescript
// Development mode automatically logs:
console.log("[Dashboard] Data loaded successfully", {
  experiments: activeExperiments.length,
  totalRequests: totalRequests24h,
  criticalAlerts: criticalAlerts.length,
});
```

Check browser console for:
- `[Dashboard] Data loaded successfully` - Successful fetch
- `[Dashboard] Auto-refreshing data...` - 30-second refresh trigger
- `[Dashboard] Alerts loaded successfully` - Alerts fetch complete
- `[Dashboard] Failed to fetch...` - Error details

## Dependencies

- **Database**: Neon Postgres with real A/B test data
- **API Layer**: Next.js API routes (`/app/api/monitoring/`)
- **Business Logic**: `lib/monitoring/ab-test-metrics.ts`
- **Type Definitions**: `types/monitoring.ts`
- **UI Components**: Radix UI + Recharts

## No Mock Data

The dashboard uses **100% real API data**. There are no mock data fallbacks in production. All data comes from:

1. `ab_experiments` table - Experiment definitions
2. `ab_variants` table - Variant configurations
3. `ai_requests` table - Request logs
4. `ai_responses` table - Response metrics

## Future Enhancements

- [ ] WebSocket support for sub-second updates
- [ ] Historical data comparison
- [ ] Export to CSV/PDF
- [ ] Custom date range selection
- [ ] Alert acknowledgment system
- [ ] Experiment pause/resume controls
