# Phase 31: Email Engagement - Research

**Researched:** 2026-02-07
**Domain:** Transactional email, weekly digests, milestone notifications, re-engagement campaigns
**Confidence:** HIGH

## Summary

Phase 31 adds three email engagement capabilities to Sahara: (1) a weekly digest summarizing founder activity, (2) milestone celebration emails triggered when founders achieve key goals, and (3) re-engagement emails for inactive users. The codebase already has significant infrastructure for this phase: Resend env vars are defined, `@react-email/components` and `@react-email/render` are installed as dependencies, an existing `lib/notifications/email.ts` sends HTML emails via raw `fetch()` to the Resend API, a Vercel cron job pattern exists for weekly SMS check-ins, and notification preferences (email, weekly digest) already have UI toggles in the settings page.

The recommended approach is to install the official `resend` SDK (v6.9.x) to replace the raw `fetch()` pattern, create React Email component templates for each email type, build a cron-triggered API route for weekly digests (paralleling the existing weekly-checkin cron pattern), add event-driven milestone emails triggered from existing database operations, and implement a re-engagement system that detects inactive users and sends a graduated nudge sequence.

**Primary recommendation:** Use the official Resend SDK with React Email component templates, follow the existing cron job pattern from `api/cron/weekly-checkin`, and leverage existing database tables (`journey_events`, `milestones`, `agent_tasks`, `fred_red_flags`, `fred_episodic_memory`) as data sources for digest content. Store email preferences in `profiles.metadata.notification_prefs` (already partially implemented in settings UI) and add an `email_engagement_log` table for tracking sends and preventing duplicates.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | ^6.9.1 | Email sending SDK | Official Resend Node.js SDK; replaces raw fetch(); supports `react` parameter, batch sending, tags |
| `@react-email/components` | 1.0.2 | Email template components | Already installed; provides `Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Button`, `Hr`, `Img`, `Link`, `Preview` |
| `@react-email/render` | 2.0.0 | Render React components to HTML | Already installed; converts React Email components to HTML string |
| `react-email` | 5.1.0 | Email development server | Already installed; enables local email template preview |
| `date-fns` | 3.6.0 | Date formatting and calculations | Already installed; used in weekly check-in scheduler for ISO week calculations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pino` | 10.3.0 | Structured logging | Already installed; use for email send logging with correlation IDs |
| `posthog-node` | 5.24.11 | Server-side analytics | Already installed; track email engagement events server-side |
| `zod` | 4.3.6 | Validation | Already installed; validate email preferences payloads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resend` SDK | Raw `fetch()` to Resend API | Current approach works but SDK gives type safety, batch API, error handling, and React component support via `react` param |
| React Email components | Raw HTML strings | Current `lib/notifications/email.ts` uses raw HTML; React Email is already installed and gives better maintainability, component reuse |
| Vercel Cron | External scheduler (Inngest, Trigger.dev) | Vercel Cron already proven with weekly-checkin; no need for external service for weekly cadence |

**Installation:**
```bash
npm install resend
```

Note: `@react-email/components`, `@react-email/render`, `react-email`, `date-fns`, and all other dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  email/
    client.ts              # Resend client singleton
    send.ts                # Unified send function with error handling + logging
    templates/
      weekly-digest.tsx    # Weekly digest React Email template
      milestone.tsx        # Milestone celebration template
      re-engagement.tsx    # Re-engagement nudge template
      layout.tsx           # Shared base layout (header, footer, unsubscribe)
    digest/
      data.ts              # Aggregate digest data from DB tables
      types.ts             # Digest data types
    milestones/
      triggers.ts          # Milestone detection logic
      types.ts             # Milestone email types
    re-engagement/
      detector.ts          # Inactive user detection
      types.ts             # Re-engagement types
    preferences.ts         # Email preference read/write (extends existing)
    constants.ts           # Email categories, timing constants

app/api/
  cron/
    weekly-digest/
      route.ts             # Cron endpoint for weekly digest emails
    re-engagement/
      route.ts             # Cron endpoint for re-engagement checks

