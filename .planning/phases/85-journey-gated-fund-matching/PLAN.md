---
phase: 85-journey-gated-fund-matching
plan: 01
type: execute
wave: 3
depends_on: [78]
files_modified:
  - lib/journey/completion.ts
  - app/dashboard/boardy/page.tsx
  - components/journey/journey-gate.tsx
  - components/journey/celebration-milestone.tsx
  - app/api/journey/completion/route.ts
autonomous: true

must_haves:
  truths:
    - "Boardy fund matching UI is grayed out with journey completion percentage until 100%"
    - "Journey completion percentage is calculated from Oases stage progress"
    - "At 100% journey completion, a celebration milestone is triggered"
    - "FRED references Boardy when user is ready (100% complete)"
    - "Introduction preparation guidance is available post-unlock"
  artifacts:
    - path: "lib/journey/completion.ts"
      provides: "Journey completion percentage calculation"
      exports: ["getJourneyCompletion", "isJourneyComplete", "STAGE_WEIGHTS"]
    - path: "components/journey/journey-gate.tsx"
      provides: "Journey-gated wrapper component"
      exports: ["JourneyGate"]
    - path: "components/journey/celebration-milestone.tsx"
      provides: "100% completion celebration UI"
      exports: ["CelebrationMilestone"]
    - path: "app/api/journey/completion/route.ts"
      provides: "Journey completion API"
      exports: ["GET"]
    - path: "app/dashboard/boardy/page.tsx"
      provides: "Modified Boardy page with journey gating"
  key_links:
    - from: "app/dashboard/boardy/page.tsx"
      to: "lib/journey/completion.ts"
      via: "checks completion before rendering"
      pattern: "getJourneyCompletion|isJourneyComplete"
    - from: "components/journey/journey-gate.tsx"
      to: "/api/journey/completion"
      via: "fetches completion percentage"
      pattern: "fetch.*api/journey/completion"
    - from: "app/dashboard/boardy/page.tsx"
      to: "components/journey/celebration-milestone.tsx"
      via: "renders on first unlock"
      pattern: "CelebrationMilestone"
---

<objective>
Gate the Boardy fund matching feature behind journey completion (not just tier) and create a meaningful celebration milestone when founders reach 100%. Currently Boardy is tier-gated (Studio+) only. This adds journey-gating so founders must complete their venture journey before accessing investor matching.

Purpose: Make fund matching feel earned -- founders who complete the full journey are prepared for investors. The celebration milestone creates a powerful emotional moment.
Output: Journey completion calculator, JourneyGate component, CelebrationMilestone component, modified Boardy page
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/milestones/v8.0-go-live/ROADMAP.md
@.planning/STATE.md

# Boardy page -- will be modified
@app/dashboard/boardy/page.tsx

# FeatureLock pattern -- reference for gating approach
@components/tier/feature-lock.tsx

# Existing tier context
@lib/context/tier-context.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Journey Completion Logic + API + Gate Component</name>
  <files>
    lib/journey/completion.ts
    app/api/journey/completion/route.ts
    components/journey/journey-gate.tsx
  </files>
  <action>
1. Create `lib/journey/completion.ts`:
   - Define stage weights:
     ```typescript
     export const STAGE_WEIGHTS: Record<string, number> = {
       clarity: 20,
       validation: 40,
       build: 60,
       launch: 80,
       grow: 100,
     }
     ```
   - Export `getJourneyCompletion(userId: string): Promise<JourneyCompletion>`:
     - Queries profiles table for `oases_stage` and `reality_lens_complete`
     - Computes `completionPercent` from STAGE_WEIGHTS[current_stage]
     - If oases_stage is null or not set, returns 0%
     - Returns `{ percent: number, stage: string, isComplete: boolean, stagesCompleted: string[], nextStage: string | null }`
   - Export `isJourneyComplete(userId: string): Promise<boolean>`:
     - Shorthand: returns true if `oases_stage === 'grow'`
   - Export type `JourneyCompletion = { percent: number, stage: string, isComplete: boolean, stagesCompleted: string[], nextStage: string | null }`
   - Use `createServiceClient()` for DB access

2. Create `app/api/journey/completion/route.ts`:
   - GET endpoint requiring auth
   - Calls `getJourneyCompletion(userId)` and returns JSON
   - Lightweight, no rate limit needed (simple DB read)

