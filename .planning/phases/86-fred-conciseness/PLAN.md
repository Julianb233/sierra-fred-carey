---
phase: 86-fred-conciseness
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/ai/prompt-layers.ts
  - lib/ai/prompts.ts
  - lib/fred/voice.ts
  - lib/ai/__tests__/prompts.test.ts
autonomous: true

must_haves:
  truths:
    - "FRED initial responses are max 2-3 sentences, not multi-paragraph walls of text"
    - "FRED offers 'Want me to break that down?' or similar follow-up after concise answer"
    - "FRED coaching advice uses 1-week micro-steps, never multi-month plans"
    - "Conciseness rules apply in both chat and voice modes"
  artifacts:
    - path: "lib/ai/prompt-layers.ts"
      provides: "Conciseness and baby-stepping rules in FRED_CORE_PROMPT"
      contains: "CONCISENESS"
    - path: "lib/fred/voice.ts"
      provides: "Voice preamble with conciseness constraint"
      contains: "concise"
    - path: "lib/ai/__tests__/prompts.test.ts"
      provides: "Tests verifying conciseness instructions present in assembled prompts"
  key_links:
    - from: "lib/ai/prompt-layers.ts"
      to: "lib/ai/prompts.ts"
      via: "FRED_CORE_PROMPT import and assembly"
      pattern: "FRED_CORE_PROMPT"
    - from: "lib/ai/prompt-layers.ts"
      to: "lib/fred/voice.ts"
      via: "buildFredVoicePreamble uses core prompt constraints"
      pattern: "buildFredVoicePreamble"
---

<objective>
Make FRED responses concise (2-3 sentences max initially) with follow-up offers, and enforce baby-step coaching (1-week actionable micro-steps instead of multi-month roadmaps).

Purpose: Founders are overwhelmed by long AI responses. Concise, actionable responses increase engagement and follow-through. Baby-stepping ensures founders actually execute advice.
Output: Updated prompt layers enforcing conciseness and micro-step coaching across chat and voice.
</objective>

<context>
@lib/ai/prompt-layers.ts - FRED_CORE_PROMPT (immutable core, but we add a new section)
@lib/ai/prompts.ts - buildSystemPrompt, COACHING_PROMPTS, getPromptForTopic
@lib/fred/voice.ts - buildFredVoicePreamble for voice agent
@lib/ai/__tests__/prompts.test.ts - existing prompt tests
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add conciseness and baby-stepping rules to FRED prompt architecture</name>
  <files>lib/ai/prompt-layers.ts, lib/ai/prompts.ts, lib/fred/voice.ts</files>
  <action>
  1. In `lib/ai/prompt-layers.ts`, add a new section to FRED_CORE_PROMPT.content AFTER the "PROACTIVE RESPONSE RULES" section. Add these two new sections:

  ```
  ## CONCISENESS PROTOCOL

  Your FIRST response to any question or topic MUST be 2-3 sentences maximum. This is non-negotiable.

  Rules:
  - Lead with the single most important insight, recommendation, or reframe
  - End with a follow-up offer: "Want me to break that down?" or "Should I walk you through the steps?" or "Want the full framework?"
  - Do NOT front-load disclaimers, caveats, or context-setting paragraphs
  - If the founder asks a complex question, give the 1-sentence answer first, then offer depth
  - Exception: When the founder explicitly asks for detail ("give me the full breakdown", "walk me through everything"), provide comprehensive response

  Examples of correct conciseness:
  - "Your biggest risk isn't competition -- it's distribution. You have no repeatable channel yet. Want me to help you map out a 7-day test for your top 3 channels?"
  - "You're not ready to raise. Your unit economics don't support a venture story yet. Want me to break down what investors would need to see?"

  ## BABY-STEP COACHING

  When giving action items or next steps, ALWAYS break them into 1-week micro-steps. Never give multi-month plans.

  Rules:
  - Maximum time horizon for any single action item: 7 days
  - Each step must be completable by one person in one focused session
  - Frame as "This week, do X" not "Over the next quarter, build Y"
  - If a founder needs a multi-month plan, break it into weekly sprints and only give them THIS week's sprint
  - End action items with a check-in prompt: "Do that this week and tell me what you learn"
  - Never say "over the next 3 months" or "in Q2" -- say "this week" or "in the next 7 days"

  Anti-patterns (NEVER do these):
  - "Step 1: Build MVP (2-3 months)" -- too large, too vague
  - "Phase 1: Market research, Phase 2: Product development, Phase 3: Launch" -- multi-month roadmap
  - Giving 10+ action items in a single response
  ```

  2. In `lib/ai/prompts.ts`, verify that `buildSystemPrompt()` already includes FRED_CORE_PROMPT (it should -- no changes needed if so). If COACHING_PROMPTS topic overlays contain any conflicting verbosity patterns, add a reminder line at the top of each overlay: "Remember: Keep initial responses to 2-3 sentences. Offer depth as a follow-up."

  3. In `lib/fred/voice.ts`, update `buildFredVoicePreamble()` to include a voice-specific conciseness rule: "In voice mode, keep responses even shorter -- 1-2 sentences max. Founders are listening, not reading. Pause after your point and let them respond." Add this after any existing voice-specific instructions in the preamble.
  </action>
  <verify>
  - `npx vitest run lib/ai/__tests__/prompts.test.ts` passes
  - `grep -c "CONCISENESS" lib/ai/prompt-layers.ts` returns 1+
  - `grep -c "BABY-STEP" lib/ai/prompt-layers.ts` returns 1+
  - `grep -c "concise\|1-2 sentences" lib/fred/voice.ts` returns 1+
  - `npm run build` succeeds
  </verify>
  <done>FRED_CORE_PROMPT contains conciseness protocol (2-3 sentence max) and baby-step coaching (1-week micro-steps). Voice preamble has voice-specific conciseness. All existing tests pass.</done>
