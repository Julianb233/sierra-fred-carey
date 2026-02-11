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

**Summary:** 20/20 fixes PASS. 2 remaining cosmetic items (O4, O5) are MINOR and decorative — no functional impact.

*Updated: 2026-02-11*
