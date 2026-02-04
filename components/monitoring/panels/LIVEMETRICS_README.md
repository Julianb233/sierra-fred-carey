# LiveMetricsPanel Component

## Overview

A production-ready, real-time metrics dashboard component that displays live system performance data with sparkline visualizations and auto-refresh capabilities.

---

## Component Structure

```
┌──────────────────────────────────────────────────────────────┐
│ LiveMetricsPanel                                              │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 🟢 Updated 5s ago        🔄 Auto-refresh 10s         │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Requests │  │ Latency  │  │ Errors   │  │ Uptime   │    │
│  │          │  │          │  │          │  │          │    │
│  │  125K    │  │   85ms   │  │  0.5%    │  │  99.9%   │    │
│  │ ───────  │  │ ───────  │  │ ───────  │  │ ───────  │    │
│  │ Sparkline│  │ Sparkline│  │ Sparkline│  │ Sparkline│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## Visual States

### Normal State
```
┌────────────────────────┐
│ Total Requests      📊 │
│                        │
│ 125,432               │
│ ──────────────────     │  ← Sparkline
│                        │
│ Last 24 hours         │
└────────────────────────┘
```

### Updating State (Pulsing Orange Ring)
```
┌────────────────────────┐  ← Orange glow
│ Total Requests      📊 │
│                        │
│ 125,433  ⬆️            │
│ ──────────────────     │
│                        │
│ Last 24 hours         │
└────────────────────────┘
```

### Error State
```
┌────────────────────────┐
│ ⚠️  Error Rate     🔺  │
│                        │
│ 5.2%                  │  ← Red color
│ ──────────────────     │  ← Red sparkline
│                        │
│ Target: <1%           │
└────────────────────────┘
```

### Loading State
```
┌────────────────────────┐
│ ▒▒▒▒▒▒▒▒▒▒            │  ← Skeleton
│                        │
│ ▒▒▒▒▒▒▒▒              │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│                        │
│ ▒▒▒▒▒▒▒               │
└────────────────────────┘
```

---

## Quick Start

### Basic Usage
```tsx
import { LiveMetricsPanel } from "@/components/monitoring/panels/LiveMetricsPanel";

export default function Dashboard() {
  return <LiveMetricsPanel />;
}
```

### Advanced Usage
```tsx
import { LiveMetricsPanel } from "@/components/monitoring/panels/LiveMetricsPanel";

export default function Dashboard() {
  return (
    <LiveMetricsPanel
      refreshInterval={15000}  // Refresh every 15 seconds
      maxSparklinePoints={30}  // Show 30 data points
      onDataUpdate={(data) => {
        console.log("New data:", data);
      }}
      onError={(error) => {
        // Send to error tracking
        console.error(error);
      }}
    />
  );
}
```

---

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `refreshInterval` | `number` | `10000` | Auto-refresh interval in milliseconds |
| `onDataUpdate` | `(data: MetricData) => void` | `undefined` | Callback when data updates |
| `onError` | `(error: Error) => void` | `undefined` | Callback when error occurs |
| `maxSparklinePoints` | `number` | `20` | Max data points in sparkline |

---

## Data Structure

### MetricData
```typescript
interface MetricData {
  requestCount: number;    // Total requests in period
  avgLatency: number;      // Average latency in ms
  errorRate: number;       // Error rate as percentage
  uptime: number;          // Uptime percentage
  timestamp: string;       // ISO timestamp
}
```

### SparklineData
```typescript
interface SparklineData {
  value: number;      // Metric value
  timestamp: number;  // Unix timestamp
}
```

---

## Metrics Display

### Total Requests
- **Icon:** 📊 Activity Log
- **Color:** Orange (#ff6a1a)
- **Format:** Abbreviated (125K, 1.5M)
- **Sparkline:** Request volume trend
- **Description:** "Last 24 hours"

### Average Latency
- **Icon:** ⏱️ Timer
- **Color:** Blue (#3b82f6)
- **Format:** Milliseconds (85ms)
- **Sparkline:** Latency trend
- **Description:** "P95: {value}ms"

### Error Rate
- **Icon:** ⚠️ Warning Triangle
- **Color:** Dynamic (Green/Yellow/Red)
  - Green: < 1%
  - Yellow: 1-5%
  - Red: > 5%
- **Format:** Percentage (0.5%)
- **Sparkline:** Error trend
- **Description:** "Target: <1%"

### Uptime
- **Icon:** 🚀 Rocket
- **Color:** Dynamic (Green/Yellow/Red)
  - Green: ≥ 99.5%
  - Yellow: 95-99.5%
  - Red: < 95%
- **Format:** Percentage (99.9%)
- **Sparkline:** Uptime trend
- **Description:** "SLA: 99.9%"

---

## Responsive Breakpoints

```css
/* Mobile (default) */
grid-cols-1

