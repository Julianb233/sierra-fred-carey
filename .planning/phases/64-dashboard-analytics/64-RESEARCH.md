# Phase 64: Dashboard & Analytics Enhancement - Research

**Researched:** 2026-02-23
**Domain:** Next.js dashboard, Recharts visualization, PostHog analytics, CSV/PDF export
**Confidence:** HIGH

## Summary

Phase 64 enhances the existing Founder Command Center dashboard (`/dashboard`) with historical trend charts, engagement scoring, data export (CSV/PDF), and PostHog funnel visualization. The codebase already has a strong foundation:

- **PostHog** is fully integrated (Phase 30) with client + server SDKs, typed events, and an AnalyticsProvider. However, no funnels have been configured yet -- they live in PostHog's UI, not in code.
- **Recharts 3.6** is already installed and used extensively in monitoring charts (`components/monitoring/charts/`) and insights trend charts (`components/insights/trend-charts.tsx`). The established pattern uses `ResponsiveContainer`, shadcn Card wrappers, and the app's orange/purple color scheme.
- **CSV export** already exists via a full-featured `CSVGenerator` class (`lib/export/csv-generator.ts`) with streaming, BOM support, and `downloadCSV` helper. **PDF export** exists via `@react-pdf/renderer` for strategy documents and a `window.print()` approach for insights reports.
- The dashboard home page fetches all data from a single `GET /api/dashboard/command-center` endpoint. Current widgets are: FounderSnapshot, RedFlags, DecisionBox, FundingReadinessGauge, WeeklyMomentum. None show historical trends -- all are point-in-time.
- **No engagement scoring system exists.** The 7-Factor Scoring Engine scores decisions, not founder engagement. Engagement must be built from scratch using activity counts across tables.

**Primary recommendation:** Add a new `/api/dashboard/trends` endpoint that aggregates time-series data from existing tables (conversations, check-ins, next-steps completions, decisions scored). Build engagement scoring as a computed metric from these activity counts. Use existing Recharts patterns and CSV/PDF export infrastructure. PostHog funnels are configured in PostHog UI and embedded via iframe or queried via PostHog API.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.6.0 | Chart visualization | Already used in 38+ files; LineChart, AreaChart, BarChart, PieChart |
| posthog-js | ^1.342.1 | Client-side analytics | Already integrated, AnalyticsProvider wraps app |
| posthog-node | ^5.24.11 | Server-side analytics | Already integrated for API route tracking |
| date-fns | ^3.6.0 | Date formatting/manipulation | Already used in CSV generator, throughout app |
| @react-pdf/renderer | ^4.3.1 | Server-side PDF generation | Already used for strategy document export |
| framer-motion | ^12.23.13 | Animations | Already used in export menus, transitions |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | (installed) | Toast notifications | Export success/failure feedback |
| lucide-react | (installed) | Icons | Chart section icons, export button icons |
| shadcn/ui | (installed) | UI components | Card, Tabs, Button, DropdownMenu wrappers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | chart.js / nivo | recharts already used in 38+ files; consistency wins |
| @react-pdf/renderer | jspdf | @react-pdf already in project; React component model is cleaner |
| window.print() PDF | @react-pdf/renderer | Use @react-pdf for structured reports, window.print() only as fallback |
| Custom engagement scoring | PostHog computed properties | PostHog requires env key; compute in-app for reliability |

**Installation:** No new packages needed. All libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
lib/dashboard/
  command-center.ts          # EXISTING - point-in-time data
  trends.ts                  # NEW - time-series aggregation
  engagement-score.ts        # NEW - engagement scoring computation
app/api/dashboard/
  command-center/route.ts    # EXISTING
  stats/route.ts             # EXISTING
  trends/route.ts            # NEW - time-series data endpoint
  engagement/route.ts        # NEW - engagement score endpoint
  export/route.ts            # NEW - server-side export endpoint
