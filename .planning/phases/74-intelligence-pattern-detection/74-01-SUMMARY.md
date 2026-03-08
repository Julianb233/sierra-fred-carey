---
phase: 74
plan: 01
subsystem: feedback-intelligence
tags: [trigger-dev, clustering, llm, deduplication, daily-job]
requires: [71, 73]
provides: [feedback-clustering, daily-intelligence-job, cluster-dedup, insight-upsert]
affects: [74-02, 75, 76]
tech-stack:
  added: []
  patterns: [generateObject-structured-output, hash-based-dedup, category-fallback, dynamic-imports]
key-files:
  created:
    - trigger/feedback-clustering.ts
    - supabase/migrations/20260308_feedback_insights_indexes.sql
  modified:
    - lib/feedback/clustering.ts
  preexisting:
    - trigger/feedback-intelligence.ts
    - lib/feedback/clustering.ts
    - lib/db/feedback.ts
    - lib/db/feedback-admin.ts
    - lib/feedback/types.ts
decisions:
  - id: "74-01-D1"
    title: "Hash-based dedup using SHA-256 of normalized theme+category"
    rationale: "Simple, deterministic, no external embedding service needed"
  - id: "74-01-D2"
    title: "Category-based fallback when LLM clustering fails"
    rationale: "Job must always produce results even without AI -- group by category as heuristic"
  - id: "74-01-D3"
    title: "runClusteringPipeline orchestrator added to clustering.ts"
    rationale: "Single entry point for Trigger.dev job: fetch signals, cluster, dedup, write insights"
metrics:
  duration: "~5m"
  completed: "2026-03-08"
---

# Phase 74 Plan 01: Feedback Clustering Engine & Trigger.dev Daily Job Summary

## Status: COMPLETE

AI-powered daily feedback clustering with LLM structured output, hash-based deduplication, severity ranking by tier weight, and Trigger.dev scheduled job.

## Tasks Completed

| Task | Name | Status | Key Changes |
|------|------|--------|-------------|
| 1 | DB query helpers for clustering | Pre-existing | getRecentNegativeSignals, getOpenInsights, updateInsightSignals, getTopInsightsThisWeek |
| 2 | Clustering logic library | Enhanced | Added runClusteringPipeline orchestrator + ClusteringResult type |
| 3 | Trigger.dev daily clustering job | Created | trigger/feedback-clustering.ts with cron at 6 AM UTC |
| 4 | Performance indexes migration | Created | 4 partial indexes for clustering queries and admin dashboard |

## What Was Built

### trigger/feedback-clustering.ts (NEW)
- Scheduled task `feedback-clustering-daily` with cron `0 6 * * *` (6 AM UTC)
- 24-hour lookback window for signal processing
- 5-minute max duration, 2 retry attempts with exponential backoff
- Dynamic import of `runClusteringPipeline` from clustering library
- Structured logging of start/completion with result counts

### lib/feedback/clustering.ts (ENHANCED)
- Added `runClusteringPipeline(since: string): Promise<ClusteringResult>` orchestrator
  - Fetches negative signals via `getRecentNegativeSignals`
  - Clusters via `clusterFeedbackSignals` (LLM with category fallback)
  - Deduplicates via `findInsightByHash` (4-hour hash window)
  - Merges into existing insights or creates new ones via `upsertInsightWithSignals`
  - Per-cluster try/catch for resilience
  - Returns `ClusteringResult` with counts of created, deduped, processed, errors
- Added `computeClusterSeverity(signals)` -- tier-weighted severity (free=1, pro=3, studio=5)
- Added `findDuplicateInsight(theme, category, openInsights)` -- two-pass dedup:
  1. Category match within 4-hour window
  2. Title word-overlap via Jaccard similarity > 0.5 within 24 hours
- Pre-existing: `clusterFeedbackSignals`, `computeClusterHash`, `isDuplicateCluster`, `rankClustersBySeverity`

### supabase/migrations/20260308_feedback_insights_indexes.sql (NEW)
- `idx_feedback_signals_negative_recent` -- partial index for negative signals by date
- `idx_feedback_insights_open_status` -- partial index for open insights by status
- `idx_feedback_insights_weekly_top` -- composite index for top-issues dashboard
- `idx_feedback_insights_category_recent` -- partial index for category-based dedup

### Pre-existing (from prior Phase 74 prep)
- `lib/db/feedback.ts`: getRecentNegativeSignals, getOpenInsights, updateInsightSignals, findInsightByHash, upsertInsightWithSignals
- `lib/db/feedback-admin.ts`: getTopInsightsThisWeek
- `lib/feedback/types.ts`: FeedbackCluster interface
- `trigger/feedback-intelligence.ts`: Alternative Trigger.dev job (prior agent's implementation)

## Requirements Coverage

- **REQ-I1:** Trigger.dev daily job clusters feedback by theme, ranks by frequency x severity
- **REQ-I2:** Deduplication prevents duplicates using hash matching + 4-hour window + Jaccard title similarity (>0.5) within 24 hours

## Verification

- TypeScript: 0 new errors (all errors pre-existing in funnel/ and scripts/)
- Pattern consistency: follows whatsapp-monitor.ts for Trigger.dev, sentiment.ts for LLM integration
- All key exports verified present via grep
