---
phase: 84-daily-mentor-guidance
plan: 01
type: execute
wave: 3
depends_on: [78, 79]
files_modified:
  - lib/guidance/daily-agenda.ts
  - lib/guidance/types.ts
  - app/api/dashboard/daily-agenda/route.ts
  - components/dashboard/daily-agenda-widget.tsx
  - app/dashboard/page.tsx
  - lib/sms/daily-guidance.ts
  - app/api/cron/daily-guidance/route.ts
  - supabase/migrations/20260308_daily_agenda.sql
autonomous: true

must_haves:
  truths:
    - "Dashboard displays 'Today, accomplish these 3 things' widget with AI-generated tasks"
    - "Tasks are based on current Oases stage and recent chat history (not generic)"
    - "Tasks refresh daily and reflect the founder's actual situation"
    - "Task completion can be logged and feeds back into journey progress"
    - "Proactive SMS sends prescriptive daily guidance to founder's phone"
  artifacts:
    - path: "lib/guidance/daily-agenda.ts"
      provides: "AI-generated daily agenda engine"
      exports: ["generateDailyAgenda", "logTaskCompletion"]
    - path: "app/api/dashboard/daily-agenda/route.ts"
      provides: "Daily agenda API endpoint"
      exports: ["GET", "POST"]
    - path: "components/dashboard/daily-agenda-widget.tsx"
      provides: "Dashboard widget showing 3 daily tasks"
      exports: ["DailyAgendaWidget"]
    - path: "lib/sms/daily-guidance.ts"
      provides: "SMS delivery for daily guidance"
      exports: ["sendDailyGuidanceSMS"]
    - path: "app/api/cron/daily-guidance/route.ts"
      provides: "Cron endpoint for daily SMS delivery"
      exports: ["GET"]
  key_links:
    - from: "components/dashboard/daily-agenda-widget.tsx"
      to: "/api/dashboard/daily-agenda"
      via: "fetch GET on mount, POST on task completion"
      pattern: "fetch.*api/dashboard/daily-agenda"
    - from: "lib/guidance/daily-agenda.ts"
      to: "profiles.oases_stage + fred_memory"
      via: "reads stage + recent chat for personalization"
      pattern: "oases_stage|fred_memory"
    - from: "app/api/cron/daily-guidance/route.ts"
      to: "lib/sms/daily-guidance.ts"
      via: "cron triggers SMS delivery"
      pattern: "sendDailyGuidanceSMS"
---

<objective>
Build a Daily Mentor Guidance system where founders open their dashboard and see exactly what to do today. FRED tells them -- they don't have to ask. The same guidance is delivered via proactive SMS. Tasks are AI-generated based on the founder's Oases stage, recent chat history, and current challenges.

Purpose: Transform Sahara from reactive (user asks questions) to proactive (FRED tells you what to do). This is the "mentor" not "chatbot" shift.
Output: DailyAgenda engine + API + dashboard widget + SMS delivery + cron job
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/milestones/v8.0-go-live/ROADMAP.md
@.planning/STATE.md

# Dashboard -- widget will be added here
@app/dashboard/page.tsx

# SMS handler -- reference for SMS patterns
@lib/sms/fred-sms-handler.ts

# Chat context builder -- for founder context
@lib/fred/context-builder.ts

# Memory system
@lib/db/fred-memory.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Daily Agenda Engine + API + DB Schema</name>
  <files>
    lib/guidance/types.ts
    lib/guidance/daily-agenda.ts
    app/api/dashboard/daily-agenda/route.ts
    supabase/migrations/20260308_daily_agenda.sql
  </files>
  <action>
1. Create migration `supabase/migrations/20260308_daily_agenda.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS daily_agendas (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     date date NOT NULL DEFAULT CURRENT_DATE,
     tasks jsonb NOT NULL DEFAULT '[]',
     completed_tasks text[] DEFAULT '{}',
     oases_stage text,
     generated_at timestamptz DEFAULT now(),
     UNIQUE(user_id, date)
   );
   CREATE INDEX IF NOT EXISTS idx_daily_agendas_user_date ON daily_agendas(user_id, date DESC);
   ALTER TABLE daily_agendas ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users read own agendas" ON daily_agendas FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Service manages agendas" ON daily_agendas FOR ALL USING (true);
   ```

2. Create `lib/guidance/types.ts`:
   ```typescript
   export interface DailyTask {
     id: string          // uuid
     title: string       // "Interview 2 potential customers about X"
     description: string // Why this matters and how to do it
     priority: 'must-do' | 'should-do' | 'stretch'
     estimatedMinutes: number
     category: 'research' | 'build' | 'connect' | 'reflect' | 'document'
     completed: boolean
   }

   export interface DailyAgenda {
     date: string        // ISO date
     tasks: DailyTask[]
     stage: string       // Current Oases stage
     greeting: string    // "Good morning, Sarah. Here's your focus for today."
     completedCount: number
   }
   ```

3. Create `lib/guidance/daily-agenda.ts`:
   - Export `generateDailyAgenda(userId: string): Promise<DailyAgenda>`:
     - Check if today's agenda already exists in `daily_agendas` table -- if so, return cached
     - Load founder context: `buildFounderContextWithFacts(userId)` for name, stage, company, challenges
     - Load recent chat history: last 5 messages from `fred_memory` for topical relevance
     - Load oases_stage from profiles table
     - Call Vercel AI SDK `generateObject` with structured output:
       - System prompt: "You are Fred Cary generating today's 3 most impactful tasks for a founder. Tasks must be specific, actionable, and completable today. Use the mentor voice -- tell them what to do, don't ask."
       - Include founder context, stage, recent chat topics
       - Schema: array of 3 DailyTask objects
     - Compose greeting: "Good morning, {name}. You're in the {stage} stage. Here's your focus for today."
     - Store in daily_agendas table, return the agenda
   - Export `logTaskCompletion(userId: string, taskId: string): Promise<void>`:
     - Update `completed_tasks` array in daily_agendas for today
     - Fire-and-forget: also log a journey event via `logJourneyEventAsync`
   - Use `getModelForTier` with the user's tier for model selection

