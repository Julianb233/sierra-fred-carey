# Source Code Review — Sahara UX Audit

**Reviewer:** Source Code Reviewer Agent
**Date:** 2026-02-11
**Scope:** All routes, API endpoints, nav components, dead code, unfinished features

---

## 1. All Routes (with Protection Level)

### Public Pages (no auth required)
| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Landing page |
| `/about` | `app/about/page.tsx` | About page |
| `/pricing` | `app/pricing/page.tsx` | Pricing page |
| `/features` | `app/features/page.tsx` | Features page - has "Coming Soon" on Boardy |
| `/product` | `app/product/page.tsx` | Product demo page |
| `/blog` | `app/blog/page.tsx` | Blog listing |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | Blog post |
| `/login` | `app/login/page.tsx` | Login page |
| `/signup` | `app/signup/page.tsx` | Signup page |
| `/get-started` | `app/get-started/page.tsx` | Registration flow |
| `/waitlist` | `app/waitlist/page.tsx` | Waitlist signup |
| `/contact` | `app/contact/page.tsx` | Contact form |
| `/support` | `app/support/page.tsx` | Support page |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms of service |
| `/links` | `app/links/page.tsx` | Linktree-style page |
| `/install` | `app/install/page.tsx` | PWA install page |
| `/offline` | `app/offline/page.tsx` | PWA offline fallback |
| `/interactive` | `app/interactive/page.tsx` | Interactive product demo (GSAP) |
| `/onboarding` | `app/onboarding/page.tsx` | Onboarding flow |
| `/shared/[token]` | `app/shared/[token]/page.tsx` | Public shared content viewer |

### Demo Pages (public, no auth)
| Route | File | Notes |
|-------|------|-------|
| `/demo/reality-lens` | `app/demo/reality-lens/page.tsx` | Demo Reality Lens |
| `/demo/investor-lens` | `app/demo/investor-lens/page.tsx` | Demo Investor Lens |
| `/demo/pitch-deck` | `app/demo/pitch-deck/page.tsx` | Demo Pitch Deck |
| `/demo/virtual-team` | `app/demo/virtual-team/page.tsx` | Demo Virtual Team |
| `/demo/boardy` | `app/demo/boardy/page.tsx` | Demo Boardy |

