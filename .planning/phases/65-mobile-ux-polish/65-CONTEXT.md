# Phase 65: Mobile / UX Polish - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

PWA refinements with Serwist caching for offline access, smooth framer-motion animations on page transitions and dashboard interactions, and WCAG 2.1 AA compliance across all core pages. Push notification reliability improvements.

This phase does NOT add new features — it polishes the existing experience.

</domain>

<decisions>
## Implementation Decisions

### Behavior — Offline Experience
- Cached dashboard snapshot: when offline, founders see a read-only view of their last-loaded dashboard data (next steps, snapshot card, readiness scores)
- FRED chat disabled when offline — but founder can still review their current status and action items
- Cache freshness: update cache on every visit while online (no background sync needed)
- The offline experience should emphasize "what to work on next" — founders should be able to open the app offline and know what their next steps are to stay on track with their startup
- Static offline fallback page (from Phase 22) remains as the deepest fallback if no cached data exists

### UX — Animations
- Claude's discretion on animation style, duration, easing
- Key constraint: animations must respect `prefers-reduced-motion`
- Dashboard should feel responsive and snappy, not slow/cinematic

### Claude's Discretion
- Push notification UX: retry behavior, denied-permission messaging, iOS install nudge — Claude decides the approach
- Animation specifics: transition duration, easing curves, which elements animate
- Loading skeleton design during cache hydration
- Exact WCAG remediation priorities (which violations to fix first)

</decisions>

<specifics>
## Specific Ideas

- Offline view should center on "what do I need to do next to stay on track with my startup" — the founder's action items and next steps are the most valuable offline content
- The cached snapshot should feel like a real app experience, not a degraded fallback

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 65-mobile-ux-polish*
*Context gathered: 2026-02-23*
