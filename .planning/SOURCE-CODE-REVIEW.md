# Source Code Review Report (v2)

**Date:** 2026-02-18
**Reviewer:** Source Code Reviewer (Audit v2)
**Scope:** Full codebase — routes, navigation, dead code, env vars, hardcoded URLs

---

## 1. ALL Page Routes (app/ directory)

### Public Pages (no auth required)
| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Homepage |
| `/about` | `app/about/page.tsx` | About page |
| `/pricing` | `app/pricing/page.tsx` | Pricing page |
| `/product` | `app/product/page.tsx` | Product showcase |
| `/features` | `app/features/page.tsx` | Features overview |
| `/blog` | `app/blog/page.tsx` | Blog listing |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | Blog post |
| `/login` | `app/login/page.tsx` | Login |
| `/signup` | `app/signup/page.tsx` | Signup |
| `/get-started` | `app/get-started/page.tsx` | Onboarding wizard |
| `/forgot-password` | `app/forgot-password/page.tsx` | Password reset request |
| `/reset-password` | `app/reset-password/page.tsx` | Password reset form |
| `/contact` | `app/contact/page.tsx` | Contact form |
| `/support` | `app/support/page.tsx` | Support/help center |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms of service |
| `/links` | `app/links/page.tsx` | Linktree-style page |
| `/install` | `app/install/page.tsx` | PWA install instructions |
| `/offline` | `app/offline/page.tsx` | PWA offline page |
| `/shared/[token]` | `app/shared/[token]/page.tsx` | Public share link |
| `/waitlist` | `app/waitlist/page.tsx` | **Redirect** -> `/get-started` |
| `/ai-insights` | `app/ai-insights/page.tsx` | **Redirect** -> `/dashboard/insights` |
| `/documents` | `app/documents/page.tsx` | **Redirect** -> `/dashboard/strategy` |

### Demo Pages (no auth required)
| Route | File | Notes |
|-------|------|-------|
| `/demo` | `app/demo/page.tsx` | Demo index |
| `/demo/reality-lens` | `app/demo/reality-lens/page.tsx` | Reality Lens demo |
| `/demo/investor-lens` | `app/demo/investor-lens/page.tsx` | Investor Lens demo |
| `/demo/pitch-deck` | `app/demo/pitch-deck/page.tsx` | Pitch Deck demo |
| `/demo/virtual-team` | `app/demo/virtual-team/page.tsx` | Virtual Team demo |
| `/demo/boardy` | `app/demo/boardy/page.tsx` | Boardy demo |
| `/interactive` | `app/interactive/page.tsx` | Interactive GSAP demo |