components/dashboard/
  founder-snapshot-card.tsx   # EXISTING
  weekly-momentum.tsx         # EXISTING
  trend-charts.tsx            # NEW - historical trend charts
  engagement-score-card.tsx   # NEW - engagement score display
  dashboard-export-menu.tsx   # NEW - export dropdown for dashboard
  posthog-funnel-embed.tsx    # NEW - PostHog funnel visualization
```

### Pattern 1: Time-Series API Endpoint
**What:** A new `/api/dashboard/trends` endpoint that aggregates activity counts by week/month from existing Supabase tables.
**When to use:** For all historical trend data on the dashboard.
**Example:**
```typescript
// lib/dashboard/trends.ts
// Follow same pattern as command-center.ts
import { createServiceClient } from "@/lib/supabase/server";

export interface TrendPeriod {
  period: string;        // "2026-W07" or "2026-02"
  conversations: number;
  checkIns: number;
  nextStepsCompleted: number;
  decisionsScored: number;
  documentsCreated: number;
}

export async function getFounderTrends(
  userId: string,
  granularity: "weekly" | "monthly" = "weekly",
  periods: number = 12
): Promise<TrendPeriod[]> {
  const supabase = createServiceClient();
  // Query each table with date_trunc grouping, parallel Promise.all
  // Return merged time-series data
}
```

### Pattern 2: Recharts Chart Component (established pattern)
**What:** Client component wrapping recharts in shadcn Card, following existing trend-charts.tsx pattern.
**When to use:** Every chart on the dashboard.
**Example:**
```typescript
// Follow exact pattern from components/insights/trend-charts.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Colors: #ff6a1a (primary orange), #8b5cf6 (purple), #10b981 (green), #3b82f6 (blue)
// Height: 300px in ResponsiveContainer
// Custom Tooltip with rounded-lg border bg-background p-3 shadow-lg
```

### Pattern 3: Engagement Score as Computed Metric
**What:** Compute engagement score on the server from activity counts -- NOT stored in a table, NOT requiring a new Supabase migration.
**When to use:** When displaying founder engagement level.
**Example:**
```typescript
// lib/dashboard/engagement-score.ts
export interface EngagementScore {
  overall: number;          // 0-100
  breakdown: {
    chatActivity: number;    // weight: 30%
    checkInConsistency: number; // weight: 25%
    nextStepsProgress: number;  // weight: 20%
    featureUsage: number;       // weight: 15%
    documentActivity: number;   // weight: 10%
  };
  trend: "rising" | "stable" | "declining";
  lastActiveDate: string;
}

export async function computeEngagementScore(userId: string): Promise<EngagementScore> {
  // Count activities in last 30 days vs previous 30 days
  // Weight and normalize to 0-100 scale
  // Compare periods for trend direction
}
```

### Pattern 4: Export Dashboard Data
**What:** Reuse existing CSVGenerator + @react-pdf/renderer for dashboard data export.
**When to use:** When user clicks "Export" on the dashboard.
**Example:**
```typescript
// Reuse lib/export/csv-generator.ts CSVGenerator class
import { CSVGenerator, downloadCSV, getTimestampedFilename } from "@/lib/export/csv-generator";
import type { ExportConfig } from "@/lib/export/types";

