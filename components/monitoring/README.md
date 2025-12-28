# Monitoring Dashboard Components

A comprehensive set of React components for building monitoring dashboards with real-time metrics, A/B testing analysis, and system alerts.

## Components

### MetricsCard

Display key performance metrics with trends and icons.

```tsx
import { MetricsCard } from "@/components/monitoring";

<MetricsCard
  title="Total Requests"
  value={45789}
  change={12.5}
  trend="up"
  icon={<ActivityLogIcon />}
  description="Last 24 hours"
  color="text-blue-600"
/>
```

**Props:**
- `title`: Metric name
- `value`: Current value (string or number)
- `change?`: Percentage change
- `trend?`: "up" | "down" | "neutral"
- `icon?`: React icon component
- `description?`: Additional context
- `color?`: Tailwind color class for icon
- `loading?`: Show loading skeleton

### ExperimentList

Display a list of A/B testing experiments with status badges.

```tsx
import { ExperimentList } from "@/components/monitoring";

<ExperimentList
  experiments={[
    {
      id: "exp-1",
      name: "Hero CTA Button Color",
      status: "active",
      variants: ["Control", "Variant A"],
      traffic: 100,
      startDate: "2024-01-15",
      significance: 92,
    }
  ]}
/>
```

**Props:**
- `experiments`: Array of experiment objects
- `loading?`: Show loading skeleton

### AlertsTable

Display system alerts and notifications in a table format.

```tsx
import { AlertsTable } from "@/components/monitoring";

<AlertsTable
  alerts={[
    {
      id: "alert-1",
      type: "success",
      message: "Experiment reached statistical significance",
      timestamp: "2024-01-15T10:30:00Z",
      source: "A/B Testing",
      resolved: false,
    }
  ]}
  maxItems={10}
/>
```

**Props:**
- `alerts`: Array of alert objects
- `loading?`: Show loading skeleton
- `maxItems?`: Maximum number of alerts to display (default: 10)

### VariantComparison

Compare A/B test variants with conversion rates and statistical significance.

```tsx
import { VariantComparison } from "@/components/monitoring";

<VariantComparison
  experimentName="Hero CTA Button Color"
  significance={92}
  variants={[
    {
      name: "Control",
      conversions: 1234,
      visitors: 12500,
      conversionRate: 9.87,
      isControl: true,
    },
    {
      name: "Variant A",
      conversions: 1456,
      visitors: 12450,
      conversionRate: 11.69,
      improvement: 18.4,
      isWinner: true,
    }
  ]}
/>
```

**Props:**
- `experimentName`: Name of the experiment
- `variants`: Array of variant performance data
- `significance?`: Statistical significance percentage
- `loading?`: Show loading skeleton

### VariantDetailView

Deep dive into a single experiment with comprehensive metrics, charts, and alerts.

```tsx
import { VariantDetailView } from "@/components/monitoring";

<VariantDetailView
  experimentName="Hero CTA Button Color"
  onClose={() => console.log("closed")}
/>
```

**Features:**
- Fetches data from `/api/monitoring/experiments/[name]`
- Conversion rate charts (Recharts)
- Performance metrics charts (latency, errors)
- Detailed variant cards with all metrics
- Alert display for the experiment
- Statistical significance indicators
- Winner detection and highlighting

**Props:**
- `experimentName`: Name of the experiment to fetch
- `onClose?`: Optional callback when close button is clicked

## API Integration

The monitoring dashboard expects the following API endpoints:

### GET /api/monitoring/dashboard

Returns overall dashboard metrics.

```json
{
  "metrics": {
    "totalRequests": 45789,
    "avgLatency": 234,
    "successRate": 99.8,
    "activeExperiments": 3
  },
  "experiments": [...],
  "alerts": [...]
}
```

### GET /api/monitoring/experiments

Returns all experiments.

```json
[
  {
    "id": "exp-1",
    "name": "Hero CTA Button Color",
    "status": "active",
    "variants": ["Control", "Variant A"],
    "traffic": 100,
    "startDate": "2024-01-15",
    "significance": 92
  }
]
```

### GET /api/monitoring/alerts

Returns recent alerts.

```json
[
  {
    "id": "alert-1",
    "type": "success",
    "message": "Experiment reached significance",
    "timestamp": "2024-01-15T10:30:00Z",
    "source": "A/B Testing",
    "resolved": false
  }
]
```

## Features

- **Real-time Updates**: Automatically refreshes every 30 seconds
- **Loading States**: Skeleton loaders for better UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode**: Full dark mode support
- **Accessibility**: WCAG compliant with proper ARIA labels
- **Type Safety**: Full TypeScript support

## Styling

All components use the project's existing design system:
- Primary color: `#ff6a1a` (orange)
- Card components from shadcn/ui
- Tailwind CSS for styling
- Radix UI icons

## Usage in Dashboard

The monitoring dashboard page is located at `/app/dashboard/monitoring/page.tsx` and can be accessed via the dashboard navigation.

```tsx
// Navigate to monitoring dashboard
<Link href="/dashboard/monitoring">Monitoring</Link>
```

## Development

The monitoring dashboard is **fully integrated** with the backend APIs at:
- `/api/monitoring/dashboard`
- `/api/monitoring/alerts`
- `/api/monitoring/experiments/[name]`

All components connect to real data automatically. No mock data needed!

## Type Definitions

See `/types/monitoring.ts` for complete type definitions:
- `DashboardResponse` - Dashboard API response
- `AlertsResponse` - Alerts API response
- `ExperimentDetailResponse` - Experiment detail API response
- `UIExperiment` - Component-friendly experiment type
- `UIAlert` - Component-friendly alert type
- `UIVariant` - Component-friendly variant type

Utility functions available:
- `transformExperiment()` - Convert backend to UI type
- `transformAlert()` - Convert backend to UI type
- `transformVariant()` - Convert backend to UI type
- `calculateMetrics()` - Aggregate metrics calculation
- `generateChartData()` - Generate time-series data

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Export data to CSV/PDF
- [ ] Custom date range filters
- [ ] Advanced filtering and search
- [ ] Email notifications for alerts
- [ ] Experiment creation UI
- [ ] Custom metrics builder

## Summary

**Status:** ✅ Production Ready
**Backend Integration:** ✅ Fully Connected
**Charts:** ✅ Recharts integrated
**Type Safety:** ✅ Full TypeScript coverage
**Dark Mode:** ✅ Supported
**Responsive:** ✅ Mobile optimized