### Dashboard Pages (auth required -- sidebar layout)
| Route | File | In Sidebar? | Notes |
|-------|------|-------------|-------|
| `/dashboard` | `app/dashboard/page.tsx` | YES (Home) | |
| `/dashboard/next-steps` | `app/dashboard/next-steps/page.tsx` | YES | |
| `/dashboard/readiness` | `app/dashboard/readiness/page.tsx` | YES | |
| `/dashboard/insights` | `app/dashboard/insights/page.tsx` | YES (AI Insights) | |
| `/dashboard/journey` | `app/dashboard/journey/page.tsx` | YES | |
| `/dashboard/coaching` | `app/dashboard/coaching/page.tsx` | YES | |
| `/dashboard/coaching/history` | `app/dashboard/coaching/history/page.tsx` | NO | Sub-page of coaching |
| `/dashboard/wellbeing` | `app/dashboard/wellbeing/page.tsx` | YES | |
| `/dashboard/startup-process` | `app/dashboard/startup-process/page.tsx` | YES | |
| `/dashboard/strategy` | `app/dashboard/strategy/page.tsx` | YES | |
| `/dashboard/strategy/reframing` | `app/dashboard/strategy/reframing/page.tsx` | NO | Sub-page |
| `/dashboard/documents` | `app/dashboard/documents/page.tsx` | YES | |
| `/dashboard/communities` | `app/dashboard/communities/page.tsx` | YES (Community) | |
| `/dashboard/communities/create` | `app/dashboard/communities/create/page.tsx` | NO | Sub-page |
| `/dashboard/communities/[slug]` | `app/dashboard/communities/[slug]/page.tsx` | NO | Sub-page |
| `/dashboard/communities/[slug]/members` | `app/dashboard/communities/[slug]/members/page.tsx` | NO | Sub-page |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | YES | |
| `/dashboard/positioning` | `app/dashboard/positioning/page.tsx` | CONDITIONAL (Pro+) | |
| `/dashboard/investor-lens` | `app/dashboard/investor-lens/page.tsx` | CONDITIONAL (Pro+, not early) | |
| `/dashboard/investor-targeting` | `app/dashboard/investor-targeting/page.tsx` | CONDITIONAL (Pro+, not early) | |
| `/dashboard/investor-targeting/matches` | `app/dashboard/investor-targeting/matches/page.tsx` | NO | Sub-page |
| `/dashboard/investor-targeting/pipeline` | `app/dashboard/investor-targeting/pipeline/page.tsx` | NO | Sub-page |
| `/dashboard/investor-targeting/outreach` | `app/dashboard/investor-targeting/outreach/page.tsx` | NO | Sub-page |
| `/dashboard/investor-readiness` | `app/dashboard/investor-readiness/page.tsx` | CONDITIONAL (Pro+, not early) | |
| `/dashboard/investor-evaluation` | `app/dashboard/investor-evaluation/page.tsx` | CONDITIONAL (Pro+, not early) | |
| `/dashboard/pitch-deck` | `app/dashboard/pitch-deck/page.tsx` | CONDITIONAL (Pro+, not early) | |
| `/dashboard/reality-lens` | `app/dashboard/reality-lens/page.tsx` | CONDITIONAL (Pro+, not early) | |
| `/dashboard/agents` | `app/dashboard/agents/page.tsx` | CONDITIONAL (Studio) | |
| `/dashboard/boardy` | `app/dashboard/boardy/page.tsx` | CONDITIONAL (Studio) | |
| `/dashboard/profile/snapshot` | `app/dashboard/profile/snapshot/page.tsx` | **NO** | Not in any nav |
| `/dashboard/inbox` | `app/dashboard/inbox/page.tsx` | **NO** | Accessible but hidden |
| `/dashboard/notifications` | `app/dashboard/notifications/page.tsx` | **NO** | Accessible but hidden |
| `/dashboard/history` | `app/dashboard/history/page.tsx` | **NO** | Accessible but hidden |
| `/dashboard/memory` | `app/dashboard/memory/page.tsx` | **NO** | Accessible but hidden |
| `/dashboard/sharing` | `app/dashboard/sharing/page.tsx` | **NO** | Accessible but hidden |
| `/dashboard/invitations` | `app/dashboard/invitations/page.tsx` | **NO** | Accessible but hidden |
| `/dashboard/sms` | `app/dashboard/sms/page.tsx` | **NO** | SMS dashboard hidden |
| `/dashboard/monitoring` | `app/dashboard/monitoring/page.tsx` | **NO** | Monitoring hidden |
| `/dashboard/ai-insights` | `app/dashboard/ai-insights/page.tsx` | NO | Redirect -> `/dashboard/insights` |

### Auth-Required Non-Dashboard Pages
| Route | File | Notes |
|-------|------|-------|
| `/chat` | `app/chat/page.tsx` | In sidebar (Chat with Fred) |
| `/agents` | `app/agents/page.tsx` | Protected, no sidebar link |
| `/agents/[agentId]` | `app/agents/[agentId]/page.tsx` | Protected |
| `/check-ins` | `app/check-ins/page.tsx` | Protected, wraps DashboardLayout |
| `/check-ins/[checkInId]` | `app/check-ins/[checkInId]/page.tsx` | Protected |
| `/check-ins/configure` | `app/check-ins/configure/page.tsx` | Protected |
| `/documents/[docId]` | `app/documents/[docId]/page.tsx` | Protected |
| `/documents/new` | `app/documents/new/page.tsx` | Protected |
| `/video` | `app/video/page.tsx` | Protected |
| `/video/[room]` | `app/video/[room]/page.tsx` | Protected |
| `/onboarding` | `app/onboarding/page.tsx` | Protected |
| `/tools/investor-readiness` | `app/tools/investor-readiness/page.tsx` | **NOT in protected routes** |

### Admin Pages
| Route | File | In Admin Nav? |
|-------|------|---------------|
| `/admin` | `app/admin/page.tsx` | YES (Dashboard) |
| `/admin/login` | `app/admin/login/page.tsx` | N/A |
| `/admin/prompts` | `app/admin/prompts/page.tsx` | YES |
| `/admin/config` | `app/admin/config/page.tsx` | YES |
| `/admin/ab-tests` | `app/admin/ab-tests/page.tsx` | YES |
| `/admin/training` | `app/admin/training/page.tsx` | YES |
| `/admin/training/communication` | Sub-page | NO |
| `/admin/training/frameworks` | Sub-page | NO |
| `/admin/training/agents` | Sub-page | NO |
| `/admin/training/identity` | Sub-page | NO |
| `/admin/voice-agent` | `app/admin/voice-agent/page.tsx` | YES |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | YES |

---

## 2. ALL API Routes (128 route files)

Full inventory organized by domain:

