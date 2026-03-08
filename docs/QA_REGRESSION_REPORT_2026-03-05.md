# Full Regression Test Report — Sahara Platform

**Date:** 2026-03-05
**Linear:** [AI-1414](https://linear.app/ai-acrobatics/issue/AI-1414/qa-full-regression-test-after-funnel-version-launch)
**Context:** Post-funnel version (u.joinsahara.com) deployment regression testing
**Meeting Reference:** Sahara Founders meeting (2026-02-25), timestamp 01:05:20
**Test Method:** 5 parallel QA agents — browser automation (Stagehand/BrowserBase) + deep code-level review

---

## Executive Summary

| Test Area | Result | P0 Issues | P1 Issues | P2 Issues |
|-----------|--------|-----------|-----------|-----------|
| **Funnel Site (u.joinsahara.com)** | ❌ FAIL | 1 | 0 | 0 |
| **Mobile Responsiveness** | ✅ PASS (with warnings) | 0 | 0 | 3 |
| **Payment Flow (Stripe)** | ⚠️ PARTIAL FAIL | 1 | 1 | 0 |
| **Fred Chat/Voice** | ⚠️ PARTIAL FAIL | 1 | 0 | 2 |
| **Founder Journey Flow** | ✅ PASS | 0 | 1 | 0 |
| **FAQ Accuracy** | ⚠️ PARTIAL FAIL | 0 | 3 | 2 |

**Overall Verdict: BLOCKED — u.joinsahara.com is completely unreachable**

---

## P0 — Critical / Blockers

### 1. u.joinsahara.com is DOWN
- **Error:** `ERR_TUNNEL_CONNECTION_FAILED`
- **Impact:** The entire funnel site is unreachable. All 5 QA agents independently confirmed this.
- **Cascading Effect:** Login flow on joinsahara.com redirects to u.joinsahara.com, making it impossible for users to log in or access authenticated features (chat, dashboard, etc.)
- **Action:** Investigate Vercel DNS / Cloudflare tunnel configuration for the `u` subdomain immediately

### 2. Login Flow Broken (via u.joinsahara.com redirect)
- **Impact:** `/login` on the main site redirects to the downed funnel site
- **Result:** No user can log in or access any authenticated feature
- **Action:** Fix u.joinsahara.com or update the redirect target

### 3. STRIPE_WEBHOOK_SECRET Not Configured in Production
- **Evidence:** `POST /api/stripe/webhook` returns `{"error":"Stripe not configured","code":"STRIPE_NOT_CONFIGURED"}`
- **Impact:** If a user completes Stripe checkout, their subscription status will NOT be recorded in the Sahara database. All subscription lifecycle events (creation, update, cancellation, payment failure) will be silently dropped.
- **Action:** Set `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

---

## P1 — High Priority

### 4. Production/Source Code Drift on /pricing
- **Issue:** The deployed `/pricing` page renders a different component (stage-selection onboarding) than what exists in `app/pricing/page.tsx` on `main` branch
- **Impact:** The "Simple, Transparent Pricing" hero and 3-column pricing card layout are not visible; instead users see a "What stage are you at?" flow
- **Root Cause:** Production deployment appears to be running code not merged to main

### 5. FAQ $99 Tier Incorrectly Claims "Weekly Check-ins"
- **Issue:** FAQ states $99/mo includes "weekly check-ins" but Weekly SMS Check-ins are a $249 Studio feature
- **File:** `components/faq.tsx`, line 38
- **Impact:** Users may purchase the wrong tier expecting a feature they won't get

### 6. "Inbox Ops Agent" Advertised but Doesn't Exist
- **Issue:** Listed on both `components/pricing.tsx` and `app/pricing/page.tsx` as a Venture Studio feature
- **Reality:** Only 3 agents are implemented: founder-ops, fundraising, growth. No inbox agent exists.
- **Impact:** False advertising of a non-existent feature

### 7. Funnel FAQ Uses Wrong Agent Names ("CTO, CMO, CFO")
- **Issue:** `funnel/src/lib/constants.ts` line 125 says "virtual team agents (CTO, CMO, CFO)"
- **Reality:** Actual agents are "Founder Ops, Fundraising, and Growth" — not C-suite titles
- **Impact:** Brand inconsistency and incorrect information

### 8. Missing Onboarding Funnel Analytics
- **Issue:** `ANALYTICS_EVENTS.ONBOARDING` events (started, step_completed, completed, skipped) are defined but never fired
- **Impact:** Cannot measure drop-off between steps 1, 2, and 3 of the signup wizard
- **File:** `app/get-started/page.tsx` — only `AUTH.SIGNUP` is tracked

---

## P2 — Medium Priority

### 9. CallFredModal Audio Element Leak
- **Issue:** Audio elements appended to `document.body` on `TrackSubscribed` may not be cleaned up if room disconnects without `TrackUnsubscribed` events
- **File:** `components/dashboard/call-fred-modal.tsx`

### 10. CallFredModal useEffect Dependency
- **Issue:** `handleEndCall` used in `useEffect` but not memoized with `useCallback`
- **Impact:** Potential React warnings and unnecessary re-renders

### 11. LiveKit Voice Tier Gating UX
- **Issue:** Voice calls gated to Studio tier ($249/mo) but the Call UI is visible to all tiers
- **Impact:** Free/Pro users see the call button, click "Start Call", and hit a tier error
- **Recommendation:** Hide button or show upgrade prompt before API call

### 12. Boardy Described as Fully Functional (Uses Mock)
- **Issue:** FAQ describes Boardy as a mature investor matching system
- **Reality:** Uses `MockBoardyClient` with AI-generated matches, not a real investor database
- **File:** `lib/boardy/client.ts`

### 13. Footer FAQ Anchor Link Broken
- **Issue:** `/#faq` link in footer doesn't scroll to FAQ section
- **Root Cause:** Next.js client-side routing doesn't trigger hash navigation scrolling

### 14. FAQ $99 Tier Omits Investor Readiness Score
- **Issue:** A key differentiating feature not mentioned in FAQ tier comparison

### 15. PWA Install Prompt Overlaps Mobile Content
- **Issue:** `fixed bottom-4 left-4 right-4` covers 15-20% of viewport on iPhone SE for 15 seconds
- **File:** `components/pwa/InstallPrompt.tsx`

### 16. Chat FABs May Overlap Chat Input on Small Screens
- **Issue:** Two floating action buttons (Voice + Call) stacked at `fixed bottom-6 right-4`
- **Impact:** May compete with chat input on iPhone SE (375x667)

### 17. Dashboard Journey Missing Bottom Padding
- **Issue:** `MobileBottomNav` is `fixed bottom-0 h-16` but journey page may lack `pb-20` padding
- **Impact:** Content at bottom of page may be obscured

---

## Test Details by Area

### 1. Mobile Responsiveness

**Overall: PASS with warnings**

| Component | Result | Notes |
|-----------|--------|-------|
| Viewport meta tag | ✅ | `device-width`, `userScalable: true`, `viewportFit: cover` |
| Touch targets (≥44px) | ✅ | All interactive elements use `touch-target` CSS class |
| Responsive typography | ✅ | Proper Tailwind breakpoint scaling across all components |
| Navigation (hamburger) | ✅ | Radix Sheet at `lg:hidden`, all items have touch targets |
| Horizontal overflow | ✅ | `body { overflow-x: hidden }` globally |
| Safe area (iPhone notch) | ✅ | `env(safe-area-inset-bottom)` on mobile nav |
| Image scaling | ✅ | No fixed-width images, responsive classes throughout |
| Pricing cards stacking | ✅ | `grid-cols-1 md:grid-cols-3` |
| FAQ accordion | ✅ | Proper padding and constraints |
| iOS keyboard (chat) | ✅ | `text-base` prevents auto-zoom |

### 2. Payment Flow (Stripe)

**Overall: PASS (code) / FAIL (production config)**

| Test | Result |
|------|--------|
| Checkout auth enforcement (401) | ✅ PASS |
| Portal auth enforcement (401) | ✅ PASS |
| Webhook endpoint exists | ✅ PASS |
| Webhook signature verification (code) | ✅ PASS |
| Webhook idempotency (code) | ✅ PASS |
| Checkout input validation (code) | ✅ PASS |
| Downgrade prevention (code) | ✅ PASS |
| Redirect URLs (code) | ✅ PASS |
| Pricing tiers displayed | ✅ PASS ($0 / $99 / $249) |
| CTA links | ✅ PASS |
| Source/production parity | ❌ FAIL |
| Stripe webhook config | ❌ FAIL |

### 3. Fred Chat/Voice

**Overall: PASS (code quality excellent) / FAIL (infrastructure)**

| Test | Result |
|------|--------|
| Chat page renders correctly | ✅ PASS |
| Streaming SSE implementation | ✅ PASS |
| Rate limiting (tier-based) | ✅ PASS |
| Prompt injection protection | ✅ PASS |
| Timeout handling (55s + 5s buffer) | ✅ PASS |
| Memory gating (session vs persistent) | ✅ PASS |
| Tier-based model routing | ✅ PASS (Free→GPT-4o-mini, Pro/Studio→GPT-4o) |
| Voice input (Whisper Flow) | ✅ PASS |
| Call Fred (LiveKit) | ✅ PASS (impressive Samsung workarounds) |
| Fallback chain (primary→Sonnet→Gemini→fast) | ✅ PASS |
| Chat page accessible (requires login → broken) | ❌ FAIL (login redirects to downed u.joinsahara.com) |
| AI health endpoint | ✅ PASS (admin-gated, returns 401 as expected) |

### 4. Founder Journey Flow

**Overall: PASS (73/75 checks passed)**

| Test | Result |
|------|--------|
| 3-step wizard logic | ✅ PASS |
| Client-side validation | ✅ PASS |
| Server-side validation | ✅ PASS |
| Rate limiting (10/hr/IP) | ✅ PASS |
| Input sanitization | ✅ PASS |
| Duplicate email handling (secure) | ✅ PASS |
| localStorage persistence | ✅ PASS |
| Password excluded from localStorage | ✅ PASS |
| Analytics (AUTH.SIGNUP) | ✅ PASS |
| Onboarding step analytics | ❌ FAIL (events defined but never fired) |
| Error boundary | ✅ PASS |
| Redirect to dashboard | ✅ PASS |
| Browser: Step 1 (stage selection) | ✅ PASS |
| Browser: Step 2 (challenge selection) | ✅ PASS |
| Browser: Step 3 (account creation) | ✅ PASS |
| Browser: Back/forward navigation | ✅ PASS |
| Funnel site (u.joinsahara.com) | ❌ FAIL (down) |

### 5. FAQ Accuracy

**Overall: PARTIAL PASS — content quality good, accuracy issues found**

| Test | Result |
|------|--------|
| Grammar & spelling | ✅ PASS |
| Tone & voice consistency | ✅ PASS |
| Platform description accuracy | ✅ PASS |
| Tier pricing values ($0/$99/$249) | ✅ PASS |
| Tier feature descriptions | ⚠️ ISSUES (see P1 #5, #6) |
| Boardy description | ⚠️ OVERPROMISED (mock implementation) |
| Agent descriptions | ⚠️ MOSTLY ACCURATE ("sprint planning" is a stretch) |
| Funnel FAQ agent names | ❌ FAIL (CTO/CMO/CFO vs actual names) |
| Accordion functionality | ✅ PASS |
| Footer FAQ anchor | ❌ FAIL (doesn't scroll) |

---

## Recommendations

### Immediate (before accepting payments)
1. **Fix u.joinsahara.com** — investigate tunnel/proxy config
2. **Set STRIPE_WEBHOOK_SECRET** in Vercel production env vars
3. **Fix login redirect** — should not depend on u.joinsahara.com being up

### Before next marketing push
4. Fix FAQ tier descriptions (weekly check-ins → Studio only)
5. Remove "Inbox Ops Agent" from pricing or implement it
6. Update funnel FAQ agent names (CTO/CMO/CFO → Founder Ops/Fundraising/Growth)
7. Deploy main branch code to resolve production drift

### Product improvements
8. Add onboarding funnel analytics (steps 1-3)
9. Fix footer `/#faq` anchor scrolling
10. Hide Call Fred button for non-Studio tiers (or show upgrade prompt)
11. Adjust PWA install prompt positioning on mobile
12. Add bottom padding for mobile bottom nav on dashboard pages

---

*Report generated by 5 parallel QA agents using Stagehand/BrowserBase browser automation and comprehensive code-level analysis.*
