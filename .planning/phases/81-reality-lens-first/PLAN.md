---
phase: 81-reality-lens-first
plan: 01
type: execute
wave: 2
depends_on: [77, 78]
files_modified:
  - app/api/fred/reality-lens/quick/route.ts
  - app/dashboard/reality-lens/quick/page.tsx
  - lib/fred/reality-lens-quick.ts
  - lib/db/reality-lens-state.ts
  - app/api/fred/reality-lens/quick/route.test.ts
autonomous: true

must_haves:
  truths:
    - "After onboarding, user is auto-redirected to a quick reality check"
    - "Quick mode asks 5-6 focused questions, not full 5-factor deep analysis"
    - "Results determine initial oases_stage placement"
    - "reality_lens_complete flag is stored in profiles table"
    - "Low-scoring users start at Clarity, high-scoring at Validation"
  artifacts:
    - path: "app/api/fred/reality-lens/quick/route.ts"
      provides: "Quick Reality Lens API endpoint"
      exports: ["POST"]
    - path: "app/dashboard/reality-lens/quick/page.tsx"
      provides: "Lightweight quick reality check UI"
      min_lines: 80
    - path: "lib/fred/reality-lens-quick.ts"
      provides: "Quick assessment logic with stage mapping"
      exports: ["quickAssessIdea", "mapScoreToStage"]
    - path: "lib/db/reality-lens-state.ts"
      provides: "DB helpers for reality_lens_complete flag and stage setting"
      exports: ["markRealityLensComplete", "getRealityLensStatus"]
  key_links:
    - from: "app/dashboard/reality-lens/quick/page.tsx"
      to: "/api/fred/reality-lens/quick"
      via: "fetch POST on form submit"
      pattern: "fetch.*api/fred/reality-lens/quick"
    - from: "lib/fred/reality-lens-quick.ts"
      to: "profiles.oases_stage"
      via: "mapScoreToStage sets initial stage"
      pattern: "mapScoreToStage"
    - from: "lib/db/reality-lens-state.ts"
      to: "profiles table"
      via: "Supabase update for reality_lens_complete and oases_stage"
      pattern: "supabase.*profiles.*update"
---

<objective>
Build a lightweight "Quick Reality Check" mode that serves as the first substantive interaction after onboarding. This fast-path version asks 5-6 focused questions (vs the full deep 5-factor analysis), determines the founder's initial Oases stage placement, and stores the completion flag.

Purpose: Every founder's first experience is a reality check that sets their journey stage based on idea readiness -- creating immediate engagement and personalized guidance.
Output: Quick Reality Lens API + UI page + stage mapping logic + DB state helpers
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/milestones/v8.0-go-live/ROADMAP.md
@.planning/STATE.md

# Existing Reality Lens (full version) -- reference for patterns
@app/dashboard/reality-lens/page.tsx
@app/api/fred/reality-lens/route.ts
@lib/fred/reality-lens.ts

# FeatureLock pattern (for stage-gating reference)
@components/tier/feature-lock.tsx

# Supabase patterns
@lib/supabase/server.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Quick Reality Lens API + Assessment Logic</name>
  <files>
    lib/fred/reality-lens-quick.ts
    lib/db/reality-lens-state.ts
    app/api/fred/reality-lens/quick/route.ts
  </files>
  <action>
1. Create `lib/fred/reality-lens-quick.ts`:
   - Export `QUICK_QUESTIONS`: array of 6 focused questions:
     1. "Describe your startup idea in 2-3 sentences" (free text)
     2. "Who is your target customer?" (free text)
     3. "How will you make money?" (select: subscription/marketplace/services/ads/other)
     4. "Have you talked to potential customers?" (select: no/informal/10+interviews/paying-customers)
     5. "Do you have a working prototype?" (select: idea-only/mockups/mvp/launched)
     6. "What is your biggest challenge right now?" (free text)
   - Export `quickAssessIdea(answers: QuickAnswers): Promise<QuickAssessmentResult>` that:
     - Uses Vercel AI SDK `generateObject` with structured output schema
     - Sends the 6 answers to an LLM (use `getModelForTier` with free tier model)
     - Returns: `{ overallScore: number (0-100), stage: OasesStage, gaps: string[], strengths: string[], nextAction: string }`
   - Export `mapScoreToStage(score: number, hasCustomers: boolean, hasPrototype: boolean): OasesStage`:
     - score < 30 OR no customers AND no prototype -> "clarity"
     - score 30-59 OR has informal conversations -> "validation"
     - score 60-79 AND has prototype -> "build"
     - score >= 80 AND has paying customers -> "launch"
     - Default: "clarity"
   - Type `OasesStage = 'clarity' | 'validation' | 'build' | 'launch' | 'grow'`

