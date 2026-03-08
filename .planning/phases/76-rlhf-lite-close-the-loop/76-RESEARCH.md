# Phase 76 Research — RLHF-Lite + Close-the-Loop

## Domain Research

### What exists already

1. **Feedback data model** (Phase 71): `feedback_signals`, `feedback_sessions`, `feedback_insights` tables with full RLS
2. **Feedback collection** (Phase 72): Thumbs up/down on FRED chat responses, fire-and-forget writes
3. **Clustering engine** (Phase 74): `lib/feedback/clustering.ts` with LLM-based theme grouping, severity computation, hash-based dedup, daily Trigger.dev job
4. **A/B testing** (Phase 75): `lib/ai/ab-testing.ts` with `createExperiment()`, `getVariantStatsWithFeedback()`, pre-registration, auto-promotion, significance testing (chi-squared + t-test)
5. **Prompt architecture** (Phase 71): `lib/ai/prompt-layers.ts` — immutable `FRED_CORE_PROMPT` (Object.freeze) + mutable `SupplementalPromptPatch` array, `buildPromptWithSupplements()` assembler
6. **Admin dashboard**: `components/admin/feedback-dashboard.tsx`, `components/admin/prompt-editor.tsx`, `components/admin/experiment-feedback-card.tsx`
7. **DB SQL helper**: `lib/db/supabase-sql.ts` for raw SQL via `sql` tagged template

### What Phase 76 needs to build

**RLHF-Lite (REQ-R1 through REQ-R5):**
- REQ-R1: Store thumbs-up as positive few-shot examples, thumbs-down as negative examples
- REQ-R2: Generate prompt patches from recurring complaint patterns
- REQ-R3: Prompt version tracking in DB with traceability to source feedback
- REQ-R4: Admin approval queue for patches, triggerable as A/B tests
- REQ-R5: Post-deploy thumbs-up tracking over 2-week window

**Close-the-Loop (REQ-L1 through REQ-L4):**
- REQ-L1: Track which feedback contributed to which patches/fixes
- REQ-L2: Monthly digest — "improvements from your feedback" via Resend
- REQ-L3: 30-day staleness cutoff, severity threshold
- REQ-L4: Opt-in notification preferences respected

### Key Architecture Decisions

1. **New DB table: `prompt_patches`** — stores generated patches with version history, source feedback IDs, status (draft/pending/approved/deployed/rejected), and linked A/B experiment ID
2. **New DB table: `few_shot_examples`** — stores positive/negative examples from feedback signals with message content, topic, and quality score
3. **Extend existing `SupplementalPromptPatch` type** to load from DB instead of hardcoded array
4. **Patch generation via LLM** — when clustering finds recurring complaints, generate a supplemental prompt instruction using the feedback context
5. **Admin approval workflow** — patches go through draft -> pending -> approved -> deployed (via A/B test) -> graduated
6. **Feedback-to-fix linking** — `prompt_patches.source_signal_ids` array links back to original feedback
7. **2-week validation window** — after deployment, query feedback metrics scoped to patch topic
8. **Monthly digest** — Resend email template, cron job, respects notification preferences

### Patterns to follow

- Trigger.dev daily jobs: same pattern as `trigger/feedback-intelligence.ts`
- DB queries: same pattern as `lib/db/feedback.ts` (createServiceClient)
- A/B test creation: use existing `createExperiment()` from `lib/ai/ab-testing.ts`
- Admin components: shadcn/ui Card/Table/Badge/Dialog pattern from existing admin
- Email: Resend + React Email pattern (check existing email templates)
- Prompt assembly: extend `buildPromptWithSupplements()` to load DB patches

### Plan structure (3 plans, 3 waves)

1. **Plan 01 (Wave 1)**: DB schema + few-shot example storage + patch generation (REQ-R1, REQ-R2)
2. **Plan 02 (Wave 2)**: Prompt version tracking + admin approval queue + performance tracking + runtime loading (REQ-R3, REQ-R4, REQ-R5)
3. **Plan 03 (Wave 3)**: Feedback-to-improvement linking + monthly digest email + notification preferences (REQ-L1, REQ-L2, REQ-L3, REQ-L4)

## RESEARCH COMPLETE