// For PDF: follow lib/documents/export.ts pattern with @react-pdf/renderer
// For CSV: follow lib/export/csv-generator.ts pattern
```

### Anti-Patterns to Avoid
- **Do NOT add new Supabase tables for engagement scores.** Compute them from existing activity tables. Adding a materialized view or table adds migration complexity for a simple aggregation.
- **Do NOT create a custom charting solution.** Recharts 3.6 is already established with 38+ file usages.
- **Do NOT embed PostHog iframes.** Use PostHog's query API or build funnel visualization with recharts from PostHog event data. The app may not have PostHog configured in all environments.
- **Do NOT make the dashboard page a server component.** It is currently a client component with `useEffect` data fetching. Keep that pattern, adding new API calls.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Custom string concatenation | `CSVGenerator` from `lib/export/csv-generator.ts` | Handles quoting, escaping, BOM, streaming, date formatting |
| PDF generation | HTML-to-PDF or puppeteer | `@react-pdf/renderer` from `lib/documents/export.ts` | Already in project, React component model, server-side rendering |
| Chart components | SVG/Canvas custom charts | recharts `AreaChart`/`LineChart`/`BarChart` | 38+ existing usages, consistent styling |
| Date formatting | Custom date utils | `date-fns` `format`/`parseISO`/`startOfWeek` | Already imported in CSV generator, well-tested |
| Toast notifications | Custom notification system | `sonner` `toast` | Already used throughout app |
| Download trigger | Custom download logic | `downloadCSV()` from `lib/export/csv-generator.ts` | Blob creation, URL lifecycle, cleanup handled |
| Analytics event tracking | Custom analytics | `trackEvent()` from `lib/analytics` | PostHog integration already wired |

**Key insight:** 90% of the export and visualization infrastructure already exists. The main new work is: (1) time-series aggregation queries, (2) engagement scoring logic, (3) new chart components using established patterns, and (4) wiring export to dashboard data.

## Common Pitfalls

### Pitfall 1: N+1 Queries for Historical Data
**What goes wrong:** Querying each time period separately creates O(n) database calls.
**Why it happens:** Naive approach loops over weeks/months making individual count queries.
**How to avoid:** Use Supabase's ability to fetch date ranges with `gte`/`lte` filters, then group in JavaScript. Or use `date_trunc` in a raw SQL query via `supabase.rpc()`.
**Warning signs:** API response time >500ms for trend data.

### Pitfall 2: Chart Re-renders on Dashboard
**What goes wrong:** Recharts components re-render on every parent state change, causing janky chart animations.
**Why it happens:** Chart data is fetched alongside other dashboard state.
**How to avoid:** Separate trend data fetching from command center data. Use `useMemo` for chart data arrays. Consider React `memo` on chart wrapper components.
**Warning signs:** Charts flash/re-animate when other dashboard elements update.

### Pitfall 3: PostHog Funnel Dependency
**What goes wrong:** Assuming PostHog is always configured. The app no-ops gracefully when `NEXT_PUBLIC_POSTHOG_KEY` is unset, but funnel visualization would show nothing.
**Why it happens:** PostHog is an optional dependency -- env vars may not be set in dev/staging.
**How to avoid:** Always show an empty state / placeholder when PostHog is not configured. Build funnel steps from tracked events that are ALSO stored in Supabase (double-write pattern already exists for important events).
**Warning signs:** Funnel section is blank in development.

### Pitfall 4: Large PDF Export Timeout
**What goes wrong:** Generating PDF with @react-pdf/renderer for large datasets can timeout on Vercel (30s limit).
**Why it happens:** @react-pdf/renderer rendering is CPU-intensive.
**How to avoid:** Limit exported data to reasonable bounds (e.g., last 90 days). Use streaming CSV for large exports. Keep PDF exports focused on summary/report format rather than raw data.
**Warning signs:** 504 errors on export endpoint.

### Pitfall 5: Date Timezone Inconsistency
**What goes wrong:** Weekly/monthly groupings shift by a day depending on timezone.
**Why it happens:** Supabase stores UTC, but founder sees local time.
**How to avoid:** Always use UTC for aggregation. Use `date-fns` `startOfWeek`/`startOfMonth` with explicit `weekStartsOn` option. Display dates formatted for readability without implying timezone precision.
**Warning signs:** "Last week" data includes or excludes unexpected days.

## Code Examples

### Chart Component (following established pattern)
```typescript
// Source: components/insights/trend-charts.tsx pattern
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { TrendPeriod } from "@/lib/dashboard/trends";

interface ActivityTrendChartProps {
  data: TrendPeriod[];
}

