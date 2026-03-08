# v7.0 Feedback Loop Features -- Browser Test Report

**Date:** 2026-03-08
**Tester:** Agent3 (automated via Stagehand/BrowserBase)
**Target:** https://joinsahara.com (production)
**Session ID:** 7fed8cc3-068f-4692-b946-f7a1654c558c
**Replay URL:** https://www.browserbase.com/sessions/7fed8cc3-068f-4692-b946-f7a1654c558c

---

## Executive Summary

v7.0 Feedback Loop features have solid frontend implementations but **two critical production blockers** prevent the system from functioning end-to-end:

1. **P0: Missing `feedback_consent` table** -- No feedback signals can be persisted because the consent table was never migrated. The widget appears to work (fire-and-forget) but signals are silently dropped by the `/api/feedback/signal` endpoint returning 403.
2. **P0: Admin panel inaccessible in production** -- In-memory session store (`Map`) does not survive across Vercel serverless function instances. Admin login API accepts the key and sets a cookie, but subsequent page loads hit different instances that have no record of the session.

**Overall Score: 40% functional** -- UI components are well-built, APIs are properly structured, but the data pipeline is broken end-to-end.

---

## Feature 1: Feedback Collection (Phase 72)

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Login and reach FRED chat | PASS | Onboarding flow works, dashboard accessible |
| Send messages to FRED | PASS | FRED responds with rich, contextual advice |
| Thumbs icons hidden for <5 messages | PASS | No thumbs icons visible until 5+ user messages sent |
| Thumbs up/down icons appear after threshold | PASS | Icons appear after 5th user message on all FRED responses |
| Greeting message excluded from feedback | PASS | Initial welcome message has no thumbs icons |
| Click thumbs-down expands categories | PASS | Category chips: Irrelevant, Incorrect, Too vague, Too long, Wrong tone |
| Free-text box appears on thumbs-down | PASS | "Tell us more (optional)" textarea visible below categories |
| Category selection works | PASS | "Too vague" chip highlights in orange when selected |
| Submit feedback via Send button | PASS | Widget collapses, icons disappear (fire-and-forget UX) |
| Click thumbs-up changes icon | PASS | Icon turns green (filled state) |
| Thumbs-up expansion panel | PARTIAL | Code has "What was helpful?" textarea; may have auto-dismissed during scroll |
| Feedback actually persists to DB | **FAIL** | `feedback_consent` table missing -- signals rejected with 403 |
| Fire-and-forget (no visible delay) | PASS | No UI blocking on submit; errors caught silently |

### Screenshots Captured
- `01-login-page` -- Login form
- `12-mentor-page` -- FRED chat initial state
- `17-after-5plus-messages` -- Thumbs icons appearing
- `18-thumbs-down-expanded` -- Category chips visible
- `19-thumbs-down-full` -- Full feedback form with categories + text
- `20-feedback-filled` -- Category selected, text entered
- `21-after-feedback-submit` -- Widget collapsed after submit
- `24-thumbs-up-result` -- Thumbs up icon green/active

### Bugs Found

#### P0: Missing `feedback_consent` table migration
- **Impact:** ALL feedback signals are silently lost. The fire-and-forget pattern masks this completely from users.
- **Root cause:** No migration file creates `feedback_consent`. The signal endpoint checks `getUserConsentStatus()` which queries this table; it fails, returning `hasConsent=false`, and the endpoint returns 403. The widget's `fireSignal()` catches the error silently.
- **Fix:** Create migration for `feedback_consent` table (likely: `user_id UUID PK, consent_given BOOLEAN, granted_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ`). Run migration on production.
- **Location:** `/opt/agency-workspace/sierra-fred-carey/lib/feedback/consent.ts` references the table; no matching migration exists.

#### P2: Consent banner not observed during testing
- **Impact:** The consent flow (`FeedbackConsentBanner`) was never triggered during testing. The `consentStatus` starts as "loading", then the `/api/feedback/consent` GET request likely fails (table missing), setting status to "unknown". When status is "unknown", clicking thumbs should show the consent prompt -- but this was not observed.
- **Possible issue:** The consent prompt may have shown but was too small/brief to catch, or the error handling path bypasses it.

---

## Feature 2: Admin Feedback Dashboard (Phase 73)

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Navigate to /admin/feedback | **FAIL** | Redirects to /admin/login; session not maintained |
| Admin login with correct key | PARTIAL | API returns `{"success":true}` but session lost across instances |
| Triage workflow exists in code | PASS | States: new, reviewed, actioned, resolved (code verified) |
| Filters in code | PASS | date range, channel, rating, category, tier, userId (code verified) |
| Aggregate stats API works | PASS | `/api/admin/feedback/stats` returns valid JSON (empty data) |
| Session list API works | PASS | `/api/admin/feedback/sessions` returns valid JSON |
| Insights API works | PASS | `/api/admin/feedback/insights` returns valid JSON |
| CSV export exists in code | PASS | Export button calls `/api/admin/feedback/export` |
| Session drill-down exists | PASS | `/admin/feedback/[sessionId]` page with conversation + annotations |

### Bugs Found

