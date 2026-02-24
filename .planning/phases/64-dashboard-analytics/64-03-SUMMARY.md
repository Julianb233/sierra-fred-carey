# 64-03 Summary: Export + Funnel Chart

## What was built
- `components/dashboard/dashboard-export-menu.tsx` — DropdownMenu with CSV (client-side via CSVGenerator) and PDF (server-side) export options
- `app/api/dashboard/export/route.ts` — Server-side PDF generation using @react-pdf/renderer with React.createElement pattern
- `components/dashboard/funnel-chart.tsx` — 5-step user journey funnel (horizontal BarChart) showing completion status
- Modified `app/dashboard/analytics/page.tsx` — Added export menu in header and funnel chart at bottom

## Key decisions
- CSV uses existing CSVGenerator, PDF uses existing @react-pdf/renderer (no new packages)
- PDF limited to 90 days of data to prevent timeout
- Funnel steps: Signed Up > First Chat > First Check-In > Next Step Completed > Readiness Review
- Funnel built from Supabase activity data (not PostHog) per research recommendation
- Export buttons disable when no data or during export