export function ActivityTrendChart({ data }: ActivityTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center text-muted-foreground">
          No trend data available yet. Keep working with Fred to see your activity trends.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Activity Over Time</CardTitle>
        <CardDescription>Weekly founder activity across features</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6a1a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff6a1a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    {/* Custom tooltip content */}
                  </div>
                );
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="conversations" stroke="#ff6a1a" fillOpacity={1} fill="url(#colorConversations)" name="Conversations" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Engagement Score Computation
```typescript
// lib/dashboard/engagement-score.ts
import { createServiceClient } from "@/lib/supabase/server";
import { subDays } from "date-fns";

const WEIGHTS = {
  chatActivity: 0.30,
  checkInConsistency: 0.25,
  nextStepsProgress: 0.20,
  featureUsage: 0.15,
  documentActivity: 0.10,
};

export async function computeEngagementScore(userId: string) {
  const supabase = createServiceClient();
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30).toISOString();
  const sixtyDaysAgo = subDays(now, 60).toISOString();

  // Parallel queries for current and previous 30-day periods
  const [conversations, checkIns, nextSteps, pitchReviews, documents] = await Promise.all([
    supabase.from("fred_episodic_memory").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("event_type", "conversation").gte("created_at", thirtyDaysAgo),
    supabase.from("sms_checkins").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("direction", "inbound").gte("created_at", thirtyDaysAgo),
    supabase.from("next_steps").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "completed").gte("completed_at", thirtyDaysAgo),
    supabase.from("pitch_reviews").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", thirtyDaysAgo),
    supabase.from("document_repository").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", thirtyDaysAgo),
  ]);

  // Normalize each to 0-100 with reasonable caps
  // e.g., 10+ conversations in 30 days = 100
  // Then weighted sum for overall score
}
```