### Protected Pages (auth required -- `/dashboard`, `/agents`, `/documents`, `/chat`)
| Route | File | Tier | In Sidebar Nav? |
|-------|------|------|-----------------|
| `/dashboard` | `app/dashboard/page.tsx` | Free | Yes (Overview) |
| `/dashboard/reality-lens` | `app/dashboard/reality-lens/page.tsx` | Free | Yes |
| `/dashboard/journey` | `app/dashboard/journey/page.tsx` | Free | Yes |
| `/dashboard/startup-process` | `app/dashboard/startup-process/page.tsx` | Free | Yes (layout.tsx only) |
| `/dashboard/history` | `app/dashboard/history/page.tsx` | Free | Yes |
| `/dashboard/insights` | `app/dashboard/insights/page.tsx` | Free | Yes |
| `/dashboard/monitoring` | `app/dashboard/monitoring/page.tsx` | Free | Yes |
| `/dashboard/positioning` | `app/dashboard/positioning/page.tsx` | Pro | Yes |
| `/dashboard/investor-lens` | `app/dashboard/investor-lens/page.tsx` | Pro | Yes |
| `/dashboard/investor-readiness` | `app/dashboard/investor-readiness/page.tsx` | Pro | Yes |
| `/dashboard/investor-evaluation` | `app/dashboard/investor-evaluation/page.tsx` | Pro | Yes (layout.tsx only) |
| `/dashboard/pitch-deck` | `app/dashboard/pitch-deck/page.tsx` | Pro | Yes |
| `/dashboard/strategy` | `app/dashboard/strategy/page.tsx` | Pro | Yes |
| `/dashboard/strategy/reframing` | `app/dashboard/strategy/reframing/page.tsx` | Pro | **NO** |
| `/dashboard/sms` | `app/dashboard/sms/page.tsx` | Studio | Yes |
| `/dashboard/agents` | `app/dashboard/agents/page.tsx` | Studio | Yes |
| `/dashboard/boardy` | `app/dashboard/boardy/page.tsx` | Studio | Yes |
| `/dashboard/communities` | `app/dashboard/communities/page.tsx` | Free | Yes |
| `/dashboard/communities/create` | `app/dashboard/communities/create/page.tsx` | Free | No (sub-page) |
| `/dashboard/communities/[slug]` | `app/dashboard/communities/[slug]/page.tsx` | Free | No (sub-page) |
| `/dashboard/communities/[slug]/members` | `app/dashboard/communities/[slug]/members/page.tsx` | Free | No (sub-page) |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Free | Yes |
| `/dashboard/wellbeing` | `app/dashboard/wellbeing/page.tsx` | Free | **NO** |
| `/dashboard/inbox` | `app/dashboard/inbox/page.tsx` | Free | **NO** |
| `/dashboard/coaching` | `app/dashboard/coaching/page.tsx` | Studio | **NO** |
| `/dashboard/coaching/history` | `app/dashboard/coaching/history/page.tsx` | Studio | **NO** |
| `/dashboard/notifications` | `app/dashboard/notifications/page.tsx` | Free | **NO** (only in orphaned dashboard-shell.tsx) |
| `/dashboard/memory` | `app/dashboard/memory/page.tsx` | Pro | **NO** |
| `/dashboard/sharing` | `app/dashboard/sharing/page.tsx` | Pro | **NO** |
| `/dashboard/invitations` | `app/dashboard/invitations/page.tsx` | Free | **NO** |
| `/dashboard/profile/snapshot` | `app/dashboard/profile/snapshot/page.tsx` | Free | **NO** |
| `/dashboard/investor-targeting` | `app/dashboard/investor-targeting/page.tsx` | Studio | **NO** |
| `/dashboard/investor-targeting/matches` | `app/dashboard/investor-targeting/matches/page.tsx` | Studio | **NO** |
| `/dashboard/investor-targeting/outreach` | `app/dashboard/investor-targeting/outreach/page.tsx` | Studio | **NO** |
| `/dashboard/investor-targeting/pipeline` | `app/dashboard/investor-targeting/pipeline/page.tsx` | Studio | **NO** |
| `/chat` | `app/chat/page.tsx` | Free | **NO** (standalone) |
| `/agents` | `app/agents/page.tsx` | Free | **NO** |
| `/agents/[agentId]` | `app/agents/[agentId]/page.tsx` | Free | **NO** |
| `/documents` | `app/documents/page.tsx` | Free | **NO** |
| `/documents/new` | `app/documents/new/page.tsx` | Free | **NO** |
| `/documents/[docId]` | `app/documents/[docId]/page.tsx` | Free | **NO** |
| `/check-ins/configure` | `app/check-ins/configure/page.tsx` | Free | **NO** |
| `/check-ins/[checkInId]` | `app/check-ins/[checkInId]/page.tsx` | Free | **NO** |
| `/video` | `app/video/page.tsx` | Free | **NO** |
| `/video/[room]` | `app/video/[room]/page.tsx` | Free | **NO** |
| `/tools/investor-readiness` | `app/tools/investor-readiness/page.tsx` | Free | **NO** |

### Admin Pages (admin session required via `isAdminSession()`)
| Route | File | In Admin Nav? |
|-------|------|---------------|
| `/admin/login` | `app/admin/login/page.tsx` | N/A (login) |
| `/admin` | `app/admin/page.tsx` | Yes (Dashboard) |
| `/admin/prompts` | `app/admin/prompts/page.tsx` | Yes |
| `/admin/config` | `app/admin/config/page.tsx` | Yes |
| `/admin/ab-tests` | `app/admin/ab-tests/page.tsx` | Yes |
| `/admin/training` | `app/admin/training/page.tsx` | Yes |
| `/admin/training/identity` | `app/admin/training/identity/page.tsx` | No (sub-page) |
| `/admin/training/communication` | `app/admin/training/communication/page.tsx` | No (sub-page) |
| `/admin/training/frameworks` | `app/admin/training/frameworks/page.tsx` | No (sub-page) |
| `/admin/training/agents` | `app/admin/training/agents/page.tsx` | No (sub-page) |
| `/admin/voice-agent` | `app/admin/voice-agent/page.tsx` | **NO** |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | **NO** |