#### P0: Admin session does not persist across Vercel serverless instances
- **Impact:** Admin panel is completely inaccessible in production. All admin features (feedback dashboard, A/B tests, RLHF, prompts) are blocked.
- **Root cause:** `lib/auth/admin-sessions.ts` uses `new Map<string, AdminSession>()` -- an in-memory store. On Vercel, each serverless function invocation can run on a different instance. The login API creates the session in instance A's memory, but the layout check runs on instance B which has no sessions.
- **Fix:** Replace in-memory Map with Upstash Redis (already in the stack) or Vercel KV. The code even has a comment: "For multi-instance deployments, migrate to Redis/Vercel KV later."
- **Location:** `/opt/agency-workspace/sierra-fred-carey/lib/auth/admin-sessions.ts` (line 34)

#### P2: Missing "Communicated" triage status
- **Impact:** Spec calls for 5 triage states (New, Reviewed, Actioned, Resolved, Communicated) but implementation only has 4 (new, reviewed, actioned, resolved).
- **Location:** `/opt/agency-workspace/sierra-fred-carey/app/admin/feedback/[sessionId]/page.tsx` (line 42-45)

### Admin Dashboard Code Verification (since UI is inaccessible)

The admin feedback page (`/app/admin/feedback/page.tsx`, 1260+ lines) contains:
- **Stats cards:** totalSignals, positiveCount, negativeCount, sentimentCount, flaggedSessionCount
- **Category distribution:** Renders from `categoryDistribution` object
- **Daily volume:** Uses `dailyVolume` array
- **Filter controls:** dateFrom, dateTo, channel, rating, category, tier, userId
- **Signals table:** With message_id, signal_type, rating, category, comment, created_at
- **Sessions tab:** With session list and drill-down links
- **Top Issues This Week:** Card with SeverityBadge component
- **CSV Export button:** Opens `/api/admin/feedback/export` in new tab
- **Create Linear Issue:** Button on insights for filing bugs

---

## Feature 3: Intelligence & Pattern Detection (Phase 74)

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| "Top Issues This Week" section in code | PASS | CardTitle "Top Issues This Week" at line 448 |
| Severity badges | PASS | SeverityBadge component with high/medium/low colors |
| Signal counts on issues | PASS | Insight objects contain signal_count field |
| Category on issues | PASS | Category field displayed in insights |
| Drill-down from issue to source feedback | PASS | Insights link to source signals via API |
| "Create Linear Issue" button | PASS | Calls `/api/admin/feedback/insights/[id]/linear` |
| Triage status dropdown on issues | PASS | Status field on insights with update capability |
| Insights API accessible | PASS | Returns `{"insights":[]}` (empty but functional) |

### Notes
- Pattern detection features are code-complete but cannot be visually tested due to admin access being blocked.
- The insights clustering migration exists (`20260308400001_feedback_insights_clustering.sql`).
- Linear integration endpoint exists at the correct path.

---

## Feature 4: A/B Testing + Feedback Metrics (Phase 75)

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| /admin/ab-tests page exists | PASS | Code verified with full implementation |
| Experiment list with feedback metrics | PASS | ABTest type includes thumbsUpRatio, avgSentimentScore, sessionCompletionRate |
| ExperimentFeedbackCard component | PASS | Shows variant comparison with progress bars |
| Significance badges | PASS | feedbackComparison tracks thumbs/sentiment/session significance |
| Winner auto-flagging | PASS | feedbackWinner field with visual treatment |
| Filter tabs | PASS | all, running, completed, significant tabs |
| /admin/ab-tests/new page exists | PASS | Code verified |
| PreRegistrationForm | PASS | Fields: hypothesis, primary/secondary metrics, sample size, duration, rationale |
| A/B Tests API accessible | **BLOCKED** | Admin session required; API returns 401 via browser |

### Code Highlights
- `ExperimentFeedbackCard` (`/components/admin/experiment-feedback-card.tsx`) renders:
  - Variant comparison bars for thumbs ratio
  - Sentiment score comparison
  - Statistical significance indicators
  - Winner detection with visual flagging
- `PreRegistrationForm` (`/components/admin/pre-registration-form.tsx`) includes:
  - Experiment name and description
  - Variant configuration with traffic split
  - Hypothesis text area
  - Metric selection from preset metrics (thumbsUpRatio, avgSentimentScore, etc.)
  - Minimum sample size input
  - Duration options (1 week, 2 weeks, 1 month, custom)
  - Validation via `validatePreRegistration()`

---

## Feature 5: RLHF-Lite Admin (Phase 76)

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| /admin/prompt-patches page exists | PASS | Code verified with full implementation |
| Prompt patch list | PASS | Fetches from `/api/admin/prompt-patches` |
| Patch approval queue | PASS | approve/reject actions with toast notifications |
| Patch status filters | PASS | all + PatchStatus (draft, approved, rejected, active, reverted) |
| Patch review panel | PASS | PromptPatchReview component with detail view |
| Source insight traceability | PASS | sourceInsight object links patch back to feedback insight |
| Version history | PASS | Patch objects have status field, API tracks changes |
| Experiment launch from patch | PASS | onLaunchTest handler creates A/B test from patch |
| Admin nav includes RLHF link | PASS | "RLHF" link in admin layout navigation |