lib/db/migrations/
    044_email_engagement.sql  # email_sends table, email preferences columns
```

### Pattern 1: Resend SDK Client Singleton
**What:** Lazy-initialized Resend client following the project's existing singleton patterns (PostHog, Supabase)
**When to use:** All email sending operations
**Example:**
```typescript
// lib/email/client.ts
import { Resend } from 'resend';

let _client: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (_client) return _client;
  _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}
```

### Pattern 2: React Email Template with Shared Layout
**What:** Component-based email templates using React Email components, with a shared base layout
**When to use:** All email types
**Example:**
```tsx
// lib/email/templates/layout.tsx
import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components';

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
  unsubscribeUrl: string;
}

export function EmailLayout({ previewText, children, unsubscribeUrl }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: '-apple-system, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 0' }}>
          {/* Sahara branding header */}
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '40px' }}>
            {children}
          </Section>
          <Section style={{ textAlign: 'center', padding: '24px' }}>
            <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
              <Link href={unsubscribeUrl}>Manage email preferences</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Pattern 3: Cron Route with CRON_SECRET Auth (Existing Pattern)
**What:** Vercel Cron-triggered API route protected by Bearer token authentication
**When to use:** Weekly digest and re-engagement cron jobs
**Example:**
```typescript
// Follows exact pattern from app/api/cron/weekly-checkin/route.ts
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... dispatch emails
}
```

### Pattern 4: Idempotent Email Dispatch
**What:** Track sent emails in DB to prevent duplicates (same pattern as SMS weekly check-in)
**When to use:** All cron-triggered email sends
**Example:**
```typescript
// Check if digest already sent this week (mirrors SMS scheduler pattern)
const weekNumber = getISOWeek(now);
const year = getISOWeekYear(now);
const alreadySent = await checkEmailSent(userId, 'weekly_digest', weekNumber, year);
if (alreadySent) { skipped++; continue; }
```

### Pattern 5: Batch Send with Resend SDK
**What:** Use `resend.batch.send()` for bulk email operations (up to 100 per call)
**When to use:** Weekly digest dispatch to multiple users
**Example:**
```typescript
const resend = getResendClient();
// Chunk users into batches of 100
for (const batch of chunks(emailPayloads, 100)) {
  await resend.batch.send(batch);
}
```

### Anti-Patterns to Avoid
- **Don't send all emails synchronously in a loop:** Use `resend.batch.send()` for bulk operations, chunked into groups of 100
- **Don't store email HTML in the database:** Render templates at send time from current data
- **Don't skip idempotency checks:** The weekly digest cron could fire multiple times; always check the `email_sends` table first
- **Don't mix promotional content into transactional emails:** Keep milestone congratulations purely informational to avoid CAN-SPAM issues
- **Don't hardcode email styles:** Use the shared layout component for consistent Sahara branding

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Raw `fetch()` to Resend API | `resend` SDK | Type safety, batch API, error types, React component support |
| Email HTML templates | Template string concatenation | `@react-email/components` + `@react-email/render` | Components are already installed; reusable, testable, preview-able |
| Email rendering | Custom JSX-to-HTML | `@react-email/render` `render()` function | Handles email client quirks, inlining, compatibility |
| Date/week calculations | Manual date math | `date-fns` `getISOWeek`, `getISOWeekYear`, `differenceInDays` | Already used in SMS scheduler; handles edge cases |
| Cron scheduling | Custom scheduler | Vercel Cron in `vercel.json` | Already proven with weekly-checkin cron; managed by platform |
| Email preferences storage | New preferences table | Existing `profiles.metadata.notification_prefs` | Settings UI already reads/writes this; has email, weekly, marketing toggles |
| User activity data | New activity tracking | Existing `journey_events`, `milestones`, `agent_tasks`, `fred_red_flags` tables | All activity is already tracked in these tables |
| Structured logging | `console.log` | `lib/logger` (Pino) | Already established; provides JSON structured output in production |

