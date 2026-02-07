---
phase: 22-pwa-mobile-polish
plan: 02
status: done
completed: 2026-02-07
files_modified:
  - app/pricing/page.tsx
  - components/monitoring/charts/PerformanceCharts.tsx
  - components/admin/voice-agent/KnowledgeBaseEditor.tsx
  - components/monitoring/DashboardFilters.tsx
  - app/dashboard/monitoring/page.tsx
  - components/diagnostic/InvestorEvaluation.tsx
  - app/dashboard/boardy/page.tsx
  - components/positioning/positioning-assessment.tsx
  - components/investor-lens/investor-lens-evaluation.tsx
  - app/admin/voice-agent/page.tsx
  - app/dashboard/insights/page-enhanced.tsx
  - app/globals.css
---

# Phase 22-02 Summary: Mobile Responsive Fixes and Touch Targets

## What was done

### Task 1: Pricing table mobile layout and fixed-width responsive fixes

1. **app/pricing/page.tsx** -- Added dual-layout approach for comparison table:
   - Mobile (below md): Card-based layout with `md:hidden` wrapper, each feature displayed as a card with 3-column grid (Free/$99/$249) using same CheckIcon/Cross2Icon styling
   - Desktop (md+): Original table preserved inside `hidden md:block` wrapper
   - comparisonFeatures data array left unchanged

2. **components/monitoring/charts/PerformanceCharts.tsx** -- SelectTrigger changed from `w-[180px]` to `w-full sm:w-[180px]` (time range dropdown)

3. **components/admin/voice-agent/KnowledgeBaseEditor.tsx** -- SelectTrigger changed from `w-[140px]` to `w-full sm:w-[140px]` (filter by type dropdown)

4. **components/admin/voice-agent/BusinessHoursEditor.tsx** -- No change needed. The `min-w-[140px]` is inside a `flex-col sm:flex-row` parent, so on mobile the label container is on its own line and does not cause overflow.

5. **components/monitoring/DashboardFilters.tsx** -- PopoverContent changed from `w-[280px]` to `w-[calc(100vw-2rem)] sm:w-[280px]` (experiment selector popover)

### Task 2: TabsList scrollable wrappers (8 files)

Applied the reference pattern from `app/dashboard/insights/page.tsx` to all 8 files:

```tsx
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-N lg:w-auto lg:inline-grid">
    <TabsTrigger className="text-xs sm:text-sm whitespace-nowrap">...</TabsTrigger>
  </TabsList>
</div>
```

Files updated:
1. app/dashboard/monitoring/page.tsx (grid-cols-4)
2. components/diagnostic/InvestorEvaluation.tsx (grid-cols-4)
3. components/monitoring/charts/PerformanceCharts.tsx (grid-cols-4)
4. app/dashboard/boardy/page.tsx (grid-cols-5)
5. components/positioning/positioning-assessment.tsx (grid-cols-4)
6. components/investor-lens/investor-lens-evaluation.tsx (grid-cols-5)
7. app/admin/voice-agent/page.tsx (grid-cols-5)
8. app/dashboard/insights/page-enhanced.tsx (grid-cols-4)

### Task 3: Touch target CSS audit

Extended the global touch target rule in `app/globals.css` to cover all interactive form elements:
- Added: `input[type="text"]`, `input[type="email"]`, `input[type="password"]`, `input[type="search"]`, `input[type="tel"]`, `input[type="url"]`, `input[type="number"]`, `input[type="date"]`, `textarea`, `select`, `[role="checkbox"]`, `[role="radio"]`, `[role="switch"]`, `[role="tab"]`
- All now have `min-height: 44px` for WCAG touch target compliance

## Verification results

- `npx tsc --noEmit`: 0 errors
- All 8 TabsList files confirmed with `overflow-x-auto`
- Pricing page confirmed with `md:hidden` and `hidden md:block`
- globals.css confirmed with extended touch target selectors including `role="tab"` and `role="checkbox"`
- Responsive SelectTrigger widths confirmed in PerformanceCharts and KnowledgeBaseEditor
- Responsive PopoverContent width confirmed in DashboardFilters

## Files NOT modified (as planned)

- `app/dashboard/insights/page.tsx` -- reference implementation, already correct
- `components/admin/voice-agent/BusinessHoursEditor.tsx` -- min-w-[140px] acceptable in flex-col context
- Low-priority files (chat, onboarding, PhoneMockup, navbar) -- decorative/contained fixed widths
