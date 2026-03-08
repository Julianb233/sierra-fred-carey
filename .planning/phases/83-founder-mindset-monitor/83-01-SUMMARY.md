# Phase 83: Founder Mindset Monitor — Summary

## What was built

A real-time sentiment monitoring system that detects founder stress and frustration from conversation patterns and triggers proactive FRED interventions. The system runs as a background pipeline in the chat flow, never blocking the user-facing response.

## Artifacts created

| File | Purpose |
|------|---------|
| `lib/sentiment/stress-detector.ts` | Rolling window stress pattern detection with exponential decay weighting |
| `lib/sentiment/intervention-engine.ts` | Generates contextual FRED prompt injection blocks for stress intervention |
| `lib/db/sentiment-log.ts` | Persistence layer for sentiment signals with fire-and-forget insert/query |
| `supabase/migrations/20260308_sentiment_signals.sql` | Creates `sentiment_signals` table with RLS policies |
| `lib/sentiment/__tests__/stress-detector.test.ts` | 18 unit tests covering detection, intervention gating, and topic extraction |

## Artifacts modified

| File | Changes |
|------|---------|
| `app/api/fred/chat/route.ts` | Added Phase 83 imports, pre-response stress detection block, wellbeingBlock injection into system prompt |
| `lib/ai/prompts.ts` | Added `buildWellbeingInterventionBlock()` (already present from parallel work) |

## How it works

1. **Pre-response heuristic sentiment** — Before the LLM call, `extractSentimentFromText()` (sync, keyword-based) quickly classifies the user's message.

2. **Rolling window stress detection** — `detectStressPattern()` fetches the last 10 sentiment signals from DB, computes a weighted stress score using exponential decay (recent messages weighted higher), and determines level (low/moderate/high/critical) and trend (improving/stable/worsening).

3. **Intervention gating** — `shouldIntervene()` returns true only when:
   - Level is `critical` (regardless of trend), or
   - Level is `high` AND trend is `worsening` or `stable`
   - AND no intervention was triggered in the last 3 messages (cooldown)

4. **Prompt injection** — When intervention is triggered, `generateIntervention()` produces a context-aware prompt block that is injected into the system prompt as `[FOUNDER WELLBEING CONTEXT]`. FRED responds naturally with empathy, never revealing the monitoring system.

5. **Fire-and-forget logging** — Sentiment signals are logged to `sentiment_signals` table asynchronously, with stress level, topics, and intervention flag.

## Stress scoring

| Label | Score | Level thresholds |
|-------|-------|-----------------|
| frustrated | 1.0 | < 0.2 = low |
| negative | 0.6 | < 0.5 = moderate |
| neutral | 0.1 | < 0.7 = high |
| positive | -0.2 | >= 0.7 = critical |

Scores use exponential decay weighting: oldest signal = 0.5 weight, newest = 1.0 weight.

## Topic detection

Simple keyword matching (no LLM) covers: fundraising, product, team, revenue, burnout, competition, legal, personal.

## Test results

- 18 unit tests: ALL PASSING
- TypeScript compilation: CLEAN (no errors in Phase 83 files)
