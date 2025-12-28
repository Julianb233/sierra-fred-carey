# ExperimentDetailModal Architecture

## Component Hierarchy

```
ExperimentDetailModal (Root)
├── Dialog (Radix UI)
│   └── DialogContent (max-w-4xl)
│       ├── DialogHeader
│       │   ├── DialogTitle (Experiment name)
│       │   └── Badges Row
│       │       ├── Status Badge (Active/Completed)
│       │       ├── Winner Badge (if hasWinner)
│       │       └── Confidence Badge (if significance exists)
│       │
│       ├── Tabs (3 tabs)
│       │   ├── TabsList
│       │   │   ├── TabsTrigger: "Variants" (BarChart3Icon)
│       │   │   ├── TabsTrigger: "Promotion" (RocketIcon)
│       │   │   └── TabsTrigger: "Performance" (ActivityIcon)
│       │   │
│       │   ├── TabsContent: "variants"
│       │   │   └── VariantComparison
│       │   │       ├── Experiment name header
│       │   │       ├── Statistical significance display
│       │   │       └── Variant cards (each with):
│       │   │           ├── Name + Control/Winner badges
│       │   │           ├── Conversion rate (large)
│       │   │           ├── Conversions & Visitors metrics
│       │   │           ├── Performance progress bar
│       │   │           └── Improvement percentage (vs control)
│       │   │
│       │   ├── TabsContent: "promotion"
│       │   │   └── PromotionStatus
│       │   │       ├── Recommendation badge
│       │   │       ├── Key metrics grid
│       │   │       │   ├── Winner variant
│       │   │       │   ├── Confidence level
│       │   │       │   └── Improvement percentage
│       │   │       ├── Safety checks summary
│       │   │       │   ├── Passed/Warning/Critical counts
│       │   │       │   └── Expandable detailed checks list
│       │   │       └── Action buttons
│       │   │           ├── "Promote Winning Variant" (if eligible)
│       │   │           ├── "Promote Anyway" (if manual review)
│       │   │           └── "Refresh Status"
│       │   │
│       │   └── TabsContent: "performance"
│       │       └── Card (Performance Metrics)
│       │           ├── Header + Description
│       │           ├── Variant performance cards (each with):
│       │           │   ├── Name + badges
│       │           │   └── Metrics grid:
│       │           │       ├── Avg Latency (ms)
│       │           │       └── Error Rate (%)
│       │           └── Info banner (blue)
│       │
│       └── DialogFooter
│           ├── "Close" button (outline)
│           └── "Promote Winner" button (if canPromote)
│               └── Brand color (#ff6a1a)
```

## Data Flow

```
Parent Component
    │
    ├── [experiment: UIExperiment] ──────────────┐
    │                                             │
    ├── [open: boolean] ─────────────────────────┤
    │                                             │
    ├── [onOpenChange: (open) => void] ──────────┤
    │                                             │
    ├── [onPromote?: (name) => void] ────────────┤
    │                                             │
    └── [userId?: string] ────────────────────────┤
                                                  │
                                                  ▼
                                    ExperimentDetailModal
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            Variants Tab            Promotion Tab         Performance Tab
                    │                      │                      │
                    │                      ├─── Check Eligibility ───► API
                    │                      │     GET /api/ab-testing/promotion/check
                    │                      │
                    │                      └─── Promote Action ────────► onPromote()
                    │                            (passed to parent)
                    │
                    └─── mockVariants[] ────────────────────────► Replace with real data
```

## State Management

```typescript
Internal State:
├── activeTab: string
│   └── Controls which tab is visible ("variants" | "promotion" | "performance")
│
├── eligibility: PromotionEligibility | undefined
│   └── Stores promotion eligibility check results
│       ├── eligible: boolean
│       ├── winningVariant: string | null
│       ├── confidenceLevel: number | null
│       ├── improvement: number | null
│       ├── safetyChecks: SafetyCheck[]
│       ├── recommendation: "promote" | "wait" | "manual_review" | "not_ready"
│       └── reason: string
│
├── checkingEligibility: boolean
│   └── Loading state for eligibility API call
│
└── promotionLoading: boolean
    └── Loading state for promotion action
```

## Computed Values

```typescript
Derived from props:
├── isActive = experiment.status === "active"
├── hasWinner = !!experiment.winner
└── canPromote = isActive && hasWinner && (experiment.significance || 0) >= 95
```

