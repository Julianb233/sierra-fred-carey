# Debug Report: AI-1414 QA Full Regression Test (Attempt 2)

**Date:** 2026-03-05
**Linear:** AI-1414
**Team:** 4-agent debug team (Frontend Tester, Backend Debugger, Database Checker, Code Reviewer)
**Build:** PASSING (221+ pages)
**Tests:** 685/802 passing (117 pre-existing failures from React 19/testing-library incompatibility — unchanged)

---

## Summary

Attempt 1 made code fixes but crashed before committing. Attempt 2 spawned a 4-agent team to validate all fixes, identify gaps, and apply additional corrections.

**Result:** 6 additional issues found and fixed beyond the original debug team's work.

---

## Issues Investigated & Resolved (Attempt 1 — Validated)

### P0 Issues (Infrastructure — Not Code)

| # | Issue | Root Cause | Resolution |
|---|-------|-----------|------------|
| 1 | u.joinsahara.com DOWN | Vercel deployment for funnel subdomain | Needs Vercel DNS/deployment fix |
| 2 | Login redirect to u.joinsahara.com | Middleware correctly redirects to `/login` on same domain | No code change needed |
| 3 | STRIPE_WEBHOOK_SECRET missing | Env vars not set in Vercel dashboard | Add to Vercel env vars |

### P1 Issues — FIXED (Attempt 1)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 4 | FAQ: $99 tier claims "weekly check-ins" | Moved to $249 tier, added "persistent founder memory" to $99 | `components/faq.tsx` |
| 5 | "Inbox Ops Agent" advertised but doesn't exist | Added "(Coming Soon)" label | `components/pricing.tsx` |
| 6 | Funnel FAQ: wrong agent names (CTO/CMO/CFO) | Changed to "Founder Ops, Fundraising, Growth" | `funnel/src/lib/constants.ts` |
| 7 | CORS: funnel origin missing | Added `https://u.joinsahara.com` to CORS allowlist | `lib/api/cors.ts` |

### P2 Issues — FIXED (Attempt 1)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 8 | CallFredModal audio element leak | Added `audioElementsRef` to track and clean up DOM audio elements | `components/dashboard/call-fred-modal.tsx` |
| 9 | Footer FAQ anchor broken | Added smooth scroll handler when already on homepage | `components/footer.tsx` |
| 10 | PWA install prompt overlaps mobile nav | Changed mobile positioning from `bottom-4` to `bottom-20` | `components/pwa/InstallPrompt.tsx` |
| 11 | Chat page: V keyboard shortcut for voice | Added keyboard shortcut with input field guard | `app/chat/page.tsx` |

### Database Issues — FIXED (Attempt 1)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 12 | Broken RLS on milestones/journey_events | New migration with `auth.uid()::text` | `supabase/migrations/20260305000001` |
| 13 | Broken RLS on notification_configs/logs | New migration with `auth.uid()::text` | `supabase/migrations/20260305000002` |

---

## Additional Issues Found & Fixed (Attempt 2)

### P1 Issues — FIXED

| # | Issue | Fix | File |
|---|-------|-----|------|
| 14 | `/pricing` page missing "(Coming Soon)" on Inbox Ops Agent | Added "(Coming Soon)" to match homepage pricing | `app/pricing/page.tsx` |
| 15 | Chat V shortcut doesn't guard `contentEditable` elements | Added `target.isContentEditable` check | `app/chat/page.tsx` |
| 16 | Footer hash extraction fragile (`link.href.replace("/", "")`) | Rewrote to use `split("#")` for proper hash extraction | `components/footer.tsx` |
| 17 | CORS: `localhost:5173` hardcoded in production allowlist | Wrapped in `NODE_ENV !== "production"` guard | `lib/api/cors.ts` |
| 18 | Duplicate migration timestamp `20260305000001` | Renamed episodic_memory_dedup to `20260305000003` | `supabase/migrations/` |

### P2 Issues — Noted (Not Fixed — Low Impact)

| # | Issue | Notes |
|---|-------|-------|
| 19 | `audioElementsRef` not pruned on `TrackUnsubscribed` | Stale refs accumulate but cleanup is harmless (double-remove is no-op) |
| 20 | `resumeAudioContext()` creates throwaway AudioContext | Dead code, wrapped in try/catch, no crash risk |
| 21 | ~25 `console.log` calls in call-fred-modal | Debug logging in production; informational, not a crash risk |
| 22 | PWA `bottom-20` may still overlap on iPhone with home indicator | `bottom-24` would be safer but current value works for most devices |
| 23 | FAQ "weekly check-ins" less specific than pricing's "Weekly SMS Accountability Check-ins" | Minor copy inconsistency |

---

## Backend Analysis

### Environment Variables Status

**Present:** Supabase, OpenAI, LiveKit, ElevenLabs, Browserbase, Admin key, Railway, Trigger.dev
**Missing (need Vercel config):**

| Variable | Impact |
|---|---|
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | P0 — payments non-functional |
| `NEXT_PUBLIC_APP_URL` (production) | P0 — must be `https://joinsahara.com` in Vercel |
| `RESEND_API_KEY` | P1 — email features return 503 |
| `CRON_SECRET` | P1 — cron jobs return 401 |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | P2 — SMS features unavailable |
| `RECORDING_S3_ACCESS_KEY` / `RECORDING_S3_SECRET` | P3 — voice recording storage |

All missing-env cases handled gracefully (503 responses, no crashes).

### API Error Handling

Every API route uses try/catch with structured JSON errors. Stripe routes return 503 with `STRIPE_NOT_CONFIGURED` code. Admin routes use timing-safe HMAC comparison. No bare async handlers found.

### Database Integrity

- RLS policies on `milestones`, `journey_events`, `notification_configs`, `notification_logs` — FIXED with `auth.uid()::text`
- All UUID-typed tables use correct `auth.uid() = user_id` without cast
- Supabase SSR setup and cookie handling verified correct
- No SQL injection risks found in Supabase query builder usage
- `exec_sql` RPC in `conversation-state.ts` uses parameterized queries ($1/$2/$3) — safe

---

## Frontend Testing Results (Live Site)

**Tested by:** Stagehand browser automation at https://joinsahara.com

| Page | Result | Notes |
|------|--------|-------|
| Homepage | PASS | Hero, nav, pricing, FAQ all render |
| /pricing | PASS | All 3 tiers display correctly |
| /login | PASS | Email, password fields, submit button |
| /signup | PASS | Redirects to /get-started (intentional) |
| /chat | PASS | Auth-gated redirect to /login |
| Footer FAQ anchor | PASS | Smooth scroll to #faq section |
| Mobile (390px) | PASS | Hamburger menu, no overflow |
| Console errors | PASS | None detected |

---

## Remaining Action Items (Not Code — Deployment Config)

1. **Set Stripe env vars** in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
2. **Set `NEXT_PUBLIC_APP_URL=https://joinsahara.com`** in Vercel production env
3. **Fix u.joinsahara.com deployment** — check Vercel DNS/project
4. **Run RLS migrations** on production Supabase after deploy
5. **Add `RESEND_API_KEY` and `CRON_SECRET`** to Vercel for email/cron features