</task>

<task type="auto">
  <name>Task 2: Add tests for conciseness and baby-stepping prompt presence</name>
  <files>lib/ai/__tests__/prompts.test.ts</files>
  <action>
  Add new test cases to the existing test file `lib/ai/__tests__/prompts.test.ts`:

  1. Test: "assembled system prompt includes conciseness protocol"
     - Call buildSystemPrompt with empty founder context
     - Assert result contains "CONCISENESS PROTOCOL"
     - Assert result contains "2-3 sentences maximum"
     - Assert result contains "Want me to break that down"

  2. Test: "assembled system prompt includes baby-step coaching rules"
     - Call buildSystemPrompt with empty founder context
     - Assert result contains "BABY-STEP COACHING"
     - Assert result contains "1-week micro-steps"
     - Assert result contains "7 days"

  3. Test: "conciseness rules appear before frameworks section"
     - Call buildSystemPrompt with empty founder context
     - Assert indexOf("CONCISENESS") < indexOf("FRAMEWORKS") -- conciseness must come before frameworks to establish the rule early

  4. Test: "voice preamble includes voice conciseness constraint"
     - Import buildFredVoicePreamble from lib/fred/voice.ts
     - Call it with minimal valid args
     - Assert result contains "1-2 sentences" or "voice mode"

  Follow the existing test patterns and describe blocks in the file.
  </action>
  <verify>
  - `npx vitest run lib/ai/__tests__/prompts.test.ts` -- all tests pass including new ones
  - New tests specifically validate conciseness and baby-stepping are in the assembled prompt
  </verify>
  <done>4 new tests confirm conciseness protocol, baby-step coaching, section ordering, and voice conciseness are all present in assembled prompts. All tests green.</done>
</task>

</tasks>

<verification>
- `npm run build` succeeds with no errors
- `npx vitest run lib/ai/__tests__/prompts.test.ts` passes all tests
- Manual: Send FRED a complex question in chat -- response should be 2-3 sentences with a follow-up offer
- Manual: Ask FRED for a plan -- should give 1-week micro-steps, not multi-month roadmap
</verification>

<success_criteria>
- FRED_CORE_PROMPT contains CONCISENESS PROTOCOL section enforcing 2-3 sentence initial responses
- FRED_CORE_PROMPT contains BABY-STEP COACHING section enforcing 1-week micro-steps
- Voice preamble includes voice-specific 1-2 sentence constraint
- All existing and new tests pass
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/86-fred-conciseness/86-01-SUMMARY.md`
</output>
