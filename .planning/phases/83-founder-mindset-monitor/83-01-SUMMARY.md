---
phase: 83-founder-mindset-monitor
plan: 01
subsystem: sentiment-monitoring
tags: [sentiment, stress-detection, wellbeing, intervention, chat-pipeline]
dependency-graph:
  requires: [79, 80-02]
  provides:
    - Rolling window stress pattern detection from sentiment signals
    - Proactive intervention engine with natural empathy prompts
    - Sentiment signal persistence (sentiment_signals table)
    - Chat pipeline integration (fire-and-forget stress check)
  affects:
    - 86-01 (fred-conciseness builds on prompt architecture)
    - 87-01 (pitch-deck-scoring may reference stress state)
tech-stack:
  added: []
  patterns:
    - "Exponential decay weighted rolling window"
    - "Fire-and-forget sentiment logging"
    - "System prompt injection for natural intervention"
    - "Cooldown-gated intervention (no spam)"
key-files:
  created:
    - lib/sentiment/stress-detector.ts
    - lib/sentiment/intervention-engine.ts
    - lib/db/sentiment-log.ts
    - supabase/migrations/20260308_sentiment_signals.sql
    - lib/sentiment/__tests__/stress-detector.test.ts
  modified:
    - app/api/fred/chat/route.ts (integrated stress detection + intervention)
decisions:
  - id: "83-01-d1"
    decision: "Stress detection runs BEFORE the LLM call to inject intervention into system prompt"
    reason: "Intervention must modify FRED's response behavior, not just log"
  - id: "83-01-d2"
    decision: "Cooldown of 3 messages between interventions"
    reason: "Prevents FRED from asking about wellbeing every message"
  - id: "83-01-d3"
    decision: "No LLM used for stress detection -- simple math and keyword extraction"
    reason: "Speed is critical; runs inline before every chat response"
metrics:
  duration: "pre-existing implementation"
  completed: "2026-03-08"
---

# Phase 83 Plan 01: Founder Mindset Monitor Summary

**One-liner:** Real-time sentiment monitoring with rolling window stress detection, proactive FRED interventions, and cooldown-gated wellbeing suggestions.

## What Was Built

### 1. Stress Detector (`lib/sentiment/stress-detector.ts`)
- `StressLevel` type: low | moderate | high | critical
- `StressSignal` interface: level, score, trend, dominantEmotion, topics
- `detectStressPattern(userId, currentSentiment)` -- fetches last 10 signals, computes weighted score with exponential decay, determines trend
- `shouldIntervene(signal, userId)` -- gates interventions: high+worsening/stable or critical, with 3-message cooldown
- `extractTopicsFromMessage(message)` -- keyword-based topic extraction (fundraising, product, team, burnout, etc.)
- 21 unit tests passing

### 2. Intervention Engine (`lib/sentiment/intervention-engine.ts`)
- `generateIntervention(signal, founderName)` -- generates empathetic prompt text by stress level
  - Critical: suggests wellbeing check-in with link to /dashboard/wellbeing
  - High: acknowledges frustration, offers reframe
- `buildInterventionBlock(intervention)` -- wraps in [FOUNDER WELLBEING CONTEXT] block
- Naturalness guard: never reveals monitoring system

### 3. Sentiment Log (`lib/db/sentiment-log.ts`)
- `logSentimentSignal(signal)` -- fire-and-forget insert using service client
- `getRecentSentimentSignals(userId, count)` -- returns last N signals (default 5)
- `wasInterventionTriggeredRecently(userId, withinMessages)` -- cooldown check

### 4. DB Migration (`supabase/migrations/20260308_sentiment_signals.sql`)
- `sentiment_signals` table with user_id, label, confidence, stress_level, topics, intervention_triggered
- Index on (user_id, created_at DESC) for efficient window queries
- RLS: users read own, service inserts

### 5. Chat Pipeline Integration (`app/api/fred/chat/route.ts`)
- Imports and calls stress detection after sentiment extraction
- Injects intervention block into system prompt when shouldIntervene returns true
- Fire-and-forget logging of sentiment signals
- No latency impact on normal responses

## Verification

- `npx vitest run lib/sentiment/__tests__/stress-detector.test.ts` -- 21 tests pass
- All imports and function calls verified in chat route
- Migration SQL syntactically valid
