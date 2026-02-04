# Insights Dashboard API Endpoints

Documentation for the insights dashboard API endpoints that power the `/dashboard/insights` page.

## Overview

The insights dashboard provides real-time analytics for:
- A/B test experiments and variant performance
- AI analytics metrics (requests, latency, success rates, token usage)
- Top AI-extracted insights with filtering and dismissal

All endpoints require authentication via Supabase Auth.

---

## Endpoints

### GET /api/insights/ab-tests

Get A/B test results with variant performance metrics.

**Authentication:** Required

**Query Parameters:**
- `includeInactive` (optional): Include inactive experiments. Default: `false`

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    experimentName: string;
    description?: string;
    isActive: boolean;
    startDate: string;
    endDate?: string;
    variants: Array<{
      variantName: string;
      totalRequests: number;
      avgLatency: number;
      errorRate: number;
    }>;
  }>;
  error?: string;
}
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  https://yourapp.com/api/insights/ab-tests
```

**Database Tables:**
- `ab_experiments` - Experiment definitions
- `ab_variants` - Variant configurations
- `ai_requests` - Request logs linked to variants
- `ai_responses` - Response logs with latency/error data

---

### GET /api/insights/analytics

Get aggregated AI analytics metrics for the authenticated user.

**Authentication:** Required

**Query Parameters:**
- `days` (optional): Number of days to look back. Default: `30`

**Response:**
```typescript
{
  success: boolean;
  data: {
    totalRequests: number;
    avgResponseTime: number;
    successRate: number;
    totalTokensUsed: number;
    requestsByAnalyzer: Array<{
      analyzer: string;
      count: number;
      avgLatency: number;
      errorRate: number;
    }>;
  };
  error?: string;
}
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  https://yourapp.com/api/insights/analytics?days=7
```

**Metrics Included:**
- Total AI requests across all analyzers
- Average response time in milliseconds
- Success rate (percentage of requests without errors)
- Total tokens consumed
- Per-analyzer breakdown with request counts, latency, and error rates

**Database Tables:**
- `ai_requests` - Request logs per user
- `ai_responses` - Response logs with latency/tokens/errors

---

### GET /api/insights/top-insights

Get top AI-extracted insights for the authenticated user.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of insights to return. Default: `10`
- `minImportance` (optional): Minimum importance score (1-10). Default: `5`
- `type` (optional): Filter by insight type. Options: `breakthrough`, `warning`, `opportunity`, `pattern`, `recommendation`
- `includeDismissed` (optional): Include dismissed insights. Default: `false`

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    type: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
    title: string;
    content: string;
    importance: number;
    tags: string[];
    sourceType: string;
    createdAt: string;
  }>;
  error?: string;
}
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://yourapp.com/api/insights/top-insights?limit=20&minImportance=7&type=breakthrough"
```

**Database Tables:**
- `ai_insights` - AI-extracted insights per user

---

### PATCH /api/insights/top-insights

Dismiss or restore an insight.

**Authentication:** Required

**Request Body:**
```typescript
{
  insightId: string;
  isDismissed: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"insightId": "abc-123", "isDismissed": true}' \
  https://yourapp.com/api/insights/top-insights
```

---

## TypeScript Types

All response types are defined in `/lib/types/insights.ts`:

```typescript
export interface ABTestVariantStats {
  variantName: string;
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  conversionRate?: number;
}

export interface ABTestResult {
  experimentName: string;
  description?: string;
  variants: ABTestVariantStats[];
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

export interface AnalyzerMetrics {
  analyzer: string;
  count: number;
  avgLatency: number;
  errorRate: number;
}

export interface AIAnalytics {
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  totalTokensUsed: number;
  requestsByAnalyzer: AnalyzerMetrics[];
}

export interface TopInsight {
  id: string;
  type: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
  title: string;
  content: string;
  importance: number;
  tags: string[];
  sourceType: string;
  createdAt: string;
}
```

---

## Security

All endpoints use `requireAuth()` from `/lib/auth.ts` to:
1. Verify the user is authenticated via Supabase Auth
2. Extract userId from server-side session (never trust client headers)
3. Return 401 if not authenticated
4. Apply Row-Level Security (RLS) on database queries

