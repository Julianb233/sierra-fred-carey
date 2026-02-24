# Phase 64: Dashboard & Analytics Enhancement - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Richer founder metrics with historical trends, engagement scoring, data export, and PostHog funnel visualization. This phase enhances the existing dashboard with analytics capabilities — it does not redesign the dashboard layout (Phase 40) or add new features.

</domain>

<decisions>
## Implementation Decisions

### UI
- Compact sparklines on the analytics page with click-to-expand drill-in for full charts
- Four time range options: 7d / 30d / 90d / All time (default: 30d)
- Four sparkline metrics:
  1. Next Steps completion rate
  2. Check-in streaks & wellbeing trends
  3. Readiness scores over time (IRS + Positioning)
  4. Founder's next identified step (prominently displayed)
- FRED conversations metric intentionally excluded from sparklines (feeds momentum but isn't a standalone chart)

### Behavior — Engagement / Momentum
- Momentum indicator, NOT a numeric score — trend-focused, not gamified
- Displays as trend arrow + factual text summary (e.g., "↗️ Trending up — 3 check-ins, 5 steps completed this week")
- Four activities feed momentum:
  1. FRED conversations (meaningful sessions, not just opening chat)
  2. Completing next steps (marking action items done)
  3. Weekly check-ins (consistency of submissions)
  4. Readiness progress (IRS/Positioning score movement)
- Visible in two places:
  - Home page: summary trend arrow + one-liner
  - Analytics page: full breakdown by activity type
- FRED references momentum during conversations naturally ("You've been on a roll this week")
- No judgmental language — factual and encouraging

### Claude's Discretion
- Data export format and scope (CSV, PDF, date ranges, tier gating)
- PostHog funnel configuration and visualization approach
- Exact chart library choice (recharts, chart.js, etc.)
- Loading states and error handling for analytics data
- Analytics page layout and information hierarchy

</decisions>

<specifics>
## Specific Ideas

- Momentum should feel like a coach's observation, not a report card
- Trend arrows are honest — if momentum is dropping, show it plainly without sugarcoating (consistent with FRED's mentor persona)
- The "next identified step" display should link directly to the Next Steps Hub for action

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 64-dashboard-analytics*
*Context gathered: 2026-02-23*
