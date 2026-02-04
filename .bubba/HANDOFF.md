# Agent Handoff Instructions

> For: Any agent picking up this work
> Priority: HIGH
> Estimated Effort: 40-50 hours total

---

## TL;DR - Start Here

The sierra-fred-carey project is an A/B testing and AI monitoring platform. The monitoring dashboard and insights dashboard are 80% complete. **There's a critical build error** (GSAP Draggable TypeScript casing issue) that must be fixed before any deployment. After that, Phase 2 UI enhancements need to be completed: LiveMetricsPanel, PerformanceCharts, AlertConfig, and polishing.

---

## Immediate Next Actions

1. **FIX BUILD ERROR** - GSAP Draggable import casing issue in `app/interactive/page.tsx:6`
2. **Verify build passes** - `npm run build`
3. **Continue Phase 2 UI** - Start with LiveMetricsPanel component

---

## Context You Need

### What We're Building
A comprehensive A/B testing and AI monitoring platform with:
- Real-time experiment monitoring
- AI insights extraction and visualization
- Statistical significance detection
- Alert management and notifications

### Why It Matters
This enables data-driven AI optimization with automatic experiment promotion and real-time visibility into AI performance.

### Key Decisions Made
- Using Recharts for all visualizations
- shadcn/ui components for consistent design
- Real API integration (no mock data)
- 30-second auto-refresh on dashboards
- Next.js 16 with React 19

---

## Files to Focus On

| File | Purpose | Priority |
|------|---------|----------|
| `app/interactive/page.tsx` | Has GSAP import error | CRITICAL |
| `components/gsap/GSAPProvider.tsx` | Also has GSAP import | CRITICAL |
| `app/dashboard/monitoring/page.tsx` | Monitoring dashboard | HIGH |
| `components/monitoring/` | Monitoring components | HIGH |
| `app/dashboard/insights/page.tsx` | Insights dashboard | MEDIUM |

---

## Commands to Run First

```bash
# 1. Check build status (will fail currently)
npm run build

# 2. After fixing GSAP error, verify
npm run build

# 3. Start dev server
npm run dev
```

---

## Gotchas & Warnings

1. **GSAP Draggable Casing** - The import `gsap/Draggable` conflicts with `gsap/types/draggable.d.ts` on case-sensitive systems. Fix by using consistent casing or checking node_modules.

2. **Next.js 16** - Uses new features like Turbopack. Some patterns may differ from Next.js 14/15.

3. **React 19** - Uses the latest React. Some libraries may not be fully compatible.

---

## Who to Spawn

For this work, you'll likely need:

| Agent | Task | Why |
|-------|------|-----|
| Diana-Debugger | Fix GSAP error | TypeScript/build expertise |
| Fiona-Frontend | Phase 2 UI components | UI/React expertise |
| Adam-API | New API endpoints | Backend for timeseries, health, etc. |
| Tyler-TypeScript | Type safety, SystemHealth widget | TS expertise |

---

## Success Criteria

This phase is complete when:

- [ ] Build passes with no errors
- [ ] All Phase 2 UI components implemented
- [ ] Dashboard has real-time metrics with charts
- [ ] Alert configuration panel works
- [ ] Mobile responsive
- [ ] Deployed to production

---

## If You Get Stuck

1. Check `.bubba/BLOCKERS.md` for known issues
2. Review `.bubba/LOG.md` for context
3. Check `PHASE2_UI_PREP_REPORT.md` for detailed UI specs
4. Ask Bubba to re-analyze: "Bubba, what's the status?"

---

*Last handoff by: Bubba-Orchestrator at 2025-12-28T22:30:00Z*
