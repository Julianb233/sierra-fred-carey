# Monitoring Dashboard - Quick Start Guide

## Access the Dashboard

Navigate to: **http://localhost:3000/dashboard/monitoring**

Or click "Monitoring" in the dashboard sidebar.

## What You'll See

### 1. Key Metrics (Top Row)
- **Total Requests**: Number of API requests in last 24h
- **Avg Latency**: Average response time
- **Success Rate**: API success percentage
- **Active Experiments**: Number of running A/B tests

### 2. Three Tabs

#### Experiments Tab
- View all active and completed A/B tests
- See traffic splits and status
- Track statistical significance
- Quick actions to create new experiments

#### Alerts Tab
- Recent system notifications
- Color-coded by severity (error, warning, info, success)
- Resolved/unresolved status
- Source tracking

#### Analysis Tab
- Detailed variant comparisons
- Conversion rate breakdowns
- Statistical significance warnings
- Winner determination

## Mock Data

The dashboard currently shows mock data for demonstration. To use real data:

1. Implement API endpoint: `/api/monitoring/dashboard`
2. Return data in this format:

```json
{
  "metrics": {
    "totalRequests": 45789,
    "avgLatency": 234,
    "successRate": 99.8,
    "activeExperiments": 3
  },
  "experiments": [
    {
      "id": "exp-1",
      "name": "Hero CTA Button Color",
      "status": "active",
      "variants": ["Control", "Variant A"],
      "traffic": 100,
      "startDate": "2024-01-15",
      "significance": 92
    }
  ],
  "alerts": [
    {
      "id": "alert-1",
      "type": "success",
      "message": "Experiment reached significance",
      "timestamp": "2024-01-15T10:30:00Z",
      "source": "A/B Testing",
      "resolved": false
    }
  ]
}
```

## Features

- ✅ Auto-refresh every 30 seconds
- ✅ Manual refresh button
- ✅ Real-time status indicator
- ✅ Responsive design (mobile & desktop)
- ✅ Dark mode support
- ✅ Loading states

## Using Components Elsewhere

```tsx
// Import individual components
import {
  MetricsCard,
  ExperimentList,
  AlertsTable,
  VariantComparison
} from "@/components/monitoring";

// Use them anywhere in your app
<MetricsCard
  title="Page Views"
  value={12345}
  change={8.5}
  trend="up"
/>
```

## Customization

### Colors
Edit `/app/globals.css` to change the primary orange color:
```css
--orange-500: #ff6a1a; /* Change this */
```

### Refresh Interval
Edit `/app/dashboard/monitoring/page.tsx`:
```tsx
// Change 30000 (30 seconds) to your desired interval
const interval = setInterval(() => {
  fetchDashboardData();
}, 30000); // <-- Change this value
```

### Max Alerts Shown
```tsx
<AlertsTable alerts={alerts} maxItems={10} /> {/* Change 10 to desired number */}
```

## Common Tasks

### Add New Metric Card
```tsx
<MetricsCard
  title="Your Metric"
  value={yourValue}
  change={percentChange}
  trend="up"
  icon={<YourIcon />}
  description="Description here"
  color="text-blue-600"
/>
```

### Filter Experiments
```tsx
const activeExperiments = experiments.filter(e => e.status === "active");
<ExperimentList experiments={activeExperiments} />
```

### Export Alert Data
```tsx
const exportAlerts = () => {
  const csv = alerts.map(a => `${a.timestamp},${a.type},${a.message}`).join('\n');
  // Download CSV file
};
```

## Troubleshooting

### No Data Showing
- Check if API endpoint is implemented
- Open browser console for errors
- Verify API response format matches expected structure

### Auto-refresh Not Working
- Check browser console for errors
- Verify API endpoint is accessible
- Check network tab in DevTools

### Components Not Loading
- Verify all imports are correct
- Check for TypeScript errors
- Run `npm run build` to check for build errors

## Next Steps

1. Implement backend API endpoints
2. Add authentication/authorization
3. Set up real-time WebSocket updates
4. Create experiment creation UI
5. Add data export functionality
6. Implement email notifications

## Support

For issues or questions:
1. Check the main README: `/components/monitoring/README.md`
2. Review implementation summary: `/MONITORING_DASHBOARD.md`
3. Check component source code for inline comments
