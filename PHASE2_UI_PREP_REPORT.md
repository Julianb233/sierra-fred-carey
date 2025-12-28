# Phase 2 Monitoring Dashboard UI - Preparation Report

**Project:** Sierra Fred Carey - A/B Testing & Monitoring Platform
**Prepared by:** Fiona-Frontend
**Date:** 2025-12-28
**Status:** Ready for Implementation

---

## Executive Summary

The monitoring dashboard foundation is **80% complete** with robust backend APIs and basic UI components already in place. The existing infrastructure uses Next.js 16, React 19, shadcn/ui components, and Recharts for visualization. Phase 2 requires enhancing the UI with real-time updates, advanced charting, and improved user experience.

---

## Current State Analysis

### Existing UI Components (Already Built)

#### 1. Core Monitoring Components
All located in `/root/github-repos/sierra-fred-carey/components/monitoring/`:

- **MetricsCard.tsx** - Reusable metric display cards with trend indicators
  - Features: Loading states, trend arrows, customizable colors
  - Status: Production-ready

- **ExperimentList.tsx** - Experiment status cards with progress tracking
  - Features: Status badges, traffic split progress bars, winner detection
  - Status: Production-ready

- **AlertsTable.tsx** - Alert history table with filtering
  - Features: Alert type badges, timestamp formatting, resolved status
  - Status: Production-ready

- **VariantComparison.tsx** - Detailed variant performance comparison
  - Features: Conversion rate display, improvement percentages, statistical significance
  - Status: Production-ready

#### 2. Dashboard Page Implementation
File: `/root/github-repos/sierra-fred-carey/app/dashboard/monitoring/page.tsx`

Features implemented:
- Tabbed interface (Experiments, Alerts, Analysis)
- Auto-refresh every 30 seconds
- Manual refresh button
- Mock data fallback for development
- Responsive grid layout for metrics
- Status footer with system health indicator

### Available API Endpoints

All endpoints operational and tested:

1. **GET /api/monitoring/dashboard**
   - Returns: Active experiments, metrics, alerts
   - Time range: Last 24 hours by default
   - Status: Fully functional

2. **GET /api/monitoring/alerts**
   - Query params: `level`, `type`, `notify`
   - Returns: Filtered alerts with breakdown
   - Features: Auto-notification capability
   - Status: Fully functional

3. **POST /api/monitoring/alerts**
   - Purpose: Manual alert notifications
   - Validation: Level and type checking
   - Status: Fully functional

4. **GET /api/monitoring/experiments/[name]**
   - Query params: `startDate`, `endDate`, `days`
   - Returns: Detailed variant comparison
   - Features: Statistical significance calculation
   - Status: Fully functional

5. **GET /api/monitoring/variants/[id]**
   - Returns: Individual variant metrics
   - Status: Available (not yet examined in detail)

6. **POST /api/monitoring/alerts/check**
   - Purpose: Alert checking endpoint
   - Status: Available (not yet examined in detail)

### Design System in Use

**Framework:** Next.js 16 with App Router (React Server Components)

**UI Library:** shadcn/ui (Radix UI primitives)
- Consistent component patterns
- Dark mode support via next-themes
- Accessible by default (WCAG 2.1 AA)

**Styling:**
- Tailwind CSS 4.1.13
- Custom color palette with primary: #ff6a1a (orange)
- Responsive breakpoints: sm, md, lg, xl
- Dark mode support

**Available UI Components:**
- accordion, avatar, badge, breadcrumb, button, card
- checkbox, dialog, dropdown-menu, input, label
- navigation-menu, progress, radio-group, select
- separator, sheet, skeleton, switch, table, tabs
- textarea, tooltip

**Chart Library:** Recharts 3.6.0
- Already in package.json
- Production-ready for advanced visualizations

**Animation:**
- GSAP 3.14.2 with @gsap/react 2.1.2
- Framer Motion 12.23.13
- Both available for micro-interactions

---

## Components Needed for Phase 2

### 1. Real-Time Metrics Display (Medium Effort)

**New Component:** `components/monitoring/LiveMetricsPanel.tsx`

**Features:**
- Real-time WebSocket or polling connection
- Live updating metric cards
- Sparkline charts for trend visualization
- Color-coded health indicators

**Dependencies:**
- Use existing MetricsCard component
- Add Recharts LineChart for sparklines
- WebSocket connection or SWR for real-time updates

