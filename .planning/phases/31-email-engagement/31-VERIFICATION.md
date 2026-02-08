---
phase: 31-email-engagement
verified: 2026-02-07T23:45:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
---

# Phase 31: Email Engagement Verification Report

**Phase Goal:** Founders receive timely, relevant emails that keep them engaged -- weekly activity digests, milestone celebrations, and re-engagement nudges for inactive users
**Verified:** 2026-02-07T23:45:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opted-in founders receive a branded weekly digest email every Monday summarizing their activity (conversations, milestones, tasks, red flags) | VERIFIED | Cron route at `app/api/cron/weekly-digest/route.ts` (206 lines) queries all profiles with `onboarding_completed=true`, checks `shouldSendEmail(userId, 'weekly_digest')`, aggregates data from 5 DB tables via `getDigestData()`, renders `WeeklyDigest` React Email template with stats grid (conversations, milestones, tasks, red flags), highlights list, and CTA button. Vercel cron configured at `0 10 * * 1` (Monday 10:00 UTC). |
| 2 | When a founder completes a milestone, they receive a celebration email with a Fred quote and next step suggestion | VERIFIED | `sendMilestoneEmail()` in `lib/email/milestones/triggers.ts` (123 lines) is called fire-and-forget from `app/api/journey/milestones/[id]/route.ts` line 182 when `status === "completed"`. It fetches `getRandomQuote()` from `lib/fred-brain.ts`, looks up `MILESTONE_MESSAGES` for next step suggestion, and renders `MilestoneEmail` template with celebration header, Fred quote blockquote, and "What's Next" card. |
| 3 | Inactive users (7/14/30 days) receive graduated re-engagement emails that respect marketing preferences | VERIFIED | `getReEngagementCandidates()` in `lib/email/re-engagement/detector.ts` (119 lines) runs 3 batch queries, categorizes users into day7/day14/day30 tiers, checks `shouldSendEmail(userId, 're_engagement')` which maps to `notification_prefs.marketing`. Cron route at `app/api/cron/re-engagement/route.ts` (137 lines) processes candidates with `RE_ENGAGEMENT_MESSAGES` graduated messaging. Daily cron at `0 14 * * *`. Day30 has muted gray CTA and "no pressure" soft close. |
| 4 | All emails respect notification preference toggles in settings (email master, weekly, marketing) | VERIFIED | `shouldSendEmail()` in `lib/email/preferences.ts` (81 lines) reads `profiles.metadata.notification_prefs`, checks master `email` toggle then category-specific toggle via `EMAIL_CATEGORIES` mapping: `weekly_digest->weekly`, `milestone->email`, `re_engagement->marketing`. All three cron/trigger paths call `shouldSendEmail()` before sending. Settings page (`app/dashboard/settings/page.tsx`) has toggles for `email`, `weekly`, and `marketing` stored in `notification_prefs`. |
| 5 | Duplicate emails are prevented via idempotent tracking in email_sends table | VERIFIED | Migration `045_email_engagement.sql` creates `email_sends` table with `UNIQUE INDEX idx_email_sends_digest_unique ON email_sends(user_id, email_type, week_number, year) WHERE email_type = 'weekly_digest'`. Weekly digest cron checks for existing send record at lines 112-130. Milestone triggers check 24h idempotency window. Re-engagement detector checks 14-day cooldown via batch query against `email_sends`. `sendEmail()` records every send in the table. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Lines | Details |
|----------|----------|--------|-------|---------|
| `lib/email/client.ts` | Resend SDK singleton | VERIFIED | 25 | Lazy-init `getResendClient()`, returns `Resend \| null` |
| `lib/email/send.ts` | Unified send with tracking | VERIFIED | 117 | Sends via Resend SDK, records in `email_sends`, never throws |
| `lib/email/types.ts` | Shared type definitions | VERIFIED | 42 | `EmailCategory`, `EmailSendResult`, `DigestData`, `DigestStats`, `DigestHighlight` |
| `lib/email/constants.ts` | Category-to-pref mapping | VERIFIED | 27 | `EMAIL_CATEGORIES`, `DIGEST_SKIP_THRESHOLD`, `RE_ENGAGEMENT_DAYS`, `BATCH_SIZE` |
| `lib/email/preferences.ts` | Preference checker | VERIFIED | 81 | Reads `profiles.metadata.notification_prefs`, checks master + category toggles |
| `lib/email/templates/layout.tsx` | Sahara branded layout | VERIFIED | 96 | React Email component with brand header, content card, settings footer link |
| `lib/email/templates/weekly-digest.tsx` | Weekly digest template | VERIFIED | 154 | Stats grid (4 stat boxes), highlights list, red flag warning, CTA button |
| `lib/email/digest/data.ts` | Digest data aggregation | VERIFIED | 171 | Parallel queries against 5 tables, returns null for zero activity, builds highlights |
| `lib/email/milestones/types.ts` | Milestone types + messages | VERIFIED | 72 | 7 MilestoneTypes, MILESTONE_MESSAGES with titles, descriptions, next suggestions |
| `lib/email/milestones/triggers.ts` | Milestone email trigger | VERIFIED | 123 | `sendMilestoneEmail()` with preference check, 24h idempotency, Fred quote, never throws |
| `lib/email/templates/milestone.tsx` | Milestone email template | VERIFIED | 122 | Celebration header, greeting, Fred quote blockquote, "What's Next" card, CTA |
| `lib/email/re-engagement/types.ts` | Re-engagement types | VERIFIED | 51 | 3 tiers (day7/day14/day30), graduated messages with subjects and highlights |
| `lib/email/re-engagement/detector.ts` | Inactive user detector | VERIFIED | 119 | 3 batch queries, tier categorization, 14-day cooldown, preference check per candidate |
| `lib/email/templates/re-engagement.tsx` | Re-engagement template | VERIFIED | 105 | Tier-specific preview text, Fred message, feature highlight card, muted day30 CTA |
| `app/api/cron/weekly-digest/route.ts` | Weekly digest cron | VERIFIED | 206 | CRON_SECRET auth, RESEND_API_KEY check, preference + idempotency + activity checks |
| `app/api/cron/re-engagement/route.ts` | Re-engagement cron | VERIFIED | 137 | CRON_SECRET auth, RESEND_API_KEY check, processes candidates, tracks counts |
| `lib/db/migrations/045_email_engagement.sql` | email_sends table | VERIFIED | 42 | CREATE TABLE, 4 indexes including unique digest constraint, RLS with 2 policies |
| `vercel.json` (crons) | Cron schedule entries | VERIFIED | -- | `/api/cron/weekly-digest` at `0 10 * * 1`, `/api/cron/re-engagement` at `0 14 * * *` |
| `package.json` (resend) | Resend SDK dependency | VERIFIED | -- | `resend: ^6.9.1` in dependencies |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/cron/weekly-digest/route.ts` | `lib/email/digest/data.ts` | `getDigestData()` call per user | WIRED | Import at line 24, called at line 133 |
| `app/api/cron/weekly-digest/route.ts` | `lib/email/preferences.ts` | `shouldSendEmail()` check | WIRED | Import at line 23, called at line 104 |
| `app/api/cron/weekly-digest/route.ts` | `lib/email/send.ts` | `sendEmail()` with React template | WIRED | Import at line 25, called at line 141 with `WeeklyDigest(digestData)` |
| `lib/email/send.ts` | `lib/email/client.ts` | `getResendClient()` for SDK | WIRED | Import at line 11, called at line 41 |
| `vercel.json` | weekly-digest cron route | cron schedule entry | WIRED | `/api/cron/weekly-digest` at `0 10 * * 1` |
| `app/api/journey/milestones/[id]/route.ts` | `lib/email/milestones/triggers.ts` | `sendMilestoneEmail()` fire-and-forget | WIRED | Import at line 4, called at line 182 with `.catch()` |
| `lib/email/milestones/triggers.ts` | `lib/email/send.ts` | `sendEmail()` | WIRED | Import at line 11, called at line 99 |
| `lib/email/milestones/triggers.ts` | `lib/fred-brain.ts` | `getRandomQuote()` dynamic import | WIRED | Dynamic import at line 77, called at line 78 |
| `app/api/cron/re-engagement/route.ts` | `lib/email/re-engagement/detector.ts` | `getReEngagementCandidates()` | WIRED | Import at line 14, called at line 58 |
| `app/api/cron/re-engagement/route.ts` | `lib/email/send.ts` | `sendEmail()` | WIRED | Import at line 17, called at line 78 |
| `vercel.json` | re-engagement cron route | daily cron schedule entry | WIRED | `/api/cron/re-engagement` at `0 14 * * *` |
| `lib/email/preferences.ts` | Settings page prefs | `profiles.metadata.notification_prefs` | WIRED | Settings page writes to `notification_prefs` (line 210), preferences.ts reads it (line 55-56) |

### Requirements Coverage

| Requirement | Status | Supporting Truth |
|-------------|--------|------------------|
| Weekly digest with activity summary | SATISFIED | Truth 1 |
| Milestone celebration with Fred quote | SATISFIED | Truth 2 |
| Graduated re-engagement (7/14/30 days) | SATISFIED | Truth 3 |
| Preference toggles respected | SATISFIED | Truth 4 |
| Idempotent email tracking | SATISFIED | Truth 5 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | -- | -- | -- | -- |

No TODO, FIXME, placeholder, stub, or empty implementation patterns were found in any of the 17 phase 31 artifacts.

### Human Verification Required

### 1. Email Rendering Fidelity
**Test:** Send a test weekly digest email to a real inbox and verify it renders correctly in Gmail, Apple Mail, and Outlook.
**Expected:** Stats grid displays 4 colored boxes, highlights list is readable, CTA button works, footer "Manage email preferences" links to settings.
**Why human:** Email client rendering varies; inline styles may behave differently across clients. Programmatic verification cannot confirm visual fidelity.

### 2. End-to-End Cron Flow
**Test:** Trigger `/api/cron/weekly-digest` with a valid CRON_SECRET Bearer token for a user with real activity.
**Expected:** User receives a branded digest email with accurate activity counts matching their dashboard data.
**Why human:** Requires running Resend API with valid credentials, which needs RESEND_API_KEY configured and a verified sending domain.

### 3. Milestone Email on Completion
**Test:** PATCH `/api/journey/milestones/[id]` with `{"status": "completed"}` for a milestone belonging to a user with email enabled.
**Expected:** User receives a milestone celebration email with a Fred quote blockquote and a "What's Next" suggestion card within seconds.
**Why human:** Fire-and-forget pattern means the API response does not confirm email delivery; must check the inbox.

### Gaps Summary

No gaps found. All 5 observable truths are verified through artifact existence (Level 1), substantive implementation (Level 2 -- 1,690 total lines across 17 files with zero stub patterns), and complete wiring (Level 3 -- all 12 key links confirmed connected). The email engagement system has:

- **Infrastructure:** Resend SDK client, unified send function with tracking, preference checker, shared branded layout
- **Weekly Digest:** Data aggregation from 5 DB tables, React Email template with stats grid, cron route with Monday 10:00 UTC schedule
- **Milestone Celebrations:** Trigger wired into milestones API PATCH handler, template with Fred quotes, 24h idempotency
- **Re-engagement:** Batch inactive detection (3 queries), graduated day7/day14/day30 templates, daily cron, 14-day cooldown, marketing preference respect
- **Idempotency:** `email_sends` table with unique constraint for digests, time-window checks for milestones and re-engagement
- **Preferences:** Settings UI writes toggles, email system reads them via centralized `shouldSendEmail()` function

---

_Verified: 2026-02-07T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