**Key insight:** The codebase already has 80% of the infrastructure needed. The main work is creating React Email templates, building digest data aggregation queries, and adding cron routes. The existing SMS weekly check-in pattern (`lib/sms/scheduler.ts` + `app/api/cron/weekly-checkin/route.ts`) is the exact blueprint to follow.

## Common Pitfalls

### Pitfall 1: Vercel Cron Timeout
**What goes wrong:** Weekly digest cron tries to send emails to all users in one invocation and exceeds Vercel's function timeout (10s default, 60s max on Pro)
**Why it happens:** Large user base + sequential email rendering + batch API calls
**How to avoid:** Process users in batches, use `resend.batch.send()` (up to 100 per call), set reasonable function timeout in vercel.json, and consider splitting into multiple cron invocations if user count grows
**Warning signs:** Cron logs show timeout errors, some users don't receive digest

### Pitfall 2: Email Preference Desync
**What goes wrong:** Users opt out of emails but still receive them, or preferences aren't checked before sending
**Why it happens:** The settings page stores prefs in `profiles.metadata.notification_prefs` but the email send logic doesn't check them
**How to avoid:** Always read `notification_prefs.email` and `notification_prefs.weekly` before sending. Create a centralized `shouldSendEmail(userId, category)` function
**Warning signs:** User complaints about unwanted emails, CAN-SPAM violations

### Pitfall 3: Missing Resend API Key Crashes
**What goes wrong:** Email cron route throws unhandled exception when `RESEND_API_KEY` is not set
**Why it happens:** Resend SDK initialization fails without API key
**How to avoid:** Follow the existing notification pattern: check for API key first, return early with a 503 status and clear error message (see `app/api/cron/weekly-checkin/route.ts` for Twilio check pattern)
**Warning signs:** 500 errors on cron endpoint, Sentry alerts

### Pitfall 4: Duplicate Emails on Cron Retry
**What goes wrong:** Vercel Cron retries a timed-out request, and users get the same digest email twice
**Why it happens:** No idempotency tracking; cron endpoint doesn't record which users were already processed
**How to avoid:** Create an `email_sends` table with `(user_id, email_type, week_number, year)` unique constraint, check before sending (same pattern as `lib/sms/scheduler.ts` idempotency check)
**Warning signs:** Users report duplicate emails, `email_sends` table shows multiple records per user per week

### Pitfall 5: Empty Digest Content
**What goes wrong:** User receives a weekly digest with no content because they had zero activity
**Why it happens:** No minimum activity threshold check before sending
**How to avoid:** Query activity data first; skip users with zero events in the digest period. Send a "We miss you" re-engagement email instead (different template)
**Warning signs:** Low engagement rates, high unsubscribe rates

### Pitfall 6: Email Deliverability Issues
**What goes wrong:** Emails land in spam or are rejected by email providers
**Why it happens:** Domain not verified in Resend, missing SPF/DKIM records, no List-Unsubscribe header
**How to avoid:** Ensure domain is verified in Resend dashboard. For bulk/promotional emails (digests, re-engagement), include List-Unsubscribe header. Resend handles this when using the SDK's `headers` option
**Warning signs:** Low open rates, bounce backs, spam reports

## Code Examples

Verified patterns from official sources and existing codebase:

### Resend SDK Send with React Email Template
```typescript
// Source: https://resend.com/docs/send-with-nextjs
import { Resend } from 'resend';
import { WeeklyDigest } from '@/lib/email/templates/weekly-digest';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
  to: [userEmail],
  subject: 'Your Weekly Sahara Digest',
  react: WeeklyDigest({ founderName, stats, milestones, redFlags }),
  tags: [
    { name: 'category', value: 'weekly_digest' },
    { name: 'user_id', value: userId },
  ],
});
```

