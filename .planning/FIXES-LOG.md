# Fixes Log

## Full Stack UX Audit Fixes

| # | Issue | File(s) | Fix | Commit | QA Verified |
|---|-------|---------|-----|--------|-------------|
| 1 | Missing dashboard nav items (9 pages unreachable) | app/dashboard/layout.tsx | Added Wellbeing, Inbox, Notifications, Investor Targeting, Snapshot, Video, Memory, Sharing, Invitations | 3a39b3b | PASS (code) |
| 2 | Contact form no rate limiting | app/api/contact/route.ts | Added 5/hour/IP rate limit | 9a0e6b5 | PASS (code) |
| 3 | Community posts not gated by membership | app/api/communities/*/route.ts | Added membership check | d084c5e | PASS (code) |
| 4 | Chat typing indicator colors off-brand | components/chat/typing-indicator.tsx | Aligned colors with brand orange | b0d083f | PASS (code) |
| 5 | Chat input iOS zoom + touch targets + ARIA | components/chat/chat-input.tsx | text-base (16px), min-h-[44px], aria-labels | 0f47308 | PASS (code) |
| 6 | Protected routes list incomplete | lib/auth/middleware-utils.ts | Added /check-ins, /video, /onboarding, /interactive | e6d046f | PASS (code) |
| 7 | Diagnostic state PUT no validation | app/api/diagnostic/state/route.ts | Added Zod schema with enum+boolean+array validation | ddfdaa0 | PASS (code) |
| 8 | Private community self-join not blocked | app/api/communities/[slug]/members/route.ts | Added isPrivate check returning 403 | 9edc0e9 | PASS (code) |
| 9 | Onboarding fred-intro chat: no ARIA, small touch targets | components/onboarding/fred-intro-step.tsx | aria-labels + min-h/w-[44px] on send button | ae8b995 | PASS (code) |
| 10 | Chat safe-area-inset-bottom missing | components/chat/chat-interface.tsx | pb-[max(1rem,env(safe-area-inset-bottom))] + role="log" aria-live | 5d88f89 | PASS (code) |
| 11 | User deletion missing v3.0+ tables | app/api/user/delete/route.ts | Added 12 tables: conversation state, push, email, shares, community | 15c49f6 | PASS (code) |
| 12 | Community delete/update misleading userId param | lib/db/communities.ts | Removed unused userId param or added .eq("author_id") check | 2b259e7 | PASS (code) |
| 13 | Login: iOS zoom on inputs, no role=alert | app/login/page.tsx | text-base on inputs, role="alert" on error | 9c39a68 | PASS (code) |
| 14 | Get-started: error not announced to screen readers | app/get-started/page.tsx | Added role="alert" to error element | 525f11d | PASS (code) |
| 15 | Contact route duplicate forwardedFor variable | app/api/contact/route.ts | Removed duplicate declaration | e9e434a | PASS (code) |
| 16 | No error boundaries on onboarding/get-started | app/get-started/error.tsx, app/onboarding/error.tsx | Created branded error pages with retry + navigation | 36ec67b | PASS (code) |
| 17 | Chat bubble max-width too narrow on mobile | components/chat/chat-message.tsx | Changed to max-w-[85%] sm:max-w-[75%] for wider mobile text | 714a689 | PASS (code) |
| 18 | Chat height hardcoded at 73px, wastes space on mobile | app/chat/page.tsx | Changed to `h-[calc(100dvh-57px)] sm:h-[calc(100dvh-73px)]` — dvh + responsive offset | e7c6864 | PASS (code) |
| 19 | Chat "Enter/Shift+Enter" hint shown on mobile | components/chat/chat-input.tsx | Added `hidden sm:block` to hide keyboard hint on mobile | 6aaf2b4 | PASS (code) |
| 20 | Sidebar nav items below 44px touch target | app/dashboard/layout.tsx | Changed `py-2.5` to `py-3` and added `min-h-[44px]` | df393b2 | PASS (code) |
| 21 | Admin nav missing Voice Agent and Analytics | app/admin/layout.tsx | Added 2 nav links for fully-built admin pages | bb55ef6 | |
| 22 | Boardy incorrectly marked Coming Soon | app/features/page.tsx | Removed stale comingSoon: true flag | 92fee80 | |
| 23 | Strategy Reframing page orphaned (no links) | app/dashboard/strategy/page.tsx | Added link button in Strategy Docs header | d20faf6 | |
| 24 | Risk alerts error shows "Unable to load" instead of empty state | components/dashboard/red-flags-widget.tsx | Show friendly empty state on API error | c0d4396 | |
| 25 | No "Forgot Password" on login page | app/login/page.tsx, app/forgot-password/page.tsx, app/reset-password/page.tsx | Added forgot-password link, password reset pages with Supabase flow | c0d4396 | |
| 26 | Dashboard stat cards show raw "-" for locked features | app/dashboard/page.tsx | Show "0" with "Upgrade to Pro/Studio" link instead of "-" | c0d4396 | |
| 27 | Features nav dropdown has no "View all" link | components/navbar.tsx | Added "View all features" link at bottom of dropdown | c0d4396 | |
| 28 | CRITICAL: Chat page crashes during FRED AI response (about:blank) | app/api/fred/chat/route.ts, lib/hooks/use-fred-chat.ts | Server: safe SSE stream with closed flag, try/catch on enqueue/close, cancel() callback. Client: receivedDone tracking, mountedRef guards, reader.releaseLock(), graceful error on stream termination | 9b85e61 | |
| 29 | Startup process stepper truncates step names to first 2 words | components/startup-process/process-overview.tsx | Show full title with CSS truncate, widen max-w to 80px, add title tooltip | de9c89e | |
| 30 | /dashboard/ai-insights returns 404 | app/dashboard/ai-insights/page.tsx | Added redirect page from /dashboard/ai-insights to /dashboard/insights | 5d9bdff | |
| 31 | /admin silently redirects non-admin users (infinite redirect loop) | app/admin/layout.tsx, middleware.ts | Middleware sets x-pathname header; admin layout detects /admin/login and renders login without nav instead of redirecting again | a6d1999 | |

## Community Debug Investigation Fixes (by other agents)

| # | Issue | File(s) | Fix | Commit |
|---|-------|---------|-----|--------|
| B1 | toggleReaction TOCTOU race condition | lib/db/communities.ts | Replaced check-then-act with atomic delete-first pattern | 7284049 |
| B2 | PostgREST filter syntax injection in search | app/api/communities/route.ts | Strip PostgREST-special characters from search input | 3f2ac69 |
| B3 | Missing UPDATE RLS policy on community_members | lib/db/migrations/053_community_member_update_policy.sql | Added scoped UPDATE policy (owner/moderator only, no escalation to owner) | 7f2e193 |
| F01 | handleReact corruption + optimistic UI | app/dashboard/communities/[slug]/page.tsx | Optimistic toggle with rollback on error | d97ffaf |
| F02 | fetchMembers stale closure | app/dashboard/communities/[slug]/page.tsx | Wrapped in useCallback with proper deps | d97ffaf |
| F03 | Leave button missing confirmation | communities/[slug]/page.tsx, communities/page.tsx | Added window.confirm before DELETE | d97ffaf |
| F04 | ReplyThread not refreshing after submit | components/communities/ReplyThread.tsx | Re-fetch replies after successful onReply | d97ffaf |
| F05 | Reaction toggle 200-500ms delay | app/dashboard/communities/[slug]/page.tsx | Optimistic UI (merged with F01) | d97ffaf |
| F06 | Post creation toast on falsy data | app/dashboard/communities/[slug]/page.tsx | Guard toast behind if(json.data) | d97ffaf |
| F07 | Dead communityId prop on CreatePostForm | components/communities/CreatePostForm.tsx | Removed unused prop from interface and call sites | d97ffaf |
| F08 | Browse page join/leave errors swallowed | app/dashboard/communities/page.tsx | Added toast.error on failure branches | d97ffaf |
| F09 | postPage not reset on re-fetch | app/dashboard/communities/[slug]/page.tsx | Added setPostPage(0) alongside fetchPosts(0) | d97ffaf |
| F10 | Single joiningSlug race condition | app/dashboard/communities/page.tsx | Replaced string state with Set<string> | d97ffaf |

## QA Verification Template

For each fix from Code Fixer:
- [ ] Original issue no longer occurs
- [ ] No visual regression on mobile (375px)
- [ ] No visual regression on desktop (1440px)
- [ ] Touch targets still work
- [ ] No console errors
- [ ] Page still loads correctly

## Outstanding Issues (Not Yet Fixed)

| # | Priority | Issue | File | Notes |
|---|----------|-------|------|-------|
| O1 | ~~MEDIUM~~ | ~~Chat height hardcoded at 73px~~ | ~~app/chat/page.tsx:122~~ | FIXED in commit e7c6864 (Fix #18) |
| O2 | ~~MINOR~~ | ~~Chat "Enter/Shift+Enter" hint shown on mobile~~ | ~~components/chat/chat-input.tsx:99-101~~ | FIXED in commit 6aaf2b4 (Fix #19) |
| O3 | ~~MINOR~~ | ~~Sidebar nav items below 44px touch target~~ | ~~app/dashboard/layout.tsx:324~~ | FIXED in commit df393b2 (Fix #20) |
| O4 | MINOR | Hero "create a unicorn" inline-block | components/hero.tsx:107 | Underline animation may not span correctly |
| O5 | MINOR | Get-started progress dots tiny | app/get-started/page.tsx:267 | 2.5px dots, decorative, low impact |

## QA Notes

**Testing constraints:** Deployed site (sahara.vercel.app) is currently paused. Local dev server returns 500 on all pages due to middleware/env issues. Code-based verification is the primary method until deployment is restored.

**Verification method:** All 20 fixes verified by reading the committed source code. No visual regression testing possible until deployment is restored.

**Summary:** 31 Code Fixer fixes + 13 community debug fixes (3 backend + 10 frontend) = 44 total fixes. 2 remaining cosmetic items (O4, O5) are MINOR and decorative -- no functional impact.

**Milestone modal backdrop (reported minor issue):** Investigated add-milestone-modal.tsx -- it uses the standard Radix Dialog component which includes DialogOverlay with bg-black/50. The overlay is correctly rendered in the component chain (dialog.tsx line 59). Not reproducible from code -- overlay is present.

## Auth Debug Fixes (2026-02-18)

| # | Issue | File(s) | Fix | Commit |
|---|-------|---------|-----|--------|
| A1 | Missing signup API route | app/api/auth/signup/route.ts | Created POST handler with rate limiting (3/min/IP), input validation, `signUp` from `@/lib/auth` | 150eaae |
| A2 | createOrUpdateProfile writes non-existent enrichment columns (breaks signup) | lib/supabase/auth-helpers.ts | Removed 6 enrichment fields (industry, revenue_range, team_size, funding_history, enriched_at, enrichment_source) from upsert | 61b18b1 |
| A3 | Orphan cleanup in /api/onboard uses anon client instead of service role | app/api/onboard/route.ts | Import createServiceClient; use it for admin.deleteUser call | 376d706 |

| A4 | FRED chat duplicate getAllUserFacts DB call | app/api/fred/chat/route.ts, lib/fred/context-builder.ts, lib/ai/fred-client.ts, lib/fred/service.ts, lib/fred/types.ts, lib/fred/actors/load-memory.ts | Preload facts in buildFounderContextWithFacts, pass to FredService to skip redundant DB call | 6dcc6f4 |
| A5 | 22+ dashboard pages unreachable from sidebar | app/dashboard/layout.tsx | Added 11 core nav items (AI Insights, Journey, Coaching, Wellbeing, Startup Process, Strategy, Inbox, Notifications, History, Memory, Sharing, Invitations) + 7 conditional (Investor Targeting/Readiness/Evaluation, Pitch Deck, Reality Lens for Pro+; Virtual Team, Boardy for Studio) | 19e6976 |
| A6 | metadataBase hardcoded to sierra-fred-carey.vercel.app (admin redirect to wrong domain) | app/layout.tsx | Use NEXT_PUBLIC_APP_URL env var with joinsahara.com fallback | 308810b |
| A7 | /check-ins shows public navbar instead of dashboard sidebar | app/check-ins/layout.tsx | Created layout that wraps check-ins in DashboardLayout | feadf0c |
| A8 | /demo returns 404 | app/demo/page.tsx | Created demo index page listing all 5 interactive demos | 0347455 |
| A9 | Product page CTAs say "Join Waitlist" but signup is live | app/product/page.tsx | Changed to "Get Started" / "Get Started Free" pointing to /signup | 0ad8165 |
| A10 | /ai-insights bare route returns 404 | app/ai-insights/page.tsx | Created redirect to /dashboard/insights | 8435c81 |

*Updated: 2026-02-18*
