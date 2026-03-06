---
phase: 73
plan: 01
subsystem: feedback
tags: [sentiment, llm, aggregation, fire-and-forget, fred-chat]
requires: [72]
provides: [per-message-sentiment, session-aggregation, spike-detection, coaching-discomfort]
affects: [73-02, 73-03, 73-04]
tech-stack:
  added: []
  patterns: [fire-and-forget-iife, generateObject-structured-output, heuristic-fallback]
key-files:
  created:
    - lib/feedback/sentiment.ts
    - lib/feedback/sentiment-aggregator.ts
  modified:
    - lib/db/feedback.ts
    - app/api/fred/chat/route.ts
decisions:
  - id: "73-01-01"
    title: "Use getModelForTier('free', 'structured') for sentiment extraction"
    rationale: "Background task, not user-facing -- use cheapest/fastest model"
  - id: "73-01-02"
    title: "Heuristic fallback for messages < 10 chars or LLM failure"
    rationale: "Short messages like 'ok' or 'thanks' don't warrant an LLM call"
  - id: "73-01-03"
    title: "Weighted average by confidence for session aggregation"
    rationale: "High-confidence signals should dominate session-level scores"
metrics:
  duration: "4m"
  completed: "2026-03-06"
---

# Phase 73 Plan 01: Sentiment Extraction + Aggregation + FRED Integration Summary

Per-message LLM-based sentiment extraction via generateObject with session-level aggregation and spike detection, integrated as fire-and-forget in both streaming and non-streaming FRED chat paths.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Create sentiment extraction and aggregation modules | 7df5406 | sentiment.ts, sentiment-aggregator.ts, feedback.ts query |
| 2 | Integrate sentiment into FRED chat pipeline | a678c97 | chat/route.ts fire-and-forget in both paths |

## What Was Built

### lib/feedback/sentiment.ts
- `SentimentResult` interface: label (positive/neutral/negative/frustrated), confidence (0-1), isCoachingDiscomfort flag
- `extractSentiment(userMessage, fredResponse)`: LLM-based extraction using generateObject with zod schema on the free-tier model
- `extractSentimentFromText(text)`: Sync keyword-based heuristic fallback for short messages or LLM failures
- Messages under 10 characters skip the LLM and use heuristics directly

### lib/feedback/sentiment-aggregator.ts
- `detectSentimentSpike(scores, confidences)`: Detects sharp degradation (last 3 avg < -0.5 when previous 3 avg > 0) and extreme single-message negatives (score < -0.8 with confidence > 0.7)
- `aggregateSessionSentiment(sessionId, userId)`: Queries all sentiment signals for a session, computes weighted average, determines trend, flags spiked sessions
- `SENTIMENT_SCORE_MAP`: positive=1, neutral=0, negative=-0.5, frustrated=-1
- `determineTrend()`: Compares first-half vs second-half averages

### lib/db/feedback.ts
- Added `getFeedbackSignalsBySession(sessionId, signalType?, limit?)`: Session-scoped query needed by aggregator

### app/api/fred/chat/route.ts
- Added imports for extractSentiment, aggregateSessionSentiment, insertFeedbackSignal, TIER_WEIGHTS
- Non-streaming path: fire-and-forget async IIFE after next-steps extraction
- Streaming path: identical fire-and-forget async IIFE after next-steps extraction
- Both paths: extract sentiment -> insert signal -> aggregate session -> catch errors silently

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added getFeedbackSignalsBySession to lib/db/feedback.ts**
- **Found during:** Task 1
- **Issue:** The aggregator needs to query signals by session_id, but no such query existed
- **Fix:** Added getFeedbackSignalsBySession with optional signalType filter
- **Files modified:** lib/db/feedback.ts

## Requirements Coverage

- REQ-S1: Per-message sentiment extraction piggybacking on FRED pipeline (no separate user-facing LLM call)
- REQ-S2: Session-level aggregation with weighted average and trend detection
- REQ-S3: Auto-flagging of sessions with sharp sentiment degradation via detectSentimentSpike
- REQ-S4: Coaching discomfort distinguished from quality issues via isCoachingDiscomfort flag

## Verification

- `npx tsc --noEmit`: 0 new errors (all errors are pre-existing in funnel/ directory)
- `npm run build`: Passes cleanly (all pages compile)
- Code review: sentiment extraction is purely additive, fire-and-forget, zero latency impact on FRED responses