3. Create `components/journey/journey-gate.tsx`:
   - Export `JourneyGate` component:
     ```typescript
     interface JourneyGateProps {
       requiredPercent?: number  // default 100
       featureName: string
       children: ReactNode
     }
     ```
   - On mount, fetches `/api/journey/completion`
   - If `percent < requiredPercent`:
       - Renders a locked overlay (similar to FeatureLock pattern but journey-themed)
       - Shows: desert landscape illustration or lock icon
       - Message: "Complete your venture journey first"
       - Progress bar showing current completion: "You're at {percent}% -- keep going!"
       - Current stage badge and next stage hint
       - "Continue Journey" button linking to `/dashboard` (where daily tasks are)
       - Children are rendered behind a blur overlay (like FeatureLock blur mode)
   - If `percent >= requiredPercent`:
       - Renders children normally (no overlay)
   - Styled with Tailwind, Sahara orange accents for progress bar
   - Motion: slide-up animation when locked overlay appears
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - Unit test: create `lib/journey/__tests__/completion.test.ts` testing `getJourneyCompletion` with various stages
    - `npm run test -- --run lib/journey/__tests__/completion.test.ts` passes
  </verify>
  <done>
    - Journey completion percentage is correctly calculated from Oases stage
    - API returns completion data
    - JourneyGate component correctly locks/unlocks based on completion
    - Lock overlay shows progress and motivates continued engagement
  </done>
</task>

<task type="auto">
  <name>Task 2: Boardy Page Integration + Celebration Milestone</name>
  <files>
    components/journey/celebration-milestone.tsx
    app/dashboard/boardy/page.tsx
  </files>
  <action>
1. Create `components/journey/celebration-milestone.tsx`:
   - Export `CelebrationMilestone` component:
     - Triggered when journey reaches 100% for the first time
     - Full-screen celebration overlay:
       - Confetti animation (use a lightweight confetti library like `canvas-confetti` -- check if already in package.json, otherwise use CSS-only confetti animation)
       - Large heading: "Congratulations! You've completed the Venture Journey"
       - Subheading: "You're now ready to connect with investors and advisors"
       - FRED quote: "I knew you had it in you. Now let's get you funded."
       - "Meet Your Matches" CTA button (dismisses celebration, reveals Boardy)
     - Store `celebration_seen` flag in localStorage to only show once
     - Dismiss on button click or after 10 seconds auto-fade
   - Styled: dark overlay with gold/orange accents, Sahara brand

2. Modify `app/dashboard/boardy/page.tsx`:
   - Import `JourneyGate` from `@/components/journey/journey-gate`
   - Import `CelebrationMilestone` from `@/components/journey/celebration-milestone`
   - Wrap the existing content in DUAL gating:
     a. Keep existing `FeatureLock` (tier gating -- Studio+)
     b. Add `JourneyGate` wrapping the content INSIDE FeatureLock:
     ```tsx
     <FeatureLock requiredTier={UserTier.STUDIO} currentTier={userTier} featureName="Fund Matching">
       <JourneyGate featureName="Fund Matching" requiredPercent={100}>
         <CelebrationMilestone />
         {/* existing Boardy content */}
       </JourneyGate>
     </FeatureLock>
     ```
   - The JourneyGate message should reference both gates: "Complete your venture journey AND upgrade to Studio tier to unlock investor matching"
   - When journey is complete but tier is insufficient: FeatureLock shows upgrade prompt
   - When tier is sufficient but journey incomplete: JourneyGate shows progress
   - When both met: content renders with celebration on first view

3. Add intro preparation content below the matches (static content for now):
   - "Preparation for Introductions" section with:
     - Call script template card
     - Email template card
     - "Key talking points" card based on their Reality Lens strengths
   - These are simple Card components with placeholder text that FRED can personalize later
  </action>
  <verify>
    - `npx tsc --noEmit` passes
    - `npm run build` succeeds
    - Manual: visit `/dashboard/boardy` as a user without 100% completion -- verify locked state with progress
    - Manual: verify celebration renders on first visit at 100%
    - Manual: verify celebration doesn't re-show on subsequent visits
  </verify>
  <done>
    - Boardy page has dual gating: tier (Studio+) AND journey (100%)
    - Locked state shows clear progress toward unlock
    - Celebration milestone fires on first unlock
    - Celebration shows once only (localStorage flag)
    - Introduction preparation templates are available post-unlock
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors
2. `npm run build` -- production build succeeds
3. `npm run test -- --run lib/journey/__tests__/completion.test.ts` -- passes
4. Manual: Boardy page locked with progress percentage for incomplete journey
5. Manual: celebration triggers at 100% completion (first visit only)
6. Manual: intro preparation content visible after unlock
</verification>

<success_criteria>
- Fund matching is earned, not just purchased
- Journey completion percentage is prominent and motivating
- Celebration creates emotional milestone moment
- Dual gating (tier + journey) works correctly
- Intro preparation guidance helps founders prepare for investor meetings
- Existing Boardy functionality is preserved (not broken by gating wrapper)
</success_criteria>

<output>
After completion, create `.planning/phases/85-journey-gated-fund-matching/85-01-SUMMARY.md`
</output>