### Resend Batch Send
```typescript
// Source: https://resend.com/docs/api-reference/emails/send-batch-emails
// Batch sends up to 100 emails per request
const emails = users.map(user => ({
  from: `Sahara <${process.env.RESEND_FROM_EMAIL}>`,
  to: [user.email],
  subject: 'Your Weekly Sahara Digest',
  react: WeeklyDigest({ ...user.digestData }),
  tags: [
    { name: 'category', value: 'weekly_digest' },
    { name: 'user_id', value: user.id },
  ],
}));

// Chunk into batches of 100
for (let i = 0; i < emails.length; i += 100) {
  const batch = emails.slice(i, i + 100);
  const { data, error } = await resend.batch.send(batch);
  if (error) logger.error('Batch send error', { error, batchIndex: i });
}
```

### Digest Data Aggregation (Using Existing Tables)
```typescript
// Query weekly activity from existing tables
async function getDigestData(userId: string, since: Date) {
  const supabase = createServiceClient();

  const [milestones, journeyEvents, redFlags, agentTasks, conversations] = await Promise.all([
    supabase.from('milestones').select('*')
      .eq('user_id', userId)
      .gte('updated_at', since.toISOString())
      .in('status', ['completed', 'in_progress']),

    supabase.from('journey_events').select('*')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),

    supabase.from('fred_red_flags').select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase.from('agent_tasks').select('*')
      .eq('user_id', userId)
      .gte('updated_at', since.toISOString())
      .eq('status', 'completed'),

    supabase.from('fred_episodic_memory').select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_type', 'conversation')
      .gte('created_at', since.toISOString()),
  ]);

  return { milestones, journeyEvents, redFlags, agentTasks, conversationCount: conversations.count };
}
```

### Weekly Digest React Email Template
```tsx
// lib/email/templates/weekly-digest.tsx
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from './layout';

interface WeeklyDigestProps {
  founderName: string;
  weekOf: string;
  stats: {
    conversationCount: number;
    completedMilestones: number;
    completedTasks: number;
    activeRedFlags: number;
  };
  highlights: Array<{ title: string; description: string }>;
  appUrl: string;
  unsubscribeUrl: string;
}

export function WeeklyDigest(props: WeeklyDigestProps) {
  return (
    <EmailLayout
      previewText={`Your Sahara weekly digest - Week of ${props.weekOf}`}
      unsubscribeUrl={props.unsubscribeUrl}
    >
      <Text>Hey {props.founderName},</Text>
      <Text>Here is your weekly progress summary from Sahara:</Text>
      {/* Stats grid, highlights list, CTA button */}
      <Button href={`${props.appUrl}/dashboard`}>View Your Dashboard</Button>
    </EmailLayout>
  );
}
```

### Inactive User Detection
```typescript
// Detect users inactive for N days using existing auth data
async function getInactiveUsers(inactiveDays: number): Promise<string[]> {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString();

  // Users who haven't had any journey events or conversations since cutoff
  // and haven't received a re-engagement email recently
  const { data: activeUserIds } = await supabase
    .from('journey_events')
    .select('user_id')
    .gte('created_at', cutoff);

  const activeSet = new Set((activeUserIds || []).map(r => r.user_id));

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, email, name')
    .eq('onboarding_completed', true);

  return (allUsers || [])
    .filter(u => !activeSet.has(u.id))
    .filter(u => u.email);
}
```