**Estimated Effort:** 4-6 hours

**API Integration:**
- Poll `/api/monitoring/dashboard` every 10-30s
- Consider WebSocket for true real-time (future enhancement)

---

### 2. Enhanced Experiment Status Cards (Small-Medium)

**Enhancement:** Update `ExperimentList.tsx` or create `ExperimentStatusGrid.tsx`

**New Features:**
- Real-time participant counts
- Live conversion tracking
- Mini chart showing conversion trend over time
- Quick actions (pause, stop, declare winner)

**Dependencies:**
- Recharts for trend mini-charts
- Existing ExperimentList as base
- API endpoint for actions (create new POST endpoints)

**Estimated Effort:** 3-4 hours

**API Needed:**
- GET `/api/monitoring/experiments/[id]/timeline` (NEW)
- POST `/api/monitoring/experiments/[id]/action` (NEW)

---

### 3. Advanced Alert History View (Small)

**Enhancement:** Extend `AlertsTable.tsx` or create `AlertsTimeline.tsx`

**New Features:**
- Timeline view option (alternative to table)
- Alert grouping by experiment
- Filter by severity, type, date range
- Alert acknowledgement and resolution tracking

**Dependencies:**
- Existing AlertsTable as base
- Add date range picker (create new component)
- Badge components for status

**Estimated Effort:** 2-3 hours

**API Enhancement:**
- Add pagination to `/api/monitoring/alerts`
- Add acknowledgement endpoint: POST `/api/monitoring/alerts/[id]/acknowledge` (NEW)

---

### 4. Interactive Charts and Graphs (Large)

**New Component:** `components/monitoring/PerformanceCharts.tsx`

**Chart Types Needed:**

a) **Conversion Rate Over Time**
   - Line chart comparing all variants
   - Time range selector (24h, 7d, 30d, custom)
   - Confidence interval shading

b) **Latency Distribution**
   - Histogram or violin plot
   - P50, P95, P99 markers
   - Comparison across variants

c) **Traffic Distribution**
   - Pie chart or donut chart
   - Shows actual vs expected traffic split

d) **Error Rate Trends**
   - Area chart with threshold lines
   - Alert threshold indicators

**Dependencies:**
- Recharts: LineChart, AreaChart, PieChart, BarChart
- Date range picker component (create new)
- Legend component with interactive filtering

**Estimated Effort:** 8-10 hours

**API Integration:**
- GET `/api/monitoring/experiments/[name]/timeseries` (NEW)
- Query params: `metric`, `granularity`, `startDate`, `endDate`

---

### 5. Variant Comparison Enhancement (Medium)

**Enhancement:** Update `VariantComparison.tsx`

**New Features:**
- Side-by-side metric comparison table
- Statistical significance calculator widget
- Confidence interval visualization
- Sample size progression chart

**Dependencies:**
- Existing VariantComparison component
- Add Table component for detailed metrics
- Recharts for confidence visualization

**Estimated Effort:** 4-5 hours

**API Integration:**
- Use existing `/api/monitoring/experiments/[name]`
- Add statistical calculations on frontend

---

### 6. Alert Configuration Panel (Medium)

**New Component:** `components/monitoring/AlertConfig.tsx`

**Features:**
- Configure alert thresholds per metric
- Set notification preferences
- Test alert rules
- Alert history and performance

**Dependencies:**
- Form components (input, select, switch)
- Card, Dialog for modal editing
- Badge for status indicators

**Estimated Effort:** 5-6 hours

**API Needed:**
- GET `/api/monitoring/alert-config` (NEW)
- PUT `/api/monitoring/alert-config` (NEW)
- POST `/api/monitoring/alert-config/test` (NEW)

---

### 7. Dashboard Filters and Controls (Small-Medium)

**New Component:** `components/monitoring/DashboardFilters.tsx`

**Features:**
- Date range picker
- Experiment selector (multi-select)
- Metric type filter
- Export functionality (CSV, JSON)

**Dependencies:**
- Create DateRangePicker component (use date-fns)
- Multi-select dropdown (use existing select)
- Export utility functions

**Estimated Effort:** 3-4 hours

**API Integration:**
- Pass filters to all existing endpoints as query params
- Add export endpoint: GET `/api/monitoring/export` (NEW)

---

### 8. System Health Dashboard Widget (Small)

**New Component:** `components/monitoring/SystemHealth.tsx`