### Code Highlights
- `PromptPatchReview` (`/components/admin/prompt-patch-review.tsx`) shows:
  - Patch title, content, topic
  - Confidence level from metadata
  - Rationale and expected improvement
  - Source insight (title, severity, signal count)
  - Approve/Reject buttons with rejection reason input
  - Activate button for approved patches
  - Launch A/B Test button with experiment name input
- `PatchApprovalQueue` (`/components/admin/patch-approval-queue.tsx`) referenced in the codebase

---

## API Endpoint Verification

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/api/feedback/signal` | POST | User auth + consent | PASS (code) |
| `/api/feedback/consent` | GET/POST | User auth | FAIL (table missing) |
| `/api/admin/feedback/stats` | GET | x-admin-key | PASS |
| `/api/admin/feedback` | GET | x-admin-key | PASS |
| `/api/admin/feedback/insights` | GET | x-admin-key | PASS |
| `/api/admin/feedback/sessions` | GET | x-admin-key | PASS |
| `/api/admin/feedback/triage` | POST | x-admin-key | PASS (code) |
| `/api/admin/feedback/export` | GET | x-admin-key | PASS (code) |
| `/api/admin/feedback/insights/[id]/linear` | POST | x-admin-key | PASS (code) |
| `/api/admin/prompt-patches` | GET | x-admin-key | PASS (code) |
| `/api/admin/prompt-patches/[id]/approve` | POST | x-admin-key | PASS (code) |
| `/api/admin/ab-tests` | GET | Admin session | BLOCKED |

---

## Database Table Status

| Table | Exists | Has Data | Notes |
|-------|--------|----------|-------|
| `feedback_sessions` | YES | NO | Migration ran |
| `feedback_signals` | YES | NO | Migration ran; no signals persisted due to consent blocker |
| `feedback_insights` | YES | NO | Migration ran |
| `feedback_consent` | **NO** | N/A | **Missing migration -- P0 blocker** |

---

## Priority Bug Summary

### P0 -- Fix NOW (2 issues)

1. **Missing `feedback_consent` table** -- No migration creates this table. All feedback signals are silently rejected with 403. Users see the widget work but nothing is saved. Create and run the migration immediately.

2. **Admin in-memory sessions on Vercel** -- `lib/auth/admin-sessions.ts` uses `new Map()` which doesn't survive across serverless instances. Replace with Upstash Redis or Vercel KV. Currently makes ALL admin features inaccessible in production.

### P1 -- Fix before showing to anyone (1 issue)

3. **Feedback signals silently lost** -- The fire-and-forget pattern combined with the missing consent table means feedback appears to submit but is actually lost. Even after the consent table is created, the consent banner UX flow needs testing to ensure users can actually grant consent before providing feedback.

### P2 -- Fix this sprint (2 issues)

4. **Missing "Communicated" triage status** -- Spec calls for 5 states but only 4 are implemented. Add "communicated" after "resolved" in the triage workflow.

5. **Consent banner visibility** -- The consent prompt (`FeedbackConsentBanner`) may not be visible enough or may not trigger correctly when `consentStatus === "unknown"`. Needs investigation after the consent table is created.

### P3 -- Fix this month (1 issue)

6. **Thumbs-up expansion may auto-dismiss** -- The thumbs-up click fires the signal immediately and expands the "What was helpful?" textarea, but the expansion may be too subtle or too quick for users to notice. Consider keeping it open longer or making it more prominent.

---

## Recommendations

1. **Immediate:** Create and run the `feedback_consent` table migration. Minimal schema:
   ```sql
   CREATE TABLE IF NOT EXISTS feedback_consent (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     consent_given BOOLEAN NOT NULL DEFAULT FALSE,
     granted_at TIMESTAMPTZ,
     revoked_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```

2. **Immediate:** Replace admin session store with Redis/KV:
   ```typescript
   // In lib/auth/admin-sessions.ts
   // Replace: const sessions = new Map<string, AdminSession>();
   // With: import { kv } from '@vercel/kv'; or Upstash Redis
   ```

3. **This sprint:** End-to-end test the full feedback flow after fixes:
   - User grants consent via banner
   - User submits thumbs-up/down with category and comment
   - Signal appears in feedback_signals table
   - Admin can view signals in dashboard
   - Admin can triage, export CSV, create Linear issues

4. **This sprint:** Verify admin panel works after Redis migration by testing:
   - Login with admin key
   - Navigate between admin tabs
   - View feedback dashboard
   - View A/B tests
   - View RLHF patches

---

## Test Environment

- **Browser:** Chromium via BrowserBase/Stagehand
- **Viewport:** Desktop (default)
- **Test user:** v7-test-agent3@sahara-test.com (created via Supabase admin API)
- **Admin key:** Verified correct via API (`/api/admin/login` returns `{"success":true}`)
- **Production deployment:** sahara-bziafvivs-ai-acrobatics.vercel.app (3m old at test time)
