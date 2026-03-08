---
phase: 89-boardy-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/dashboard/boardy/page.tsx
  - components/boardy/journey-celebration.tsx
  - components/boardy/intro-prep-card.tsx
  - lib/ai/prompt-layers.ts
  - lib/boardy/intro-templates.ts
autonomous: true

must_haves:
  truths:
    - "User sees a celebration banner when Venture Journey reaches 100%"
    - "FRED references investor/advisor matches in chat when contextually relevant"
    - "User can access intro preparation guidance (call script + email template) for each match"
    - "Celebration banner is dismissible and visually prominent"
  artifacts:
    - path: "components/boardy/journey-celebration.tsx"
      provides: "Celebration banner component for 100% journey completion"
    - path: "components/boardy/intro-prep-card.tsx"
      provides: "Intro preparation card with call script and email template"
    - path: "lib/boardy/intro-templates.ts"
      provides: "Template generators for intro call scripts and email drafts"
      exports: ["generateCallScript", "generateEmailTemplate"]
    - path: "lib/ai/prompt-layers.ts"
      provides: "FRED prompt section referencing Boardy matches in context"
      contains: "investor matches"
  key_links:
    - from: "app/dashboard/boardy/page.tsx"
      to: "components/boardy/journey-celebration.tsx"
      via: "Conditional render when journey progress = 100%"
      pattern: "JourneyCelebration"
    - from: "app/dashboard/boardy/page.tsx"
      to: "components/boardy/intro-prep-card.tsx"
      via: "Rendered per match with connected status"
      pattern: "IntroPrepCard"
    - from: "lib/ai/prompt-layers.ts"
      to: "Boardy match data"
      via: "Founder context placeholder includes match summary"
      pattern: "investor matches\|boardy"
---

<objective>
Polish the Boardy integration with journey completion celebration, FRED-chat match awareness, and intro preparation guidance (call scripts + email templates).

Purpose: Close the loop on the Venture Journey experience. When founders complete their journey and have investor matches, they need practical next-step tools (how to prepare for the intro call, what to email) and celebration to mark the milestone.
Output: Journey celebration banner, intro prep templates, FRED match awareness in chat context.
</objective>

