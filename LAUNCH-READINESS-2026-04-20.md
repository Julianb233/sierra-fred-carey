# Sahara — Launch Readiness Diagnostic (v2 — full E2E)

**Date:** 2026-04-20
**Agent:** cli-session (aaron)
**Client:** Fred Cary — Sahara Companies
**Deployed app:** https://you.joinsahara.com (Vite SPA on Firebase Auth — Alex's version)
**Marketing site:** https://joinsahara.com (Next.js)
**Agency repo (NOT deployed):** /opt/agency-workspace/sahara (Julian's Next.js + Supabase)

---

## ⚡ Executive Summary

**Two critical discoveries changed the picture:**

1. **The deployed app is NOT the repo I have access to.** `you.joinsahara.com` is Alex LaTorre's Vite + Firebase SPA. Julian's Next.js + Supabase repo (with Stripe BUILDER tier, v9.0 PDF reports, WhatsApp pipeline, 1048 tests) is **not deployed anywhere**. The code consolidation decision from April 8 + April 15 meetings has not executed.
2. **The live app leaks user passwords in plaintext.** The `/dashboard/profile` page displays "Your Auto-Generated Password: <password>" with a "Copy this" prompt. This is a P0 security failure.

**Action taken this session:** Migration email sent to Alex (CC Fred, William) — Gmail ID `19dac929f36be5e5`. Asks for Supabase access + Firestore dump by Wed, full cutover end of next week.

**Not launch-ready.** Fix the password leak before any marketing push. Migrate to Supabase before the next investor conversation.

---

## P0 — LAUNCH BLOCKERS (must fix before any real users)

### 1. Plaintext password displayed on profile page (SECURITY)
**Where:** https://you.joinsahara.com/dashboard/profile
**Symptom:** After signup, the user's password renders in the UI with the label "Your Auto-Generated Password" and "Copy this! It will not appear again and you will have to reset it if lost."
**Why catastrophic:** Applications should never store or display user passwords in plaintext. If this is shown post-hoc from server data, the password is stored in plaintext (or recoverable). If it's only shown once at signup, it still violates every modern auth convention — passwords should be user-set or magic-link-only, never displayed.
**Immediate mitigation:** Remove this UI element. If auto-generated, email the one-time password via secure link and clear it from state on first successful login.
**Probable root cause:** Holdover from the original Firebase Auth pattern where Alex was generating a password for the user behind the scenes. Should be replaced with either user-set passwords or magic-link sign-in.

### 2. Auth infra is Firebase, not Supabase (STRATEGIC)
**Symptom:** `you.joinsahara.com` POSTs to `identitytoolkit.googleapis.com` (Firebase Auth). Julian's Supabase-backed Next.js repo is not deployed.
**Why critical:** The v9.0 features that are built and tested (Founder Journey Report PDF, Stripe BUILDER tier activation, WhatsApp feedback-to-Linear pipeline, voice agent, weekly SMS, Reality Lens persistent scoring) all depend on Supabase + the Next.js backend. None of it reaches the users who are actually logged in.
**Action taken:** Migration email sent to Alex.

### 3. "Fred Carey" misspelling
**Where:** https://joinsahara.com/demo/reality-lens — "Stop lying to yourself. Get **Fred Carey's** no-BS analysis…"
**Impact:** Founder's own name wrong on his product.
**Fix:** Find-replace `Fred Carey` → `Fred Cary`. Add a CI grep-guard.

### 4. Pricing Feature Comparison table is broken
**Where:** https://joinsahara.com/pricing — below tier cards.
**Symptom:** Every row repeats the four price headers (`Free / $39 / $99 / $249`) instead of showing which tiers include which features.
**Impact:** Confusion at the commit moment. Users can't compare.

---

## P1 — PRE-LAUNCH

### 5. PWA "Install Sahara" bubble overlaps Pro tier on desktop pricing page
Obscures the "Most Popular" CTA.

### 6. Market-type buttons render broken letter badges
**Where:** /onboarding/7 ("Who are you building for?")
**Symptom:** All four options show badge letters `B / B / B / U` (should be `A / B / C / D`). Option D reads: "I'm selling to I'm not sure yet" — duplicated "I'm selling to" prefix.

### 7. ESLint config broken — no lint guardrail in CI
`react-hooks` plugin referenced but not installed. `npm run lint` errors.

### 8. /tools/investor-readiness quiz appears stuck on Q1
Only "Previous" button visible in server-rendered HTML. Needs verification.

### 9. "Features" top-nav link is dead (no href)
On both joinsahara.com and you.joinsahara.com.

---

## What IS working

- **Onboarding UX is strong.** 8-step flow from welcome → stage picker → weakspot → idea + company name → market + location → "Your roadmap is waiting" → Fred intro → Business Intelligence Radar → Dashboard. Copy is good, no-sugarcoating tone matches Fred's brand.
- **FRED chat streaming works.** Response in ~12s. Anti-sycophancy guardrail fires correctly (pushed back on me asking about validation, redirected to problem definition first).
- **Personalization works.** FRED addressed the user by their signup name, referenced the company name (TestCo) they entered.
- **Dashboard layout is clean.** Four-tab nav (Progress / Mentor / Checklist / You) is intuitive.
- **Marketing site + OG tags + mobile viewport** are all correct.
- **Build compiles clean** on Julian's Next.js repo (116 routes, exit 0).

---

## Fleet / PPP Status

- PPP row exists for `sahara` in Supabase but `onboarded=false`, Telegram not created, `deployed_url` and `linear_project_id` both null — Julian to fill in.
- Obsidian notes updated with diagnostic findings.

---

## Untested (out of 30-min window)

- Full Reality Lens submit flow (dashboard tab exists but didn't exercise it)
- Pitch deck upload path
- Stripe checkout — BUILDER $39 click-through to verify price ID
- Voice agent (LiveKit room join)
- Founder Journey Report PDF generation (Julian's pipeline is not deployed, so cannot test against live users)
- Mobile Safari (viewport, PWA install, touch targets) — Firecrawl mobile:true passed on landing but no authenticated mobile walk
- Logout + session expiry — test account was deleted from Supabase but Firebase account persists until auto-cleanup

---

## Recommended Meeting Agenda (next 30 min)

1. **Lead with the password plaintext issue** — anyone who saw a demo of the app since launch has seen this. Fix today.
2. **Surface the Alex migration email** — Alex got it; he has Fred and William on CC. Use the meeting to align on timeline (Wed for access, next Friday for cutover).
3. **P0 copy fixes** — Fred Carey → Fred Cary, pricing table. 15 min of work.
4. **Agree:** do we ship Alex's version with the password fix + copy fixes? Or hold launch until Supabase migration lands? Julian's recommendation in the email: ship what's there (minus P0s), migrate in parallel, relaunch as "v1" in 1-2 weeks.

---

## Artifacts

- Migration email: Gmail `19dac929f36be5e5` (sent to Alex, CC Fred + William)
- Screenshots: `/tmp/sahara-[01-22]-*.png` (login, onboarding 8 steps, dashboard 4 tabs, FRED chat response)
- Obsidian: `Projects/Sahara/2026-04-20-launch-readiness-diagnostic.md`
- Full report: `/opt/agency-workspace/sahara/LAUNCH-READINESS-2026-04-20.md` (this file)