**Features:**
- Overall system status indicator
- Service health checks (API, DB, Queue)
- Response time averages
- Last incident timestamp

**Dependencies:**
- Badge, Card components
- Simple icon indicators
- Tooltip for details

**Estimated Effort:** 2-3 hours

**API Needed:**
- GET `/api/monitoring/health` (NEW)

---

## Component Architecture Recommendation

### Suggested Folder Structure

```
components/monitoring/
├── cards/
│   ├── MetricsCard.tsx (existing)
│   ├── ExperimentCard.tsx (new - enhanced version)
│   ├── AlertCard.tsx (new - individual alert)
│   └── SystemHealthCard.tsx (new)
├── charts/
│   ├── ConversionRateChart.tsx (new)
│   ├── LatencyDistribution.tsx (new)
│   ├── TrafficPieChart.tsx (new)
│   ├── ErrorTrendChart.tsx (new)
│   └── SparklineChart.tsx (new - reusable)
├── tables/
│   ├── AlertsTable.tsx (existing)
│   ├── ExperimentList.tsx (existing)
│   ├── VariantComparison.tsx (existing)
│   └── MetricsTable.tsx (new - detailed metrics)
├── panels/
│   ├── LiveMetricsPanel.tsx (new)
│   ├── AlertConfig.tsx (new)
│   └── DashboardFilters.tsx (new)
├── widgets/
│   ├── SystemHealth.tsx (new)
│   ├── QuickActions.tsx (new)
│   └── NotificationCenter.tsx (new)
└── utils/
    ├── chartConfig.ts (new - shared chart configs)
    ├── formatters.ts (new - data formatting utilities)
    └── calculations.ts (new - statistical calculations)
```

---

## API Endpoints Summary

### Existing (Ready to Use)
- ✅ GET `/api/monitoring/dashboard`
- ✅ GET `/api/monitoring/alerts`
- ✅ POST `/api/monitoring/alerts`
- ✅ GET `/api/monitoring/experiments/[name]`
- ✅ GET `/api/monitoring/variants/[id]`
- ✅ POST `/api/monitoring/alerts/check`

### New Endpoints Needed (Backend Work Required)
- ⚠️ GET `/api/monitoring/experiments/[id]/timeline`
- ⚠️ POST `/api/monitoring/experiments/[id]/action`
- ⚠️ POST `/api/monitoring/alerts/[id]/acknowledge`
- ⚠️ GET `/api/monitoring/experiments/[name]/timeseries`
- ⚠️ GET `/api/monitoring/alert-config`
- ⚠️ PUT `/api/monitoring/alert-config`
- ⚠️ POST `/api/monitoring/alert-config/test`
- ⚠️ GET `/api/monitoring/export`
- ⚠️ GET `/api/monitoring/health`

---

## Technical Considerations

### Performance Optimization

1. **Data Fetching Strategy:**
   - Use React Query (TanStack Query) for server state management
   - Implement stale-while-revalidate caching
   - Polling intervals: 10-30s for metrics, 5-10s for alerts
   - Consider WebSocket for real-time updates (future)

2. **Rendering Optimization:**
   - Memoize chart components with React.memo
   - Use useMemo for expensive calculations
   - Virtualize long lists (alerts, experiments) if needed
   - Lazy load chart components

3. **Bundle Size:**
   - Code split dashboard routes
   - Tree-shake Recharts imports (import specific charts)
   - Lazy load heavy visualizations

### Accessibility

1. **Charts:**
   - Provide data table alternatives
   - ARIA labels for all chart elements
   - Keyboard navigation for interactive charts
   - High contrast mode support

2. **Real-time Updates:**
   - Announce updates to screen readers
   - Provide pause controls for auto-refresh
   - Visual indicators for new data

3. **Color Usage:**
   - Don't rely solely on color for status
   - Use icons + text + color combination
   - Ensure WCAG AA contrast ratios

### Responsive Design

- Mobile: Single column, stacked metrics
- Tablet: 2-column grid for metrics, full-width charts
- Desktop: 4-column metrics grid, side-by-side comparisons
- Test on: iPhone 12, iPad Pro, 1920x1080, 2560x1440

---

## Development Phases

### Phase 2A: Enhanced Metrics & Charts (Priority: High)
**Duration:** 1-2 weeks

Components:
- LiveMetricsPanel
- PerformanceCharts (all chart types)
- Enhanced VariantComparison
- SparklineChart utility