4. Create `app/api/dashboard/daily-agenda/route.ts`:
   - GET: calls `generateDailyAgenda(userId)`, returns the agenda JSON
   - POST: accepts `{ taskId: string }`, calls `logTaskCompletion(userId, taskId)`, returns `{ success: true }`
   - Both require auth via `requireAuth()`
   - GET is rate limited: 10/hour (agenda is cached, this is mostly re-fetches)
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - Migration SQL is valid
    - API route returns properly shaped DailyAgenda
  </verify>
  <done>
    - Daily agenda generates 3 AI-personalized tasks based on founder's stage and context
    - Agendas are cached per user per day (no re-generation on refresh)
    - Task completion is loggable and persisted
    - API is functional and rate-limited
  </done>
</task>

<task type="auto">
  <name>Task 2: Dashboard Widget + SMS Delivery</name>
  <files>
    components/dashboard/daily-agenda-widget.tsx
    app/dashboard/page.tsx
    lib/sms/daily-guidance.ts
    app/api/cron/daily-guidance/route.ts
  </files>
  <action>
1. Create `components/dashboard/daily-agenda-widget.tsx`:
   - Export `DailyAgendaWidget` component:
     - Fetches from `/api/dashboard/daily-agenda` on mount
     - Loading state: 3 skeleton cards
     - Displays greeting text at top in Sahara orange (#ff6a1a)
     - Shows 3 task cards, each with:
       - Checkbox (clicking marks task complete via POST to API)
       - Title (bold), description (muted text below)
       - Priority badge: must-do (orange), should-do (blue), stretch (gray)
       - Estimated time badge: "~15 min"
       - Category icon: research (magnifying glass), build (hammer), connect (users), reflect (brain), document (file)
     - Completed tasks show strikethrough + green checkmark
     - Progress indicator: "1/3 tasks completed today"
     - Celebrate on 3/3: confetti animation or "Great work today!" toast via sonner
   - Use shadcn/ui: Card, Badge, Checkbox, Skeleton
   - Framer Motion for task completion animation (scale down + green flash)

2. Modify `app/dashboard/page.tsx`:
   - Import `DailyAgendaWidget` from `@/components/dashboard/daily-agenda-widget`
   - Add it to the dashboard layout PROMINENTLY -- this should be the FIRST widget the user sees
   - Place it above the existing `FredHero` component or in a prominent top position
   - Wrap in `<FadeIn>` for entrance animation

3. Create `lib/sms/daily-guidance.ts`:
   - Export `sendDailyGuidanceSMS(userId: string, phone: string, agenda: DailyAgenda): Promise<void>`:
     - Formats the 3 tasks into SMS-friendly format (max 480 chars / 3 segments):
       ```
       Good morning {name}! Your FRED mentor tasks for today:
       1. {task1.title}
       2. {task2.title}
       3. {task3.title}
       Open Sahara to see details: {appUrl}/dashboard
       ```
     - Uses `sendSMS` from `@/lib/sms/client` (existing Twilio integration)
   - Export `getEligibleUsersForSMS(): Promise<{ userId: string, phone: string }[]>`:
     - Queries profiles for users with `sms_notifications_enabled = true` and non-null phone
     - Filters to Pro+ tier (SMS guidance is a paid feature)

4. Create `app/api/cron/daily-guidance/route.ts`:
   - GET endpoint (Vercel Cron compatible -- add `export const dynamic = 'force-dynamic'`)
   - Protected by `CRON_SECRET` env var check (standard Vercel cron pattern)
   - Fetches all eligible users via `getEligibleUsersForSMS()`
   - For each user: generates daily agenda, sends SMS
   - Process in batches of 10 to avoid rate limits
   - Intended to run daily at 8am user's local time (or 8am PT as default)
   - Add to `vercel.json` crons config: `{ "path": "/api/cron/daily-guidance", "schedule": "0 15 * * *" }` (8am PT = 15:00 UTC)
   - Note: Twilio credentials may not be configured yet (see STATE.md blocker). The code should handle missing credentials gracefully -- log warning and skip SMS delivery without crashing.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - `npm run build` succeeds (dashboard page still builds)
    - DailyAgendaWidget renders with skeleton loading state
    - Task completion toggles work
    - SMS formatting stays under 480 characters
  </verify>
  <done>
    - Dashboard prominently shows "Today, accomplish these 3 things" widget
    - Tasks are checkable and completion is tracked
    - 3/3 completion triggers celebration
    - SMS delivery function formats and sends daily guidance
    - Cron endpoint processes all eligible users
    - Missing Twilio credentials don't crash the system
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors
2. `npm run build` -- production build succeeds
3. Manual: open dashboard, verify DailyAgendaWidget shows 3 personalized tasks
4. Manual: complete a task, verify checkbox persists on refresh
5. Manual: complete all 3 tasks, verify celebration
6. Verify SMS format stays under 480 characters with test data
7. Verify cron endpoint handles missing Twilio credentials gracefully
</verification>

<success_criteria>
- Dashboard widget is the first thing founders see
- 3 tasks are specific to founder's stage and recent context (not generic)
- Tasks refresh daily (new tasks tomorrow)
- Task completion is tracked and feeds into journey
- SMS sends prescriptive guidance (when Twilio configured)
- Cron handles failures gracefully
</success_criteria>

<output>
After completion, create `.planning/phases/84-daily-mentor-guidance/84-01-SUMMARY.md`
</output>