### Cron Route Pattern (Following Existing weekly-checkin Pattern)
```typescript
// app/api/cron/weekly-digest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 second timeout for batch processing

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('[Cron: Weekly Digest] Starting scheduled dispatch');

  // 1. Verify CRON_SECRET (same as weekly-checkin)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check Resend is configured
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 503 });
  }

  // 3. Get opted-in users, aggregate data, send batches
  // 4. Return summary
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw HTML email strings | React Email components | 2023+ | Reusable, type-safe, previewable email templates |
| Raw `fetch()` to email API | Official Resend SDK with `react` param | Resend SDK v1+ (2023) | Type safety, batch API, scheduled sends, tags |
| Single email sends in loops | `resend.batch.send()` (up to 100/call) | Resend batch API | Faster bulk sends, fewer API calls |
| Manual HTML rendering | `@react-email/render` `render()` | React Email 2.0 | Automatic email client compatibility |

**Deprecated/outdated in this codebase:**
- `lib/notifications/email.ts` uses raw `fetch()` to Resend API instead of the SDK. The new email engagement system should use the SDK. The existing file can remain for backward compatibility with the A/B testing notification system.

## Data Sources for Digest Content

The following existing database tables provide all the data needed for weekly digest emails:

| Table | Data for Digest | Query Pattern |
|-------|----------------|---------------|
| `profiles` | Founder name, email, company, tier, notification preferences | `SELECT name, email, metadata FROM profiles WHERE id = $1` |
| `milestones` | Completed/in-progress milestones this week | `WHERE user_id = $1 AND updated_at >= $2 AND status IN ('completed', 'in_progress')` |
| `journey_events` | Timeline events, score changes | `WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT 10` |
| `fred_red_flags` | Active risk alerts | `WHERE user_id = $1 AND status = 'active'` |
| `agent_tasks` | Completed agent tasks this week | `WHERE user_id = $1 AND status = 'completed' AND updated_at >= $2` |
| `fred_episodic_memory` | Conversation count | `WHERE user_id = $1 AND event_type = 'conversation' AND created_at >= $2` (count only) |
| `investor_readiness_scores` | Latest readiness score | `WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1` |
| `pitch_reviews` | Pitch deck reviews this week | `WHERE user_id = $1 AND created_at >= $2` |

## Email Categories and Triggers

### 1. Weekly Digest (Cron-triggered)
- **Schedule:** Monday 10:00 AM UTC (new cron in vercel.json)
- **Gate:** `notification_prefs.weekly === true` (default: true, per settings UI)
- **Content:** Activity summary, milestone progress, red flag status, agent completions, FRED insight
- **Skip if:** Zero activity in period (send re-engagement instead)

### 2. Milestone Celebrations (Event-triggered)
- **Trigger:** When milestone status changes to 'completed' in `milestones` table
- **Gate:** `notification_prefs.email === true` (default: true)
- **Content:** Congratulations, milestone details, next suggested milestone, motivational Fred quote
- **Categories:** First chat, first Reality Lens, first pitch deck upload, 10 conversations, investor readiness score above threshold

### 3. Re-engagement (Cron-triggered)
- **Schedule:** Daily at 14:00 UTC (check for users inactive 7/14/30 days)
- **Gate:** `notification_prefs.email === true` AND haven't received re-engagement in last 14 days
- **Content:** Graduated sequence - Day 7: gentle reminder; Day 14: value highlight; Day 30: final nudge
- **Skip if:** User has unsubscribed from email notifications

## Database Migration

New table needed for idempotent email tracking:

```sql
-- Migration 044: Email engagement tracking
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'weekly_digest', 'milestone', 're-engagement'
  email_subtype TEXT,       -- e.g., 'milestone_first_chat', 're-engagement_day7'
  week_number INTEGER,      -- ISO week (for digest idempotency)
  year INTEGER,             -- ISO year (for digest idempotency)
  resend_id TEXT,           -- Resend message ID for tracking
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_sends_user_type ON email_sends(user_id, email_type);
CREATE INDEX idx_email_sends_week ON email_sends(user_id, email_type, week_number, year);
CREATE INDEX idx_email_sends_created ON email_sends(created_at);

-- Unique constraint for digest idempotency
CREATE UNIQUE INDEX idx_email_sends_digest_unique
  ON email_sends(user_id, email_type, week_number, year)
  WHERE email_type = 'weekly_digest';

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_sends_select_own ON email_sends FOR SELECT
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY email_sends_service_role ON email_sends FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

## Vercel Cron Configuration

Add to existing `vercel.json` crons array:

```json
{
  "crons": [
    { "path": "/api/cron/weekly-checkin", "schedule": "0 14 * * 1" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 10 * * 1" },
    { "path": "/api/cron/re-engagement", "schedule": "0 14 * * *" }
  ]
}
```