2. Create `lib/db/reality-lens-state.ts`:
   - Export `markRealityLensComplete(userId: string, stage: OasesStage, score: number): Promise<void>` that updates profiles table setting `reality_lens_complete = true`, `oases_stage = stage`, `reality_lens_score = score`
   - Export `getRealityLensStatus(userId: string): Promise<{ complete: boolean, stage: OasesStage | null, score: number | null }>`
   - Use `createServiceClient()` from `@/lib/supabase/server` for DB access
   - Note: these columns may not exist yet on profiles -- the migration will be handled by Phase 78 (Oases stage column). If not present, create a Supabase migration `supabase/migrations/20260308_reality_lens_columns.sql` adding `reality_lens_complete boolean default false`, `reality_lens_score integer`, and `oases_stage text default 'clarity'` to profiles table (use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS pattern)

3. Create `app/api/fred/reality-lens/quick/route.ts`:
   - POST endpoint accepting `{ answers: QuickAnswers }`
   - Requires auth via `requireAuth()`
   - Rate limit: 3 per day for free tier (this is a one-time assessment mostly)
   - Calls `quickAssessIdea(answers)` then `markRealityLensComplete(userId, result.stage, result.overallScore)`
   - Returns `{ success: true, data: QuickAssessmentResult }`
   - Follow patterns from existing `app/api/fred/reality-lens/route.ts`
  </action>
  <verify>
    - `npx tsc --noEmit` passes with no errors in new files
    - Unit test: create `lib/fred/__tests__/reality-lens-quick.test.ts` testing `mapScoreToStage` with edge cases
    - `npm run test -- --run lib/fred/__tests__/reality-lens-quick.test.ts` passes
  </verify>
  <done>
    - Quick assessment API accepts 6 answers, returns score + stage + gaps
    - mapScoreToStage correctly maps scores to Oases stages
    - reality_lens_complete flag and oases_stage are persisted to profiles
    - Rate limiting prevents abuse
  </done>
</task>

<task type="auto">
  <name>Task 2: Quick Reality Lens UI Page</name>
  <files>
    app/dashboard/reality-lens/quick/page.tsx
  </files>
  <action>
Create `app/dashboard/reality-lens/quick/page.tsx` as a "use client" component:

1. **Layout**: Clean, focused single-column layout matching Sahara orange brand (#ff6a1a). No sidebar distractions -- this is a guided flow.

2. **Question Flow**: Step-by-step wizard (one question per screen, not all at once):
   - Progress bar at top showing "Question X of 6"
   - Each question renders appropriate input (Textarea for free text, Select for multiple choice)
   - "Next" button advances, "Back" button goes to previous
   - Final step shows "Analyze My Idea" button

3. **Loading State**: After submission, show an engaging loading state with messages cycling through: "Evaluating your idea...", "Analyzing market fit...", "Assessing readiness..." (cycle every 2 seconds)

4. **Results Screen**: After API returns:
   - Large overall score with color coding (green >= 75, amber >= 50, red < 50)
   - Stage placement badge: "You're starting at: [Stage Name]"
   - Gaps list: "Here's what you need to figure out:" with bullet points
   - Strengths list: "What's working for you:" with bullet points
   - Next action: highlighted call-to-action
   - "Continue to Dashboard" button that navigates to `/dashboard`
   - "Get Detailed Analysis" link to `/dashboard/reality-lens` (full version)

5. **Redirect Logic**: On mount, check if user already completed reality lens (fetch GET `/api/fred/reality-lens/quick/status`). If `reality_lens_complete` is true, redirect to `/dashboard` with toast "You've already completed your reality check."

6. **Styling**: Use shadcn/ui components (Card, Button, Badge, Progress, Select, Textarea). Tailwind classes. Framer Motion for step transitions (slide left/right).

7. Add a GET handler to the API route that returns the user's reality lens status for the redirect check.
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - Page renders at `/dashboard/reality-lens/quick` in dev server
    - All 6 questions display correctly with proper input types
    - Step navigation (next/back) works
    - Loading state shows cycling messages
    - Results screen displays score, stage, gaps, strengths
  </verify>
  <done>
    - Quick Reality Lens wizard is accessible at /dashboard/reality-lens/quick
    - Step-by-step flow guides user through 6 focused questions
    - Results clearly show stage placement and gaps
    - Users who completed are redirected to dashboard
    - UI matches Sahara brand styling
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors
2. `npm run test -- --run lib/fred/__tests__/reality-lens-quick.test.ts` -- all pass
3. Manual: navigate to `/dashboard/reality-lens/quick`, complete all 6 questions, verify score and stage are returned
4. Manual: verify `reality_lens_complete` is set in profiles table after completion
5. Manual: revisit `/dashboard/reality-lens/quick` and verify redirect to dashboard
</verification>

<success_criteria>
- Quick Reality Lens flow completes in under 3 minutes (vs 5-10 for full version)
- Score correctly maps to Oases stage
- reality_lens_complete flag prevents re-entry
- Results motivate engagement by surfacing specific gaps
- Page builds without errors in production build
</success_criteria>

<output>
After completion, create `.planning/phases/81-reality-lens-first/81-01-SUMMARY.md`
</output>