**Security Pattern:**
```typescript
const userId = await requireAuth(); // Throws 401 if not authenticated
// ... use userId in SQL queries with RLS
```

---

## Error Handling

All endpoints follow a consistent error response pattern:

```typescript
{
  success: false,
  error: "Human-readable error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `401` - Unauthorized (authentication required)
- `400` - Bad request (missing required parameters)
- `500` - Internal server error

---

## Database Schema

Relevant tables from `/lib/db/migrations/007_unified_intelligence.sql`:

### ab_experiments
- `id` - UUID primary key
- `name` - Unique experiment name
- `description` - Optional description
- `is_active` - Boolean flag
- `start_date` - Experiment start timestamp
- `end_date` - Optional end timestamp
- `created_by` - User who created the experiment

### ab_variants
- `id` - UUID primary key
- `experiment_id` - Foreign key to ab_experiments
- `variant_name` - Variant name (e.g., "control", "variant_a")
- `prompt_id` - Optional foreign key to ai_prompts
- `config_overrides` - JSONB configuration overrides
- `traffic_percentage` - Integer 0-100

### ai_requests
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `analyzer` - Analyzer name (e.g., "reality_lens")
- `variant_id` - Optional foreign key to ab_variants
- `model` - AI model used
- `created_at` - Request timestamp

### ai_responses
- `id` - UUID primary key
- `request_id` - Foreign key to ai_requests
- `latency_ms` - Response time in milliseconds
- `tokens_used` - Number of tokens consumed
- `error` - Optional error message
- `created_at` - Response timestamp

### ai_insights
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `source_type` - Source type (e.g., "checkin", "document")
- `source_id` - Source object ID
- `insight_type` - Type of insight (breakthrough, warning, etc.)
- `title` - Insight title
- `content` - Insight content
- `importance` - Integer 1-10
- `tags` - Text array
- `is_dismissed` - Boolean flag
- `created_at` - Creation timestamp

---

## Usage in Frontend

The insights dashboard page (`/app/dashboard/insights/page.tsx`) uses these endpoints:

```typescript
// Fetch all data
const [analyticsRes, abTestsRes, insightsRes] = await Promise.all([
  fetch(`/api/insights/analytics?days=${dateRange}`),
  fetch("/api/insights/ab-tests"),
  fetch(`/api/insights/top-insights?limit=20&minImportance=${minImportance}`)
]);

// Parse responses
const analytics = await analyticsRes.json();
const abTests = await abTestsRes.json();
const insights = await insightsRes.json();

// Dismiss an insight
await fetch("/api/insights/top-insights", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ insightId, isDismissed: true })
});
```

---

## Testing

To test the endpoints:

1. **Create test data** (via SQL or seeding script)
2. **Authenticate** to get a valid session
3. **Make requests** to the endpoints
4. **Verify responses** match expected types

Example test data:
```sql
-- Create a test experiment
INSERT INTO ab_experiments (name, description, is_active)
VALUES ('test-experiment', 'Test A/B experiment', true);

-- Create variants
INSERT INTO ab_variants (experiment_id, variant_name, traffic_percentage)
VALUES
  ((SELECT id FROM ab_experiments WHERE name = 'test-experiment'), 'control', 50),
  ((SELECT id FROM ab_experiments WHERE name = 'test-experiment'), 'variant_a', 50);
```

---

## Performance Considerations

1. **Caching**: Consider adding response caching for analytics data that doesn't change frequently
2. **Pagination**: The `limit` parameter prevents loading too many insights at once
3. **Indexes**: All relevant columns have indexes for fast queries (see migration file)
4. **Parallel Queries**: Frontend fetches all three endpoints in parallel using `Promise.all()`
5. **Query Optimization**: Aggregation queries use efficient SQL with proper JOINs and GROUP BY

---

## Future Enhancements

Potential improvements:
- Add conversion rate tracking for A/B tests
- Support real-time updates via WebSockets or Server-Sent Events
- Add export functionality for analytics data (CSV, JSON)
- Implement insight pinning/favoriting
- Add insight search/filtering by tags
- Support custom date ranges for analytics
- Add comparative analytics (week-over-week, month-over-month)