---

## 2. All API Endpoints

### Auth
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/auth/login` | POST | `/login` page |
| `/api/auth/logout` | POST | Dashboard logout |
| `/api/auth/me` | GET | Auth context |

### FRED AI
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/fred/chat` | POST | `ChatInterface` component via `useFredChat` hook |
| `/api/fred/analyze` | POST | Reality Lens pages |
| `/api/fred/decide` | POST | Decision engine |
| `/api/fred/history` | GET | Decision History page |
| `/api/fred/investor-readiness` | POST/GET | Investor Readiness page |
| `/api/fred/pitch-review` | POST | Pitch Deck Review page |
| `/api/fred/reality-lens` | POST | Reality Lens page |
| `/api/fred/strategy` | GET/POST | Strategy Docs page |
| `/api/fred/strategy/[id]` | GET/PUT/DELETE | Strategy Doc detail |
| `/api/fred/strategy/[id]/export` | GET | Strategy PDF export |
| `/api/fred/memory` | GET/POST/DELETE | Memory Browser page |
| `/api/fred/memory/stats` | GET | Memory stats |
| `/api/fred/export` | GET | Chat export button |

### Diagnostic Engine
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/diagnostic` | POST/GET | Wired into chat internally |
| `/api/diagnostic/analyze` | POST | Diagnostic engine (internal) |
| `/api/diagnostic/events` | POST/GET | Diagnostic event tracking |
| `/api/diagnostic/introduce` | POST/GET | Framework introduction |
| `/api/diagnostic/state` | GET/PUT | Conversation state management |
| `/api/diagnostic/positioning` | POST | Positioning diagnostic |
| `/api/diagnostic/investor` | POST/GET | Investor diagnostic |

### Dashboard and Profile
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/dashboard/stats` | GET | Dashboard overview |
| `/api/dashboard/profile/snapshot` | GET/POST | Profile Snapshot page |
| `/api/dashboard/strategy/reframe` | POST | Strategy Reframing page |

### Investors
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/investors/match` | POST | Investor Targeting matches |
| `/api/investors/upload` | POST | Investor list upload |
| `/api/investors/generate-outreach` | POST | Outreach page |
| `/api/investors/pipeline` | GET/POST/PATCH | Pipeline CRM page |
| `/api/investor-lens/evaluate` | POST | Investor Lens page |
| `/api/investor-lens/deck-request` | POST | Deck request |

### Positioning
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/positioning/assess` | POST | Positioning page |
| `/api/positioning/quick-check` | POST | Positioning quick check |

### Documents
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/documents/[id]` | GET/PUT/DELETE | Document detail |
| `/api/documents/[id]/search` | POST | Document search |
| `/api/documents/uploaded/[id]` | GET | Uploaded doc access |

### Pitch Deck
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/pitch-deck/upload` | POST | Pitch Deck page |
| `/api/pitch-deck/parse` | POST | Pitch Deck parsing |

### Agents
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/agents` | GET/POST | Agents page |
| `/api/agents/[agentId]` | GET/POST | Agent detail |
| `/api/agents/tasks` | GET/POST | Agent tasks |

### Red Flags
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/red-flags` | GET/POST | RedFlagsWidget on dashboard |
| `/api/red-flags/[id]` | GET/PATCH | Individual flag management |

### Wellbeing
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/wellbeing/check-in` | GET/POST | Wellbeing page |

### Inbox
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/inbox` | GET/PATCH | Inbox page |

### SMS and Check-ins
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/check-ins` | GET/POST | Check-ins pages |
| `/api/sms/webhook` | POST | Twilio webhook (external) |
| `/api/sms/preferences` | GET/POST | SMS preferences |
| `/api/sms/verify` | POST | Phone verification |

### Boardy
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/boardy/match` | POST | Boardy page |
| `/api/boardy/callback` | POST | External callback |