- **Auth (4):** login, logout, signup, me
- **Fred AI (14):** chat, analyze, decide, strategy (CRUD+export), history, memory (+stats), mode, export, investor-readiness, reality-lens, pitch-review, call (+summary)
- **Dashboard (8):** command-center, stats, readiness, next-steps, next-actions, nav, documents, profile/snapshot, strategy/reframe
- **Admin (17):** login, logout, dashboard, config, prompts (CRUD+activate+test), ab-tests (CRUD+end+traffic+promote), training (metrics+ratings+requests), voice-agent (config+analytics+escalation+knowledge), analytics/engagement
- **Monitoring (10):** dashboard, health, charts, alerts (+check), auto-promotion/check, experiments (CRUD+promote+history), variants
- **Diagnostic (7):** analyze, events, introduce, investor, positioning, state, root
- **Investor (8):** investor-lens (root+evaluate+deck-request+deck-review), investors (match+upload+generate-outreach+pipeline)
- **Documents (8):** CRUD, search, review, upload, uploaded, document-repository (CRUD+review)
- **Positioning (4):** assess, latest, quick-check, root
- **Community (8):** communities (CRUD+members), posts (CRUD+reactions+replies)
- **Journey (5):** timeline, milestones (+CRUD), references, insights, stats
- **Coaching (2):** sessions, participants
- **Notifications (7):** send, config, settings, logs, test, slack, pagerduty
- **Push (2):** subscribe, preferences
- **SMS (3):** webhook, preferences, verify
- **Stripe (3):** checkout, portal, webhook
- **Check-ins (1):** root
- **Wellbeing (1):** check-in
- **Inbox (1):** root
- **Share (2):** root, [token]
- **Team (3):** root, invitations, accept
- **User (2):** delete, subscription
- **LiveKit (2):** token, webhook
- **Boardy (2):** match, callback
- **Pitch Deck (2):** upload, parse
- **Red Flags (2):** root, [id]
- **AI Rating (1):** rating
- **Contact (1):** root
- **Onboard (2):** root, invite
- **Cron (3):** re-engagement, weekly-checkin, weekly-digest
- **Experiments (1):** auto-promote
- **Health (1):** ai
- **Setup (1):** setup-db (dev-only)
- **Community Consent (1):** consent

---

## 3. Sidebar Navigation Audit

### Dashboard Sidebar: 13 core + 9 conditional items

**Core items (always visible):**
1. Home -> `/dashboard`
2. Chat with Fred -> `/chat`
3. Next Steps -> `/dashboard/next-steps`
4. Readiness -> `/dashboard/readiness`
5. AI Insights -> `/dashboard/insights`
6. Journey -> `/dashboard/journey`
7. Coaching -> `/dashboard/coaching`
8. Wellbeing -> `/dashboard/wellbeing`
9. Startup Process -> `/dashboard/startup-process`
10. Strategy -> `/dashboard/strategy`
11. Documents -> `/dashboard/documents`
12. Community -> `/dashboard/communities`
13. Settings -> `/dashboard/settings`

**Conditional items (tier/stage gated):**
- Positioning -> `/dashboard/positioning` (Pro+)
- Investor Lens -> `/dashboard/investor-lens` (Pro+, not early stage)
- Investor Targeting -> `/dashboard/investor-targeting` (Pro+, not early)
- Investor Readiness -> `/dashboard/investor-readiness` (Pro+, not early)
- Investor Evaluation -> `/dashboard/investor-evaluation` (Pro+, not early)
- Pitch Deck -> `/dashboard/pitch-deck` (Pro+, not early)
- Reality Lens -> `/dashboard/reality-lens` (Pro+, not early)
- Virtual Team -> `/dashboard/agents` (Studio)
- Boardy -> `/dashboard/boardy` (Studio)

**Intentionally hidden (per code comment):** Inbox, Notifications, History, Memory, Sharing, Invitations -- "accessible from Settings or contextual links."

**Also hidden:** SMS, Monitoring, Profile Snapshot, Coaching History.

### Mobile Bottom Nav: 7 items
Home, Chat, Next, Progress, Docs, Community, Profile

### Admin Nav: 7 items (complete)
Dashboard, Prompts, Config, A/B Tests, Training, Voice Agent, Analytics

### Public NavBar
Pricing, Features (dropdown with 5 demos), See it in Action, About, Login, Get Started Free

---

## 4. GAPS & ISSUES FOUND

### GAP-1: Dead Link `/dashboard/chat` in Check-ins Page (BUG)
**File:** `app/check-ins/page.tsx:201`
**Issue:** Empty state "Talk to FRED" button links to `/dashboard/chat` which does NOT exist. Chat page is at `/chat`.
**Impact:** Users clicking this get a 404.
**Fix:** Change `href="/dashboard/chat"` to `href="/chat"`.
**Severity:** BUG