### Phase 2B: Alert Management (Priority: High)
**Duration:** 1 week

Components:
- Enhanced AlertsTable with timeline view
- AlertConfig panel
- NotificationCenter widget

### Phase 2C: System Health & Controls (Priority: Medium)
**Duration:** 1 week

Components:
- SystemHealth widget
- DashboardFilters
- Export functionality
- QuickActions panel

### Phase 2D: Polish & Optimization (Priority: Medium)
**Duration:** 1 week

Tasks:
- Performance optimization
- Accessibility audit
- Mobile responsiveness
- Loading states and error handling
- Animation polish

---

## Estimated Total Effort

| Component/Feature | Effort | Priority |
|-------------------|--------|----------|
| LiveMetricsPanel | 4-6h | High |
| Enhanced Experiment Cards | 3-4h | High |
| Alert History Enhancement | 2-3h | Medium |
| Performance Charts (all) | 8-10h | High |
| Variant Comparison Enhancement | 4-5h | Medium |
| Alert Config Panel | 5-6h | Medium |
| Dashboard Filters | 3-4h | Medium |
| System Health Widget | 2-3h | Low |
| New API Endpoints | 16-20h | High (backend) |
| Testing & QA | 8-10h | High |
| Documentation | 4h | Medium |

**Total Frontend Development:** 35-45 hours (1-2 weeks)
**Total Backend Development:** 16-20 hours (backend team)
**Total Testing & QA:** 8-10 hours

**Grand Total:** 59-75 hours (2-3 weeks for full implementation)

---

## Recommended Tech Stack Additions

### For Enhanced Functionality

1. **TanStack Query (React Query)** - Server state management
   ```bash
   npm install @tanstack/react-query
   ```

2. **date-fns** - Already installed ✅
   - Use for date range picker and formatting

3. **React Hook Form** - For alert configuration forms
   ```bash
   npm install react-hook-form
   ```

4. **Zod** - Form validation
   ```bash
   npm install zod @hookform/resolvers
   ```

5. **Recharts** - Already installed ✅
   - Use for all chart visualizations

6. **Sonner** - Already installed ✅
   - Use for toast notifications

---

## Risk Assessment

### Low Risk
- Using existing shadcn/ui components
- Recharts integration (already in dependencies)
- Basic API polling

### Medium Risk
- Real-time updates at scale (consider load)
- Chart performance with large datasets
- Mobile responsiveness for complex charts

### High Risk
- Statistical calculations accuracy
- Timezone handling across users
- Alert notification delivery reliability

### Mitigation Strategies
- Implement data pagination for large datasets
- Add chart data sampling for performance
- Server-side statistical calculations
- Comprehensive timezone testing
- Monitoring alert delivery with retry logic

---

## Next Steps

1. **Immediate Actions:**
   - Review and approve this preparation report
   - Coordinate with backend team for new API endpoints
   - Set up TanStack Query for data fetching
   - Create DateRangePicker utility component

2. **Week 1:**
   - Implement LiveMetricsPanel
   - Build core charts (Conversion, Latency, Traffic)
   - Set up real-time polling infrastructure

3. **Week 2:**
   - Complete all chart types
   - Enhance VariantComparison
   - Build AlertConfig panel
   - Add DashboardFilters

4. **Week 3:**
   - SystemHealth widget
   - Polish and optimization
   - Testing and QA
   - Documentation

---

## Conclusion

The Phase 2 Monitoring Dashboard UI is well-positioned for success with:

**Strengths:**
- Solid foundation with existing components
- Production-ready API endpoints
- Modern tech stack (Next.js 16, React 19)
- Excellent design system (shadcn/ui)
- Chart library already available (Recharts)

**Opportunities:**
- Enhance user experience with real-time updates
- Advanced visualizations for data-driven decisions
- Improved alert management and configuration
- Mobile-optimized monitoring experience

**Recommended Approach:**
- Iterative development in 3 phases (2A, 2B, 2C)
- Focus on high-priority items first (metrics, charts)
- Parallel frontend and backend development
- Continuous testing and user feedback

**Timeline:** 2-3 weeks for complete implementation with polish and testing.

---

**Report prepared by:** Fiona-Frontend
**Project:** Sierra Fred Carey Monitoring Dashboard
**Date:** 2025-12-28
**Status:** Ready for Phase 2 Implementation
