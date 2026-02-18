# Source Code Review - Sahara UX Audit

## 1. Complete Route Inventory

### Frontend Pages (app/**/page.tsx) - 90 total

#### Public Pages (no auth required)
| Route | File |
|-------|------|
| `/` | `app/page.tsx` |
| `/about` | `app/about/page.tsx` |
| `/blog` | `app/blog/page.tsx` |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` |
| `/contact` | `app/contact/page.tsx` |
| `/features` | `app/features/page.tsx` |
| `/forgot-password` | `app/forgot-password/page.tsx` |
| `/get-started` | `app/get-started/page.tsx` |
| `/install` | `app/install/page.tsx` |
| `/links` | `app/links/page.tsx` |
| `/login` | `app/login/page.tsx` |
| `/offline` | `app/offline/page.tsx` |
| `/pricing` | `app/pricing/page.tsx` |
| `/privacy` | `app/privacy/page.tsx` |
| `/product` | `app/product/page.tsx` |
| `/reset-password` | `app/reset-password/page.tsx` |
| `/shared/[token]` | `app/shared/[token]/page.tsx` |
| `/signup` | `app/signup/page.tsx` |
| `/support` | `app/support/page.tsx` |
| `/terms` | `app/terms/page.tsx` |
| `/waitlist` | `app/waitlist/page.tsx` |
| `/tools/investor-readiness` | `app/tools/investor-readiness/page.tsx` |

#### Demo Pages (no auth guard in middleware)
| Route | File |
|-------|------|
| `/demo/boardy` | `app/demo/boardy/page.tsx` |
| `/demo/investor-lens` | `app/demo/investor-lens/page.tsx` |
| `/demo/pitch-deck` | `app/demo/pitch-deck/page.tsx` |
| `/demo/reality-lens` | `app/demo/reality-lens/page.tsx` |
| `/demo/virtual-team` | `app/demo/virtual-team/page.tsx` |

#### Protected: Dashboard Pages (auth via middleware + client-side check in layout)
| Route | File | In Sidebar Nav? |
|-------|------|-----------------|
| `/dashboard` | `app/dashboard/page.tsx` | YES (Home) |
| `/dashboard/agents` | `app/dashboard/agents/page.tsx` | NO |
| `/dashboard/ai-insights` | `app/dashboard/ai-insights/page.tsx` | NO (redirects to /dashboard/insights) |
| `/dashboard/boardy` | `app/dashboard/boardy/page.tsx` | NO |
| `/dashboard/coaching` | `app/dashboard/coaching/page.tsx` | NO |
| `/dashboard/coaching/history` | `app/dashboard/coaching/history/page.tsx` | NO |
| `/dashboard/communities` | `app/dashboard/communities/page.tsx` | YES (Community) |
| `/dashboard/communities/create` | `app/dashboard/communities/create/page.tsx` | NO (subpage) |
| `/dashboard/communities/[slug]` | `app/dashboard/communities/[slug]/page.tsx` | NO (subpage) |
| `/dashboard/communities/[slug]/members` | `app/dashboard/communities/[slug]/members/page.tsx` | NO (subpage) |
| `/dashboard/documents` | `app/dashboard/documents/page.tsx` | YES (Documents) |
| `/dashboard/history` | `app/dashboard/history/page.tsx` | NO |
| `/dashboard/inbox` | `app/dashboard/inbox/page.tsx` | NO |
| `/dashboard/insights` | `app/dashboard/insights/page.tsx` | NO |
| `/dashboard/investor-evaluation` | `app/dashboard/investor-evaluation/page.tsx` | NO |
| `/dashboard/investor-lens` | `app/dashboard/investor-lens/page.tsx` | CONDITIONAL (Pro+ and non-early stage) |
| `/dashboard/investor-readiness` | `app/dashboard/investor-readiness/page.tsx` | NO |
| `/dashboard/investor-targeting` | `app/dashboard/investor-targeting/page.tsx` | NO |
| `/dashboard/investor-targeting/matches` | `app/dashboard/investor-targeting/matches/page.tsx` | NO |
| `/dashboard/investor-targeting/outreach` | `app/dashboard/investor-targeting/outreach/page.tsx` | NO |
| `/dashboard/investor-targeting/pipeline` | `app/dashboard/investor-targeting/pipeline/page.tsx` | NO |
| `/dashboard/invitations` | `app/dashboard/invitations/page.tsx` | NO |
| `/dashboard/journey` | `app/dashboard/journey/page.tsx` | NO |
| `/dashboard/memory` | `app/dashboard/memory/page.tsx` | NO |
| `/dashboard/monitoring` | `app/dashboard/monitoring/page.tsx` | NO |
| `/dashboard/next-steps` | `app/dashboard/next-steps/page.tsx` | YES (Next Steps) |
| `/dashboard/notifications` | `app/dashboard/notifications/page.tsx` | NO |
| `/dashboard/pitch-deck` | `app/dashboard/pitch-deck/page.tsx` | NO |
| `/dashboard/positioning` | `app/dashboard/positioning/page.tsx` | CONDITIONAL (Pro+) |
| `/dashboard/profile/snapshot` | `app/dashboard/profile/snapshot/page.tsx` | NO |
| `/dashboard/readiness` | `app/dashboard/readiness/page.tsx` | YES (Readiness) |
| `/dashboard/reality-lens` | `app/dashboard/reality-lens/page.tsx` | NO |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | YES (Settings) |
| `/dashboard/sharing` | `app/dashboard/sharing/page.tsx` | NO |
| `/dashboard/sms` | `app/dashboard/sms/page.tsx` | NO |
| `/dashboard/startup-process` | `app/dashboard/startup-process/page.tsx` | NO |
| `/dashboard/strategy` | `app/dashboard/strategy/page.tsx` | NO |
| `/dashboard/strategy/reframing` | `app/dashboard/strategy/reframing/page.tsx` | NO |
| `/dashboard/wellbeing` | `app/dashboard/wellbeing/page.tsx` | NO |

#### Protected: Other Auth-Required Pages
| Route | File | Auth Guard |
|-------|------|-----------|
| `/chat` | `app/chat/page.tsx` | middleware |
| `/agents` | `app/agents/page.tsx` | middleware |
| `/agents/[agentId]` | `app/agents/[agentId]/page.tsx` | middleware |
| `/check-ins` | `app/check-ins/page.tsx` | middleware |
| `/check-ins/configure` | `app/check-ins/configure/page.tsx` | middleware |
| `/check-ins/[checkInId]` | `app/check-ins/[checkInId]/page.tsx` | middleware |
| `/documents` | `app/documents/page.tsx` | middleware |
| `/documents/new` | `app/documents/new/page.tsx` | middleware |
| `/documents/[docId]` | `app/documents/[docId]/page.tsx` | middleware |
| `/interactive` | `app/interactive/page.tsx` | middleware |
| `/onboarding` | `app/onboarding/page.tsx` | middleware |
| `/video` | `app/video/page.tsx` | middleware |
| `/video/[room]` | `app/video/[room]/page.tsx` | middleware |

#### Admin Pages (auth via admin layout isAdminSession)
| Route | File | In Admin Nav? |
|-------|------|---------------|
| `/admin` | `app/admin/page.tsx` | YES (Dashboard) |
| `/admin/login` | `app/admin/login/page.tsx` | N/A (login page) |
| `/admin/prompts` | `app/admin/prompts/page.tsx` | YES |
| `/admin/config` | `app/admin/config/page.tsx` | YES |
| `/admin/ab-tests` | `app/admin/ab-tests/page.tsx` | YES |
| `/admin/training` | `app/admin/training/page.tsx` | YES |
| `/admin/training/agents` | `app/admin/training/agents/page.tsx` | NO (subpage of training) |
| `/admin/training/communication` | `app/admin/training/communication/page.tsx` | NO (subpage) |
| `/admin/training/frameworks` | `app/admin/training/frameworks/page.tsx` | NO (subpage) |
| `/admin/training/identity` | `app/admin/training/identity/page.tsx` | NO (subpage) |
| `/admin/voice-agent` | `app/admin/voice-agent/page.tsx` | YES |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | YES |

---

## 2. Hidden/Orphaned Features (NOT in any nav)

### Dashboard pages with NO sidebar link (22 pages):

1. `/dashboard/agents` - Virtual team/agents management
2. `/dashboard/boardy` - Boardy networking integration
3. `/dashboard/coaching` - Coaching sessions
4. `/dashboard/coaching/history` - Coaching history
5. `/dashboard/history` - Chat/session history
6. `/dashboard/inbox` - Inbox/messages
7. `/dashboard/insights` - AI Insights page (full functional page, ai-insights redirects here)
8. `/dashboard/investor-evaluation` - Investor evaluation tool
9. `/dashboard/investor-readiness` - Investor readiness assessment
10. `/dashboard/investor-targeting` - Investor targeting + 3 subpages (matches, outreach, pipeline)
11. `/dashboard/invitations` - Team invitations
12. `/dashboard/journey` - Founder journey timeline
13. `/dashboard/memory` - Fred memory about the user
14. `/dashboard/monitoring` - System monitoring
15. `/dashboard/notifications` - Notification center
16. `/dashboard/pitch-deck` - Pitch deck review
17. `/dashboard/profile/snapshot` - Profile snapshot
18. `/dashboard/reality-lens` - Reality lens analysis
19. `/dashboard/sharing` - Sharing management
20. `/dashboard/sms` - SMS preferences
21. `/dashboard/startup-process` - Startup process guide
22. `/dashboard/strategy` - Strategy + reframing subpage
23. `/dashboard/wellbeing` - Founder wellbeing

### Summary:
The sidebar has **7 core + 2 conditional = max 9 links**. There are **38 dashboard pages**. Approximately **23 pages are unreachable** from the sidebar navigation.

---

## 3. Nav Completeness Check

### Dashboard Sidebar (`app/dashboard/layout.tsx` lines 47-102)

**Core items (always visible):**
- Home -> `/dashboard`
- Chat with Fred -> `/chat`
- Next Steps -> `/dashboard/next-steps`
- Readiness -> `/dashboard/readiness`
- Documents -> `/dashboard/documents`
- Community -> `/dashboard/communities`
- Settings -> `/dashboard/settings`

**Conditional items:**
- Positioning -> `/dashboard/positioning` (Pro+ tier)
- Investor Lens -> `/dashboard/investor-lens` (Pro+ AND non-early stage)

### Mobile Bottom Nav (`components/mobile/mobile-bottom-nav.tsx`)
Only 5 items: Home, Chat, Next, Progress (Readiness), Profile (Settings). Very limited.

### Admin Nav (`app/admin/layout.tsx` lines 49-91)
7 links: Dashboard, Prompts, Config, A/B Tests, Training, Voice Agent, Analytics.
**Admin nav is complete** - all top-level admin pages have entries.

---

## 4. AI Insights Route

- `app/dashboard/ai-insights/page.tsx` (line 9): **Redirects** to `/dashboard/insights`
- `app/dashboard/insights/page.tsx`: Full functional page with tabs, charts, trend analytics
- **Neither route appears in the sidebar nav** -- users cannot discover AI Insights through navigation
- APIs used: `/api/insights/top-insights`, `/api/insights/trends`, `/api/insights/analytics`, `/api/insights/ab-tests`

---

## 5. Auth Guard Coverage

### Middleware protected paths (`lib/auth/middleware-utils.ts` line 34):
```
/dashboard, /agents, /documents, /settings, /profile, /chat, /check-ins, /video, /onboarding, /interactive
```

### Auth gaps: NONE FOUND (verified by backend-validator)

| Route | Status | Detail |
|-------|--------|--------|
| `/demo/*` (5 pages) | No auth guard | Intentional -- public demos |
| `/tools/investor-readiness` | No auth guard | Intentional -- public tool |
| `/api/setup-db` | SAFE | Dual protection: `NODE_ENV === "production"` returns 403 + `isAdminRequest()` check |
| `/api/cron/*` | SAFE | All 3 routes verify `Authorization: Bearer {CRON_SECRET}` via timing-safe HMAC |
| `/api/fred/*` | SAFE | All guarded via `requireAuth()` or `checkTierForRequest()` |
| `/api/investors/*` | SAFE | All guarded via `checkTierForRequest(request, UserTier.STUDIO)` |
| `/api/documents/*` | SAFE | All guarded via `requireAuth()` + `checkTierForRequest()` |
| `/api/inbox` | SAFE | Guarded via `requireAuth()` |
| `/api/journey/*` | SAFE | All guarded via `requireAuth()` |

Middleware protected paths cover page routes (redirect to /login). API routes correctly handle their own auth at handler level. No gaps.

### Admin auth:
Admin routes protected by `isAdminSession()` in `app/admin/layout.tsx` (server-side). Sufficient.

---

## 6. Feature Flags / Disabled Code

No `TODO`, `FIXME`, `DISABLED`, `coming soon`, or `feature flag` patterns found in app source.

Conditional visibility uses tier-based logic (not feature flags):
- `showPositioning`: `tier >= UserTier.PRO`
- `showInvestorLens`: `!isEarlyStage && tier >= UserTier.PRO`

---

## 7. Recommended Fixes

### HIGH PRIORITY - Add Missing Sidebar Nav Items

File: `app/dashboard/layout.tsx` lines 47-102

These pages exist and are functional but unreachable from navigation:

| Page | Suggested Nav Label | Priority |
|------|-------------------|----------|
| `/dashboard/insights` | AI Insights | HIGH |
| `/dashboard/strategy` | Strategy | HIGH |
| `/dashboard/strategy/reframing` | (sub-link from strategy) | HIGH |
| `/dashboard/journey` | Journey | HIGH |
| `/dashboard/coaching` | Coaching | HIGH |
| `/dashboard/wellbeing` | Wellbeing | HIGH |
| `/dashboard/agents` | Virtual Team | HIGH |
| `/dashboard/boardy` | Boardy | MEDIUM |
| `/dashboard/inbox` | Inbox | MEDIUM |
| `/dashboard/history` | History | MEDIUM |
| `/dashboard/notifications` | Notifications | MEDIUM |
| `/dashboard/memory` | Memory | MEDIUM |
| `/dashboard/investor-readiness` | Investor Readiness | MEDIUM (conditional) |
| `/dashboard/investor-targeting` | Investor Targeting | MEDIUM (conditional) |
| `/dashboard/investor-evaluation` | Investor Evaluation | MEDIUM (conditional) |
| `/dashboard/pitch-deck` | Pitch Deck | MEDIUM (conditional) |
| `/dashboard/reality-lens` | Reality Lens | MEDIUM (conditional) |
| `/dashboard/invitations` | Invitations | LOW |
| `/dashboard/sharing` | Sharing | LOW |
| `/dashboard/sms` | SMS | LOW |
| `/dashboard/monitoring` | Monitoring | LOW |
| `/dashboard/startup-process` | Startup Process | LOW |
| `/dashboard/profile/snapshot` | Profile Snapshot | LOW |

### Auth - NO ISSUES (verified by backend-validator)
All flagged API routes confirmed protected at handler level. No fixes needed.

### LOW PRIORITY - Navigation UX

| Issue | Fix |
|-------|-----|
| Mobile bottom nav only 5 items | Add "More" menu for additional features |
| Nav should be grouped | Use sections: Core, Investor Tools, Strategy, Account |