### GAP-2: Hardcoded `localhost` in CORS Config
**File:** `lib/api/cors.ts:5-6`
**Issue:** CORS allowed origins hardcode `http://localhost:3000` and `http://localhost:3001`. In production, these are always in the allowlist.
**Impact:** Minor -- localhost CORS in production allows local dev tools to make cross-origin requests. Usually harmless since auth cookies are still required.
**Severity:** Minor

### GAP-3: Hardcoded `localhost` Fallbacks in Production Code
**Files:** `app/shared/[token]/page.tsx:59`, `lib/email/invite.ts:41`, `lib/api/cors.ts:4`
**Issue:** If `NEXT_PUBLIC_APP_URL` env var is not set, URLs fall back to `http://localhost:3000`. Share links and email invites would contain localhost URLs.
**Impact:** Protected by env validation in `lib/env.ts`, so unlikely in practice. But the fallback is risky.
**Severity:** Low

### GAP-4: `/api/dashboard/nav` -- Orphaned API Endpoint
**File:** `app/api/dashboard/nav/route.ts`
**Issue:** No frontend component calls this endpoint. Only referenced in its test file.
**Severity:** Cleanup (dead code)

### GAP-5: `/api/dashboard/next-actions` -- Orphaned API Endpoint
**File:** `app/api/dashboard/next-actions/route.ts`
**Issue:** No frontend component calls this endpoint. Only referenced in its test file.
**Severity:** Cleanup (dead code)

### GAP-6: `/api/health/ai` -- Orphaned API Endpoint
**File:** `app/api/health/ai/route.ts`
**Issue:** No frontend component calls this. May be intended for external monitoring tools.
**Severity:** Informational

### GAP-7: `/links` Page Has "Join Waitlist" Label
**File:** `app/links/page.tsx:32-37`
**Issue:** Linktree page shows "Join Waitlist" -> `/waitlist` -> redirects to `/get-started`. Label is misleading since signup is already live.
**Impact:** Minor UX confusion.
**Fix:** Change "Join Waitlist" to "Get Started" and update href to `/get-started`.
**Severity:** Minor

### GAP-8: `/tools/investor-readiness` Not in Protected Routes
**File:** `lib/auth/middleware-utils.ts:34`
**Issue:** The `/tools` path is not listed in `DEFAULT_PROTECTED_ROUTES.paths`. The investor readiness tool page is accessible without authentication.
**Impact:** Low -- appears to be intentionally public as a standalone tool.
**Severity:** Informational

### GAP-9: Missing Sentry DSN (Known)
**Impact:** Error monitoring completely disabled in production.
**Status:** Already documented in STATE.md.

### GAP-10: Missing Twilio Credentials (Known)
**Impact:** SMS check-in features will not work.
**Status:** Already documented in STATE.md.

### GAP-11: LiveKit Env Vars May Be Missing
**File:** `lib/voice-agent.ts:77-79`
**Issue:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` have empty string defaults.
**Impact:** Voice call feature silently fails if not set.
**Severity:** Medium (if voice calls are a production feature)

### GAP-12: PostHog Analytics May Not Be Configured
**Files:** `lib/analytics/index.ts:15`, `lib/analytics/server.ts:14`
**Issue:** PostHog keys have empty string defaults. Analytics silently disabled if not set.
**Severity:** Low

---

## 5. Summary of Actionable Fixes for Code Fixer

| # | Severity | Issue | File:Line | Fix |
|---|----------|-------|-----------|-----|
| GAP-1 | **BUG** | Dead link `/dashboard/chat` | `app/check-ins/page.tsx:201` | Change `href="/dashboard/chat"` to `href="/chat"` |
| GAP-7 | Minor | "Join Waitlist" misleading label | `app/links/page.tsx:32-37` | Change to "Get Started", update href to `/get-started` |
| GAP-2 | Minor | Hardcoded localhost in CORS | `lib/api/cors.ts:5-6` | Consider removing localhost from production CORS |
| GAP-4 | Cleanup | Orphaned `/api/dashboard/nav` | `app/api/dashboard/nav/route.ts` | Consider removing dead code |
| GAP-5 | Cleanup | Orphaned `/api/dashboard/next-actions` | `app/api/dashboard/next-actions/route.ts` | Consider removing dead code |

### Things Working Correctly
- Dashboard sidebar correctly shows 13 core + 9 conditional items
- Admin panel has proper auth gating via `isAdminSession()`
- `/api/setup-db` correctly blocked in production
- Protected routes properly enforced via middleware
- Mobile bottom nav has 7 high-priority items
- All redirect pages work correctly
- All demo pages accessible without auth
- Feature gating (tier/stage-based) works correctly
- No TODO/FIXME/HACK comments found in production code
- No feature flags or disabled features found
- No test data hardcoded in production code
- Admin nav is complete for all admin pages