### Stripe
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/stripe/checkout` | POST | Pricing / Upgrade buttons |
| `/api/stripe/portal` | POST | Settings page |
| `/api/stripe/webhook` | POST | Stripe webhook (external) |

### User
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/user/subscription` | GET | Tier context |
| `/api/user/delete` | DELETE | Account deletion |

### Sharing and Teams
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/share` | POST | Share button |
| `/api/share/[token]` | GET | Public shared view |
| `/api/team` | GET/POST | Team management |
| `/api/team/invitations` | GET | Invitations page |
| `/api/team/accept` | POST | Accept invitation |

### Communities
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/communities` | GET/POST | Communities page |
| `/api/communities/[slug]` | GET/PUT/DELETE | Community detail |
| `/api/communities/[slug]/members` | GET/POST/DELETE | Member management |
| `/api/communities/[slug]/posts` | GET/POST | Community posts |
| `/api/communities/[slug]/posts/[postId]` | GET/PUT/DELETE | Post detail |
| `/api/communities/[slug]/posts/[postId]/reactions` | POST/DELETE | Reactions |
| `/api/communities/[slug]/posts/[postId]/replies` | GET/POST | Replies |
| `/api/communities/[slug]/posts/[postId]/replies/[replyId]` | PUT/DELETE | Reply detail |

### Notifications and Push
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/notifications/settings` | GET/POST | Settings page |
| `/api/notifications/logs` | GET | Notifications page |
| `/api/notifications/config` | GET/POST | No frontend consumer (admin internal) |
| `/api/notifications/pagerduty` | POST | No frontend consumer |
| `/api/notifications/slack` | POST | No frontend consumer |
| `/api/notifications/test` | POST | No frontend consumer |
| `/api/push/subscribe` | POST | Service worker |
| `/api/push/preferences` | GET/POST | Settings page |

### Monitoring and Experiments
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/monitoring/dashboard` | GET | Monitoring page |
| `/api/monitoring/alerts` | GET/POST | Monitoring page |
| `/api/monitoring/alerts/check` | GET/POST | Cron / internal |
| `/api/monitoring/health` | GET | Health check |
| `/api/monitoring/charts` | GET | Monitoring page |
| `/api/monitoring/experiments/[name]` | GET | Monitoring detail |
| `/api/monitoring/experiments/[name]/promote` | GET/POST/DELETE | Monitoring detail |
| `/api/monitoring/experiments/[name]/history` | GET | Monitoring detail |
| `/api/monitoring/variants/[id]` | GET | Monitoring detail |
| `/api/monitoring/auto-promotion/check` | POST/GET | Cron / internal |
| `/api/experiments/auto-promote` | POST/GET | No frontend consumer (cron only) |

### Insights and Journey
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/insights/ab-tests` | GET | Insights page |
| `/api/insights/top-insights` | GET | Insights page |
| `/api/insights/analytics` | GET | Insights page |
| `/api/insights/trends` | GET | Insights page |
| `/api/journey/timeline` | GET | Journey page |
| `/api/journey/milestones` | GET/POST | Journey page |
| `/api/journey/insights` | GET | Journey page |
| `/api/journey/stats` | GET | Journey page |
| `/api/journey/references` | GET | Journey page |

### Admin
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/admin/dashboard` | GET | Admin dashboard |
| `/api/admin/logout` | POST | Admin logout |
| `/api/admin/prompts` | GET/POST | Admin prompts page |
| `/api/admin/prompts/activate` | POST | Admin prompts page |
| `/api/admin/prompts/test` | POST | Admin prompts page |
| `/api/admin/config` | GET/POST | Admin config page |
| `/api/admin/ab-tests` | GET/POST | Admin A/B tests page |
| `/api/admin/ab-tests/[id]` | GET/PUT/DELETE | Admin A/B test detail |
| `/api/admin/ab-tests/[id]/end` | POST | Admin A/B tests |
| `/api/admin/ab-tests/[id]/traffic` | PUT | Admin A/B tests |
| `/api/admin/ab-tests/[id]/promote` | POST | Admin A/B tests |
| `/api/admin/training/metrics` | GET | Admin training |
| `/api/admin/training/ratings` | GET | Admin training |
| `/api/admin/training/requests` | GET/POST | Admin training |
| `/api/admin/training/requests/[id]` | PATCH | Admin training |
| `/api/admin/voice-agent/config` | GET/POST | Admin voice-agent page |
| `/api/admin/voice-agent/escalation` | GET/POST | Admin voice-agent page |
| `/api/admin/voice-agent/knowledge` | GET/POST | Admin voice-agent page |
| `/api/admin/voice-agent/analytics` | GET | Admin voice-agent page |

