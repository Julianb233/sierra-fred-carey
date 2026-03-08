# Phase 75 Research: A/B Testing + Feedback Metrics

## Domain: Statistical Significance for Sahara's User Base

### Current State

**Existing A/B testing infrastructure:**
- `lib/ai/ab-testing.ts` — Core experiment engine: `getVariantAssignment()`, `getVariantStats()`, `createExperiment()`, `endExperiment()`
- `lib/monitoring/ab-test-metrics.ts` — Metrics collection: `collectVariantMetrics()`, `compareExperimentVariants()`, Z-test significance
- `lib/experiments/auto-promotion-engine.ts` — Auto-promotion with safety checks
- `lib/experiments/auto-promotion-config.ts` — Configurable thresholds (default: 95% confidence, 1000 sample, 5% improvement)
- `app/admin/ab-tests/page.tsx` — Basic admin UI (shows tests, variants, significance bar, end/adjust traffic)

**Existing feedback infrastructure (from Phases 71-73):**
- `lib/feedback/types.ts` — FeedbackSignal, FeedbackSession, FeedbackInsight types
- `lib/feedback/sentiment.ts` — Per-message sentiment extraction (LLM + heuristic fallback)
- `lib/feedback/sentiment-aggregator.ts` — Session-level sentiment aggregation + spike detection
- `lib/db/feedback.ts` — DB helpers for signals, sessions, insights
- `feedback_signals` table with `rating`, `sentiment_score`, `sentiment_confidence`, `signal_type`
- `feedback_sessions` table with `sentiment_avg`, `sentiment_trend`, `flagged`

**Gap analysis for Phase 75 requirements:**
1. `getVariantStats()` currently returns: `variantName`, `totalRequests`, `avgLatency`, `errorRate` — NO feedback metrics
2. Significance testing exists via Z-test on success rates, but NOT for feedback-specific metrics (thumbs, sentiment)
3. No pre-registration template or workflow
4. Admin dashboard shows basic variant comparison but no feedback overlay

### Statistical Methods

**REQ-A2: Significance testing approach:**

For Sahara's early user base (~200 founders at launch), 500 sessions/variant is a high bar. This is intentional — prevents premature conclusions from small samples.

- **Chi-squared test** for binary feedback (thumbs up vs thumbs down): Appropriate for categorical data. Use Pearson's chi-squared with Yates' continuity correction for 2x2 tables.
- **Welch's t-test** for continuous sentiment scores: Better than Student's t-test because it doesn't assume equal variance. Sentiment scores (-1 to 1) will likely have different variance across variants.
- **Minimum 500 sessions/variant**: At 200 founders, this means ~5 sessions each on average. With daily usage, achievable in ~1 week per experiment.

**Implementation notes:**
- Chi-squared: `chi2 = sum((O-E)^2/E)` with 1 df for 2 variants. p-value from chi-squared CDF.
- Welch's t-test: `t = (x1-x2) / sqrt(s1^2/n1 + s2^2/n2)`, df via Welch-Satterthwaite.
- Both can be implemented in pure TypeScript (no external stats library needed). The CDF approximations are well-documented.

### Architecture Decisions

1. **Extend, don't replace** `getVariantStats()` — add feedback fields to existing return type
2. **Join feedback_signals to ab_variants** via session_id linkage or variant_id on ai_requests
3. **Pre-registration stored in ab_experiments metadata JSONB** — avoid new table for simple template
4. **Session completion = session has ended_at AND sentiment_trend != 'spike_negative'**
5. **Admin dashboard enhancement** — extend existing `app/admin/ab-tests/page.tsx`, don't create new page

### Key Files to Modify

- `lib/ai/ab-testing.ts` — Extend `getVariantStats()` return type + query
- `lib/monitoring/ab-test-metrics.ts` — Add feedback-aware significance tests
- `lib/feedback/experiment-metrics.ts` (NEW) — Feedback metrics aggregation for experiments
- `lib/statistics/significance.ts` (NEW) — Chi-squared + t-test implementations
- `app/admin/ab-tests/page.tsx` — Enhance UI with feedback columns + pre-registration
- `app/api/admin/ab-tests/route.ts` — API for experiment CRUD + pre-registration
- `supabase/migrations/` — Add variant_id to feedback_signals or create linking table

### Data Linkage Strategy

The key challenge: linking feedback signals to experiment variants.

**Option A: Add variant_id to feedback_signals** — Direct FK. Simple but requires backfilling.
**Option B: Join through ai_requests** — feedback_signals.message_id -> ai_requests.id -> ai_requests.variant_id. No schema change but complex join.
**Option C: Join through feedback_sessions** — Add variant_id to feedback_sessions. One variant per session is reasonable.

**Decision: Option A** — Add `variant_id UUID REFERENCES ab_variants(id)` to `feedback_signals`. Clean, queryable, and the feedback collection pipeline (Phase 72) already knows the session context where variant assignment happened. Migration is additive (nullable column).

---

*Research completed: 2026-03-08*