/* Tablet (≥768px) */
md:grid-cols-2

/* Desktop (≥1024px) */
lg:grid-cols-4
```

---

## Auto-Refresh Behavior

1. **Initial Load:**
   - Shows loading skeleton
   - Fetches data immediately
   - Displays data when ready

2. **Updates:**
   - Fetches every `refreshInterval` ms
   - Visual pulse on update
   - Smooth transitions

3. **Error Handling:**
   - Shows last valid data
   - Displays error banner
   - Continues refresh attempts

4. **Cleanup:**
   - Clears intervals on unmount
   - Prevents memory leaks
   - Cancels pending timeouts

---

## Sparkline Configuration

### Chart Settings
```typescript
{
  type: "monotone",
  strokeWidth: 2,
  dot: false,
  animationDuration: 300
}
```

### Y-Axis Scaling
- **Requests/Latency:** `["dataMin", "dataMax"]`
- **Error Rate:** `[0, "dataMax + 1"]`
- **Uptime:** `[99, 100]`

### Data Management
- Maintains last `maxSparklinePoints` (default: 20)
- Auto-prunes old data points
- Efficient array slicing

---

## Color System

### Health Status Colors
```typescript
const colors = {
  success: {
    light: "#16a34a",  // green-600
    dark: "#4ade80"    // green-400
  },
  warning: {
    light: "#ca8a04",  // yellow-600
    dark: "#facc15"    // yellow-400
  },
  error: {
    light: "#dc2626",  // red-600
    dark: "#f87171"    // red-400
  },
  primary: {
    light: "#ff6a1a",  // brand orange
    dark: "#ff6a1a"
  },
  info: {
    light: "#3b82f6",  // blue-600
    dark: "#60a5fa"    // blue-400
  }
};
```

---

## Performance Considerations

### Optimization Strategies
1. **Memoization:** `useCallback` for fetch function
2. **Efficient Updates:** Only update changed metrics
3. **Debounced Animations:** 500ms pulse timeout
4. **Smart Rendering:** Conditional chart rendering

### Memory Management
- Auto-prunes sparkline data
- Clears intervals on unmount
- Prevents state updates on unmounted components

### Network Optimization
- Single API call per refresh
- Compressed JSON responses
- Configurable refresh rate

---

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Color contrast ratios meet WCAG AA
- Keyboard navigation support
- Screen reader friendly

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Testing

### Unit Tests (Example)
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { LiveMetricsPanel } from './LiveMetricsPanel';

describe('LiveMetricsPanel', () => {
  it('renders loading state initially', () => {
    render(<LiveMetricsPanel />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays metrics after fetch', async () => {
    render(<LiveMetricsPanel />);
    await waitFor(() => {
      expect(screen.getByText(/Total Requests/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Tests
- API endpoint connectivity
- Auto-refresh functionality
- Error state handling
- Responsive layout verification

---

## Troubleshooting

### Common Issues

**Q: Sparklines not showing**
- Check data has > 1 point
- Verify Recharts is installed
- Check browser console for errors

**Q: Auto-refresh not working**
- Verify `refreshInterval` is set
- Check API endpoint is accessible
- Look for interval cleanup issues

**Q: Colors not changing**
- Verify thresholds are correct
- Check CSS class application
- Ensure dark mode is configured

---

## Dependencies

```json
{
  "recharts": "^2.x.x",
  "date-fns": "^2.x.x",
  "@radix-ui/react-icons": "^1.x.x"
}
```

---

## Related Components

- `MetricsCard` - Individual metric display
- `PerformanceCharts` - Advanced analytics
- `AlertsTable` - Alert management
- `ExperimentList` - A/B test listing

---

## License

Part of the sierra-fred-carey project monitoring system.