- Weekly digest: Monday 10:00 UTC (separate from SMS check-in at 14:00 UTC)
- Re-engagement: Daily at 14:00 UTC (lightweight check, only sends to qualifying users)

## Email Preference Integration

The settings page (`app/dashboard/settings/page.tsx`) already has toggles for:
- `notifications.email` - Email Notifications (master toggle)
- `notifications.weekly` - Weekly Digest
- `notifications.marketing` - Marketing Emails

These are stored in `profiles.metadata.notification_prefs`. The email system must respect these:
- `email === false` -> No emails at all (except critical account emails)
- `weekly === false` -> No weekly digest
- `marketing === false` -> No re-engagement emails (these are marketing/promotional)

## CAN-SPAM Compliance

| Email Type | Classification | Unsubscribe Required | Notes |
|------------|---------------|---------------------|-------|
| Weekly Digest | Marketing/Promotional | YES | Contains progress summaries, engagement content |
| Milestone | Transactional | NO (but recommended) | Directly related to user's account activity |
| Re-engagement | Marketing/Promotional | YES | Must include one-click unsubscribe |

All emails should include:
1. Link to `/dashboard/settings` for preference management
2. For marketing emails: physical address in footer (CAN-SPAM requirement)
3. Resend handles List-Unsubscribe headers automatically when using the SDK

## Open Questions

Things that could not be fully resolved:

1. **Resend Rate Limits on Free/Starter Plan**
   - What we know: Batch API supports 100 emails per call
   - What's unclear: Daily send limits vary by Resend plan (free: 100/day, starter: 5000/day)
   - Recommendation: Check Resend plan in use; if free tier, process users in daily chunks

2. **Domain Verification Status**
   - What we know: `RESEND_FROM_EMAIL` env var is defined but not set
   - What's unclear: Whether a sending domain has been verified in Resend dashboard
   - Recommendation: Document domain verification as a setup prerequisite; use Resend test domain (`onboarding@resend.dev`) for development

3. **Milestone Detection Approach**
   - What we know: Milestones are tracked in the `milestones` table with status changes
   - What's unclear: Whether to use DB triggers, webhook listeners, or polling for milestone completion detection
   - Recommendation: Use inline triggers in existing milestone update API routes (simplest, most reliable)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `lib/notifications/email.ts` - Current Resend integration pattern
- Existing codebase: `app/api/cron/weekly-checkin/route.ts` - Cron job pattern to follow
- Existing codebase: `lib/push/preferences.ts` - Notification preference pattern
- Existing codebase: `app/dashboard/settings/page.tsx` - Email preference UI (already built)
- Existing codebase: `lib/db/migrations/009_journey_tables.sql` - Data source tables
- Existing codebase: `package.json` - Confirms `@react-email/components` 1.0.2, `@react-email/render` 2.0.0, `react-email` 5.1.0 installed

### Secondary (MEDIUM confidence)
- [Resend Next.js docs](https://resend.com/docs/send-with-nextjs) - Official SDK usage with `react` parameter
- [Resend Batch API](https://resend.com/docs/api-reference/emails/send-batch-emails) - Batch send: 100 emails/request, no `scheduled_at` support
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) - Cron configuration and limits
- [React Email Components](https://react.email/components) - Available component catalog

### Tertiary (LOW confidence)
- [SaaS Re-engagement Email Strategies](https://userlist.com/blog/reengagement-emails-saas/) - Re-engagement timing patterns (7/14/30 day cadence)
- [CAN-SPAM FTC Guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) - Compliance requirements

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All core libraries already installed; Resend SDK is the official package
- Architecture: HIGH - Follows exact patterns from existing cron job, notifications, and preference systems
- Pitfalls: HIGH - Based on direct codebase analysis and known Vercel/Resend limitations
- Data sources: HIGH - All tables verified in existing migrations
- CAN-SPAM compliance: MEDIUM - Based on FTC guidelines; specific requirements may vary

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable stack, 30-day validity)