### Other
| Endpoint | Methods | Frontend Consumer |
|----------|---------|-------------------|
| `/api/contact` | POST | Contact page |
| `/api/onboard` | POST | Onboarding page |
| `/api/onboard/invite` | POST | Referral invites |
| `/api/ai/rating` | POST | Chat feedback |
| `/api/setup-db` | POST | No frontend consumer (dev tool) |
| `/api/health/ai` | GET | No frontend consumer (monitoring) |

### Cron Jobs (no frontend consumer, triggered by Vercel cron)
| Endpoint | Methods | Notes |
|----------|---------|-------|
| `/api/cron/weekly-checkin` | POST | SMS weekly check-in scheduler |
| `/api/cron/weekly-digest` | POST | Email weekly digest |
| `/api/cron/re-engagement` | POST | Re-engagement emails |

---

## 3. Dead/Orphaned Code

### `app/dashboard/dashboard-shell.tsx` -- ORPHANED
- Full dashboard layout component with sidebar nav (includes Notifications nav item)
- **NOT imported anywhere** -- the actual layout uses `app/dashboard/layout.tsx`
- Has a slightly different nav item list (includes Notifications, lacks Startup Process, Investor Evaluation)
- This is dead code / leftover from a refactor

### `components/dashboard/invitations-nav-item.tsx` -- ORPHANED
- Standalone nav item component for Team Invitations with pending count badge
- Comment says: "dashboard/layout.tsx has pre-commit hooks that revert modifications"
- **Never imported or rendered anywhere** in the codebase
- The `/dashboard/invitations` page exists and works but has no nav link

### `components/dashboard/coaching-nav-item.tsx` -- ORPHANED
- Standalone nav item component for Video Coaching
- Same "pre-commit hooks" comment
- **Never imported or rendered anywhere** in the codebase
- The `/dashboard/coaching` page exists and works but has no nav link

---

## 4. Unfinished Features / Gaps

### Missing Dashboard Sidebar Nav Items (pages exist, no way for users to navigate there)
These pages have full implementations but are completely invisible to users:

1. **`/dashboard/wellbeing`** -- Founder Wellbeing check-in page. Fully built with `WellnessAssessment` component. No sidebar link.
2. **`/dashboard/inbox`** -- Inbox Ops Agent message hub. Fully built with filtering, pagination. No sidebar link.
3. **`/dashboard/coaching`** -- Video Coaching (Studio tier). Fully built with LiveKit integration. No sidebar link.
4. **`/dashboard/coaching/history`** -- Coaching session history. Fully built. No sidebar link.
5. **`/dashboard/notifications`** -- Push notification log page. Fully built with category filtering. No sidebar link (exists in orphaned dashboard-shell.tsx only).
6. **`/dashboard/memory`** -- FRED Memory Browser (Pro tier). Fully built with semantic/episodic memory viewer. No sidebar link.
7. **`/dashboard/sharing`** -- Sharing Analytics Dashboard (Pro tier). Fully built with share link management. No sidebar link.
8. **`/dashboard/invitations`** -- Team Invitations page. Fully built with accept/decline. No sidebar link.
9. **`/dashboard/profile/snapshot`** -- Founder Intake Snapshot. Fully built with enriched profile data. No sidebar link.
10. **`/dashboard/investor-targeting`** -- Investor Targeting hub (Studio tier). Fully built with CSV upload, matches, outreach, pipeline sub-pages. No sidebar link.
11. **`/dashboard/strategy/reframing`** -- Strategy Reframing (Fred's 9-step framework). Fully built. No sidebar link (accessible only if you know the URL).

### Missing Admin Nav Items
1. **`/admin/voice-agent`** -- Voice Agent admin page. Fully built with config, escalation rules, knowledge base, analytics tabs. Not in admin nav bar.
2. **`/admin/analytics`** -- Analytics dashboard with engagement metrics, funnel, feature adoption. Not in admin nav bar.

### Feature Flags / Env-Gated Features
1. **Communities** -- Gated by `COMMUNITIES_ENABLED` env var (`lib/communities/sanitize.ts`). Returns 503 if set to `false`. Currently present in sidebar nav.
2. **Web Push** -- Disabled if `VAPID` keys not configured. Fails silently.
3. **PostHog Analytics** -- Disabled if `NEXT_PUBLIC_POSTHOG_KEY` not set.
4. **Auto-Promotion Engine** -- Can be disabled globally via config.

### "Coming Soon" Items
1. **`app/features/page.tsx:87`** -- Boardy Integration marked `comingSoon: true` on the public features page, even though `dashboard/boardy` is fully built.

---

## 5. Missing Nav Items (Summary)

### Dashboard Sidebar (`app/dashboard/layout.tsx`)
The active layout.tsx has 18 nav items. The following **11 functional pages** are MISSING from sidebar:
- Wellbeing
- Inbox
- Video Coaching (+ History)
- Notifications
- Memory Browser
- Sharing Analytics
- Team Invitations
- Profile Snapshot
- Investor Targeting (+ Matches, Outreach, Pipeline)
- Strategy Reframing

### Top Navbar (`components/navbar.tsx`)
- No link to `/chat` (Talk to Fred) -- users must know URL or navigate from dashboard
- No link to `/features` page from main nav
- No link to `/interactive` demo page

### Admin Nav (`app/admin/layout.tsx`)
- Missing: Voice Agent admin (`/admin/voice-agent`)
- Missing: Analytics admin (`/admin/analytics`)

---

## 6. TODO/FIXME Items

| File | Line | Comment |
|------|------|---------|
| `lib/auth/middleware-example.ts:35` | `// TODO: Validate credentials against database` |
| `lib/investors/matching.ts:386` | `// TODO: add founder location to profile` |

Only 2 TODO items found in active source code -- relatively clean.

---

## 7. API Endpoints with No Frontend Consumer

These API endpoints exist but have no frontend page or component calling them:
1. `/api/setup-db` -- Dev-only database setup tool
2. `/api/health/ai` -- AI provider health check (monitoring only)
3. `/api/experiments/auto-promote` -- Cron-triggered auto-promotion (no UI)
4. `/api/notifications/config` -- Notification config (internal admin use)
5. `/api/notifications/pagerduty` -- PagerDuty webhook forwarder
6. `/api/notifications/slack` -- Slack webhook forwarder
7. `/api/notifications/test` -- Test notification sender

These are all legitimate backend/infrastructure endpoints that don't need frontend consumers.

---

## 8. Key Findings for Code Fixer

### CRITICAL: 11 Dashboard Pages Missing from Sidebar Navigation
The dashboard sidebar in `app/dashboard/layout.tsx` is missing nav items for 11 fully-built feature pages. Users can only access these by knowing the direct URL. This is the single largest UX gap in the application.

### HIGH: Orphaned Nav Components Never Imported
`components/dashboard/invitations-nav-item.tsx` and `components/dashboard/coaching-nav-item.tsx` were created specifically to add nav items but were never integrated into the layout.

### HIGH: Admin Pages Missing from Admin Nav
`/admin/voice-agent` and `/admin/analytics` are fully built but invisible to admins.

### MEDIUM: Orphaned Dashboard Shell
`app/dashboard/dashboard-shell.tsx` is a full duplicate of the dashboard layout that is never used. Should be removed.

### LOW: "Coming Soon" Inaccuracy
Boardy is marked "Coming Soon" on `/features` but the dashboard integration is fully built.
