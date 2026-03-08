---
phase: 80-stage-gate-enforcement
plan: 01
status: complete
completed_at: 2026-03-08T03:35:00Z
commit: c38dea6
---

# Phase 80-01 Summary: Stage Gate Enforcement (Intent Classifier + Validator)

## What was built

Self-contained stage-gate enforcement engine in `lib/ai/stage-gate/` with 6 files:

### Files created

| File | Purpose |
|------|---------|
| `lib/ai/stage-gate/types.ts` | OasesStage (5 stages), IntentCategory (23 intents), StageGateResult, OasesStageConfig types |
| `lib/ai/stage-gate/intent-stage-map.ts` | OASES_STAGE_CONFIG mapping stages to min steps, INTENT_TO_STAGE reverse lookup, hasReachedStep() |
| `lib/ai/stage-gate/intent-classifier.ts` | classifyIntent() with regex keyword patterns, action verb gating, mentor override detection |
| `lib/ai/stage-gate/redirect-templates.ts` | buildStageGateRedirectBlock() and buildProactiveGuidanceBlock() for system prompt injection |
| `lib/ai/stage-gate/stage-gate-validator.ts` | StageGateValidator class with validate() method returning allow/redirect/override |
| `lib/ai/stage-gate/index.ts` | Barrel export for all public API |

### Key design decisions

1. **Dual-gate classification**: Intent requires BOTH a domain keyword match AND an action verb, matching the existing `detectDownstreamRequestQuick` pattern in the chat route. `alwaysMatch` intents (clarity stage, mindset, wellbeing) skip the action verb requirement.

2. **Stage-to-step mapping**: Each Oases stage maps to a minimum StartupStep via STEP_ORDER index comparison. Clarity maps to step 1 (always accessible), validation to step 5, build to step 6, launch to step 7, grow to step 8.

3. **Escalating redirect behavior**: First redirect uses warm Fred-style language. After 2 redirects, switches to compromise/mentor override mode -- helps the founder while being transparent about gaps.

4. **Mentor override detection**: Regex patterns detect when founders explicitly insist ("I've already done that", "I really need", "please just help"). Override is allowed after at least 1 prior redirect.

5. **No side effects**: The module has zero DB calls, zero API calls, zero imports from external services. Pure logic ready for integration.

### Stage mapping

| Stage | Min Step | Step # | Intents |
|-------|----------|--------|---------|
| Clarity | problem | 1 | problem_definition, idea_validation, customer_interviews, market_research |
| Validation | validation | 5 | market_testing, mvp_planning, pricing, competitive_analysis |
| Build | gtm | 6 | product_development, pitch_deck_creation, team_building, strategy_docs |
| Launch | execution | 7 | investor_outreach, fundraising, pitch_preparation, investor_targeting |
| Grow | pilot | 8 | scaling, fund_matching, advanced_analytics, partnerships |

### Always-allowed intents

- `general` (no stage association)
- `mindset` (no stage association)
- `wellbeing` (no stage association)

## Verification

- TypeScript compilation passes with zero errors in stage-gate files
- All 6 files exist in `lib/ai/stage-gate/`
- Barrel export resolves all imports correctly
- No pre-existing errors introduced

## Next step

Plan 02 wires StageGateValidator into the chat route (`app/api/fred/chat/route.ts`).