## API Interactions

### 1. Check Promotion Eligibility
```
Trigger: User clicks "Check Promotion Eligibility" button
Flow:
    handleCheckEligibility()
        ├── Set checkingEligibility = true
        ├── Fetch GET /api/ab-testing/promotion/check
        │   └── Query params: experimentName, userId (optional)
        ├── Parse response → setEligibility()
        └── Set checkingEligibility = false
```

### 2. Promote Winner
```
Trigger: User clicks "Promote Winner" button
Flow:
    handlePromote()
        ├── Set promotionLoading = true
        ├── Call onPromote(experimentName)
        │   └── Parent handles actual promotion API call
        ├── Close modal on success
        └── Set promotionLoading = false
```

## Styling System

### Brand Colors
- Primary: `#ff6a1a` (orange)
- Used for:
  - Promote button background
  - Conversion rate values
  - Active tab indicator
  - Winner badges

### Status Colors
- Green: Active experiments, winners, high confidence (≥95%)
- Yellow: Medium confidence (80-94%), warnings
- Red: Critical issues, errors
- Blue: Info messages
- Gray: Inactive experiments, secondary text

### Responsive Breakpoints
- Mobile: Full width buttons, stacked footer
- Desktop: Side-by-side footer buttons, wider modal
- Max width: 4xl (896px)
- Max height: 90vh with overflow scroll

## Performance Considerations

### Loading States
1. Modal closed → No render overhead
2. Modal open → All tabs pre-rendered (Tabs component behavior)
3. Eligibility check → Loading skeleton in PromotionStatus
4. Promotion action → Button disabled with loading text

### Data Fetching
- Eligibility: On-demand (user clicks button)
- No auto-refresh (prevents unnecessary API calls)
- AbortController recommended for cleanup (not implemented yet)

### Render Optimization
- Tabs use native Radix UI (efficient tab switching)
- No virtualization needed (small dataset)
- Mock data regenerated on each render (consider memoization)

## Accessibility

- Dialog: Keyboard navigation (ESC to close)
- Tabs: Arrow key navigation
- Buttons: Focus visible rings
- Screen reader: Semantic HTML, ARIA labels from Radix
- Color contrast: WCAG AA compliant

## Error Handling

### Current Implementation
```typescript
try {
  const response = await fetch(...);
  const data = await response.json();
  if (data.success) {
    // Happy path
  }
} catch (error) {
  console.error(...);
  // Silent failure (logs only)
}
```

### Recommendations for Production
- Add toast notifications for errors
- Display error messages in UI
- Implement retry mechanisms
- Add error boundaries
- Log to monitoring service

## Testing Strategy

### Unit Tests
- Component renders with null experiment
- Component renders with valid experiment
- Tab switching updates activeTab state
- Buttons disabled during loading
- Close button calls onOpenChange
- Promote button calls onPromote with experiment name

### Integration Tests
- Eligibility check API call
- Success response updates UI
- Error response shows error message
- Promotion workflow end-to-end

### E2E Tests
- Open modal from dashboard
- Navigate between tabs
- Check eligibility
- Promote winner
- Close modal

## Future Enhancements

1. **Real Variant Data**
   - Extend UIExperiment interface
   - Remove mock data
   - Add loading state for variant fetch

2. **Charts in Performance Tab**
   - Time-series latency graph
   - Error rate trends
   - Traffic distribution visualization

3. **Export Functionality**
   - Export experiment results to CSV/PDF
   - Share experiment report link

4. **Historical Data**
   - Show experiment timeline
   - Previous promotion attempts
   - Rollback history

5. **Advanced Filters**
   - Filter variants by performance
   - Sort by different metrics
   - Compare specific date ranges

## Component Size
- Lines: 319
- Size: 11KB
- Dependencies: 9 UI components + 2 monitoring components
- Icons: 3 (Lucide React)

## Maintenance Notes

### When to Update
- UIExperiment interface changes in types/monitoring.ts
- New promotion eligibility criteria added
- Additional metrics needed in performance tab
- Brand color changes

### Breaking Changes to Avoid
- Changing prop interface without migration guide
- Removing existing tabs (users may have bookmarked tab URLs)
- Changing API endpoint paths without deprecation

### Version Compatibility
- React: 18.x+
- Radix UI: Latest
- Tailwind CSS: 3.x
- Next.js: 14.x+