<context>
@app/dashboard/boardy/page.tsx - Boardy dashboard with match cards, filter tabs, actions
@app/api/boardy/match/route.ts - Match API (GET/POST), Studio tier gated
@lib/boardy/types.ts - BoardyMatch, BoardyMatchStatus types
@components/boardy/match-list.tsx - Existing match list component
@lib/ai/prompt-layers.ts - FRED_CORE_PROMPT with {{FOUNDER_CONTEXT}} placeholder
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build journey celebration banner and intro preparation components</name>
  <files>components/boardy/journey-celebration.tsx, components/boardy/intro-prep-card.tsx, lib/boardy/intro-templates.ts, app/dashboard/boardy/page.tsx</files>
  <action>
  1. Create `lib/boardy/intro-templates.ts`:
     ```typescript
     export function generateCallScript(match: { name: string; type: string; focus?: string }): string {
       // Return a structured call script:
       // - Opening (introduce yourself, mention how you were connected)
       // - Your 30-second pitch (placeholder for founder to fill)
       // - 3 questions to ask the investor/advisor
       // - Closing (next steps, follow-up)
       // Personalize based on match.type (investor vs advisor) and match.focus area
     }

     export function generateEmailTemplate(match: { name: string; type: string; focus?: string }): string {
       // Return a fill-in-the-blank email template:
       // Subject: Introduction via Sahara — [Your Company]
       // Body: Brief intro, why you're reaching out, 1 specific ask, availability
       // Keep under 150 words -- investors prefer brevity
     }
     ```

  2. Create `components/boardy/journey-celebration.tsx`:
     - Props: `{ onDismiss: () => void }`
     - Full-width banner at the top of the Boardy page
     - Sahara orange gradient background (#ff6a1a to #ff8c42)
     - Large heading: "Congratulations! You've completed the Venture Journey"
     - Subtext: "You're investor-ready. Here are your matched connections."
     - Party popper icon (from lucide-react: PartyPopper or Trophy)
     - Dismiss X button in top-right corner
     - Use Framer Motion for a subtle entrance animation (slide down + fade in)
     - Store dismissal in localStorage key "sahara_journey_celebration_dismissed"

  3. Create `components/boardy/intro-prep-card.tsx`:
     - Props: `{ match: BoardyMatch }`
     - Only renders for matches with status "connected" or "intro_sent"
     - Expandable card section (collapsed by default) titled "Prepare for This Intro"
     - Two tabs inside: "Call Script" and "Email Template"
     - Call Script tab: renders generateCallScript(match) in a formatted, copy-able text block
     - Email Template tab: renders generateEmailTemplate(match) with a "Copy to Clipboard" button
     - Copy button uses navigator.clipboard.writeText, shows toast "Copied!" via sonner
     - Integrate below each match card in the MatchList or inline within match card actions

  4. Modify `app/dashboard/boardy/page.tsx`:
     - Import JourneyCelebration component
     - Add state: `const [showCelebration, setShowCelebration] = useState(false)`
     - On mount, check if journey progress is 100% (fetch from /api/dashboard/journey-progress or check existing journey state) AND localStorage dismissal key is not set
     - If conditions met, show JourneyCelebration banner above the match list
     - Pass `onDismiss` that sets localStorage and hides banner
     - Import IntroPrepCard and pass to MatchList or render alongside each connected match
  </action>
  <verify>
  - `npm run build` succeeds
  - `npx tsc --noEmit` passes
  - `grep -c "JourneyCelebration" app/dashboard/boardy/page.tsx` returns 1+
  - `grep -c "IntroPrepCard" app/dashboard/boardy/page.tsx` returns 1+
  - `grep -c "generateCallScript" lib/boardy/intro-templates.ts` returns 1+
  - `grep -c "generateEmailTemplate" lib/boardy/intro-templates.ts` returns 1+
  </verify>
  <done>Boardy page shows celebration banner at 100% journey completion (dismissible). Each connected match shows expandable intro prep with call script and email template. Copy-to-clipboard works.</done>
</task>

<task type="auto">
  <name>Task 2: Add Boardy match awareness to FRED chat context</name>
  <files>lib/ai/prompt-layers.ts</files>
  <action>
  1. In `lib/ai/prompt-layers.ts`, add a new section to FRED_CORE_PROMPT.content after the "FRAMEWORKS" section:

  ```
  ## BOARDY MATCH AWARENESS

  When the founder has active investor or advisor matches (provided in the Founder Snapshot below), reference them naturally in conversation when relevant:

  Rules:
  - If founder discusses fundraising, pitch prep, or investor meetings, mention their active matches: "You have [N] investor matches through Boardy -- have you prepared for those intros yet?"
  - If founder asks about networking or finding advisors, reference Boardy: "You already have [N] advisor matches. Let's make sure you're prepared for those conversations first."
  - Do NOT bring up matches unprompted in unrelated conversations (e.g., product development, hiring)
  - When matches are referenced, offer practical prep: "Want me to help you draft a quick intro email?" or "Should we practice your 30-second pitch for that call?"
  - Never fabricate match details -- only reference what's in the Founder Snapshot
  ```

  2. The `{{FOUNDER_CONTEXT}}` placeholder in the core prompt is replaced at runtime by context-builder.ts. The actual match data injection happens there. This task only adds the INSTRUCTION for FRED to use match data when present. The context-builder already includes profile data; if Boardy match count is not yet in the founder snapshot, add a note in the prompt: "If no match data is present in the snapshot, do not reference Boardy matches."

  Note: Do NOT modify the Object.freeze structure. The content string within FRED_CORE_PROMPT is what gets frozen. Add the new section as part of the content template literal before the freeze.
  </action>
  <verify>
  - `npm run build` succeeds
  - `npx vitest run lib/ai/__tests__/prompts.test.ts` passes
  - `grep -c "BOARDY MATCH AWARENESS" lib/ai/prompt-layers.ts` returns 1
  - The new section appears in the assembled system prompt
  </verify>
  <done>FRED's core prompt includes Boardy match awareness rules. FRED will reference active investor/advisor matches in contextually relevant conversations (fundraising, networking) without bringing them up unprompted.</done>
</task>

</tasks>

<verification>
- `npm run build` succeeds
- Boardy page shows celebration banner when journey is 100% complete
- Banner is dismissible and stays dismissed across page reloads
- Connected matches show expandable intro prep section
- Call script and email template are generated and copyable
- FRED prompt contains BOARDY MATCH AWARENESS section
- All existing tests pass
</verification>

<success_criteria>
- Celebration banner appears at 100% Venture Journey completion with congratulatory message
- Banner dismisses and stays dismissed (localStorage)
- Each connected/intro_sent match shows call script and email template
- Copy-to-clipboard works for templates
- FRED references matches in fundraising/networking conversations
- FRED does NOT bring up matches in unrelated conversations
- Build and type check pass
</success_criteria>

<output>
After completion, create `.planning/phases/89-boardy-polish/89-01-SUMMARY.md`
</output>