### CSV Export for Dashboard Data
```typescript
// Reuse existing CSVGenerator
import { CSVGenerator, downloadCSV, getTimestampedFilename } from "@/lib/export/csv-generator";
import type { ExportConfig } from "@/lib/export/types";
import type { TrendPeriod } from "@/lib/dashboard/trends";

const trendExportConfig: ExportConfig<TrendPeriod> = {
  columns: [
    { field: "period", header: "Period" },
    { field: "conversations", header: "Conversations" },
    { field: "checkIns", header: "Check-Ins" },
    { field: "nextStepsCompleted", header: "Next Steps Completed" },
    { field: "decisionsScored", header: "Decisions Scored" },
    { field: "documentsCreated", header: "Documents Created" },
  ],
  filename: "founder-trends",
};

export function exportTrendsAsCSV(data: TrendPeriod[]) {
  const generator = new CSVGenerator(trendExportConfig);
  const csv = generator.generate(data);
  downloadCSV(csv, getTimestampedFilename("founder-trends"));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Point-in-time dashboard | Historical trends (this phase) | Phase 64 | Founders can see progress over time |
| No engagement tracking | Computed engagement score | Phase 64 | Quantifies founder activity |
| Manual data review | CSV/PDF export | Phase 64 | Founders can share progress with advisors/investors |
| No funnel visibility | PostHog funnel visualization | Phase 64 | Identifies user journey bottlenecks |

**Already in place (do not rebuild):**
- PostHog client+server integration (Phase 30)
- CSVGenerator class with full feature set
- @react-pdf/renderer for PDF generation
- Recharts in 38+ components
- Command Center API aggregation pattern
- AnalyticsProvider with auto page-view tracking
- Typed ANALYTICS_EVENTS constants

## Data Sources for Trends

Key Supabase tables that contain time-series founder activity:

| Table | Activity Type | Key Fields | Date Field |
|-------|--------------|------------|------------|
| `fred_episodic_memory` | Conversations, decisions, outcomes | `user_id`, `event_type`, `content` | `created_at` |
| `sms_checkins` | Weekly check-ins | `user_id`, `direction`, `body` | `created_at` |
| `next_steps` | Task completions | `user_id`, `status` | `completed_at` / `created_at` |
| `pitch_reviews` | Pitch deck reviews | `user_id`, `overall_score` | `created_at` |
| `strategy_documents` | Strategy documents | `user_id`, `title` | `created_at` |
| `document_repository` | Documents uploaded | `user_id` | `created_at` |
| `fred_step_evidence` | Process step evidence | `user_id`, `step`, `is_active` | `created_at` |
| `investor_readiness_scores` | IRS assessments | `user_id` | `created_at` |
| `agent_tasks` | Agent dispatches | `user_id`, `status` | `created_at` |

**Note:** No `engagement_scores` or `founder_activity_log` table exists. Engagement must be computed from the tables above.

## PostHog Funnel Visualization

**Current state:** PostHog is integrated for event tracking, but NO funnels are configured. Funnels in PostHog are configured via the PostHog UI (not in code).

**Approach options:**
1. **PostHog Embedded Dashboards** - PostHog offers shared dashboard URLs. Embed in an iframe. Requires PostHog project access.
2. **PostHog Query API** - Use `posthog-node` to query funnel data and render with recharts. More control, but requires PostHog API access.
3. **Build funnel from Supabase data** - Since important events are tracked both in PostHog AND stored in Supabase (conversations, check-ins, step completions), build the funnel visualization purely from Supabase data using recharts.

**Recommendation:** Option 3 (build from Supabase data). This ensures the funnel works even when PostHog is not configured, and gives full control over the visualization. Define funnel steps as: Signup -> First Chat -> First Check-In -> First Next Step Completed -> Readiness Review.

## Open Questions

1. **Granularity preference:** Should trends default to weekly or monthly view? Research suggests weekly for active founders, monthly for longer-term perspective. **Recommendation:** Default to weekly with a toggle for monthly.

2. **Engagement score persistence:** Should engagement scores be cached/stored in a table for historical tracking, or computed on every request? **Recommendation:** Compute on request for now (simpler), add caching later if performance is an issue. The computation involves ~5 count queries which should be fast.

3. **Export scope:** Should "Export" cover just the trends section, or the entire dashboard state (snapshot + trends + engagement)? **Recommendation:** Offer both -- "Export Trends" for CSV data, "Export Report" for full PDF summary.

4. **PostHog environment availability:** Is `NEXT_PUBLIC_POSTHOG_KEY` set in production? If not, the PostHog funnel section should degrade gracefully. **Recommendation:** Build funnel from Supabase data (see above) to guarantee it always works.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `lib/analytics/index.ts`, `lib/analytics/events.ts`, `lib/analytics/server.ts` - PostHog integration
- Codebase inspection: `lib/export/csv-generator.ts`, `lib/export/types.ts` - CSV export infrastructure
- Codebase inspection: `lib/documents/export.ts` - @react-pdf/renderer PDF generation
- Codebase inspection: `components/insights/trend-charts.tsx` - Recharts usage pattern
- Codebase inspection: `lib/dashboard/command-center.ts` - Dashboard data aggregation pattern
- Codebase inspection: `app/dashboard/page.tsx` - Dashboard home page structure
- Codebase inspection: `app/api/dashboard/stats/route.ts` - Dashboard API pattern
- `package.json` - Library versions confirmed

### Secondary (MEDIUM confidence)
- Codebase inspection: `components/monitoring/charts/` - Additional recharts patterns (6 chart components)

### Tertiary (LOW confidence)
- PostHog funnel API capabilities - Based on training knowledge, not verified against current docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, versions confirmed from package.json
- Architecture: HIGH - Patterns derived from existing codebase (command-center.ts, trend-charts.tsx, csv-generator.ts)
- Pitfalls: MEDIUM - Based on codebase patterns and general Next.js/Recharts experience
- PostHog funnels: LOW - No funnels currently configured; approach based on training knowledge

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable - all libraries already pinned in project)
