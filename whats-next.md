# What's Next — Sierra Fred Carey / Sahara

> **Last updated**: 2026-03-06
> **Accounts**: agent1, terminator
> **Status**: 🟡 In Progress — Phase 73 (Admin Dashboard & Sentiment) 2 of 4 plans executed, 2 remaining
> **Priority**: P1

## Original Task

Build v7.0 "UX Feedback Loop" milestone for Sahara (joinsahara.com) — a closed-loop feedback system where founders give feedback on FRED (the AI mentor), admins see aggregated insights, FRED improves from feedback, and founders are notified when their feedback ships. Six phases (71-76), 40 requirements.

Current branch: `pers-53-research-build-funnel-version-at-u-joinsahara`

## Work Completed

### Phase 71: Foundation & Guardrails (COMPLETE — 3/3 plans)
- **71-01**: Feedback data model — 3 tables (`feedback_signals`, `feedback_sessions`, `feedback_insights`) with RLS policies, Supabase migration
- **71-02**: Immutable prompt architecture — FRED core prompt is a constant, supplemental layer is mutable; 30 voice regression tests pass
- **71-03**: GDPR consent flow + lint/test baseline + CI delta checking script

### Phase 72: Feedback Collection (PLANS WRITTEN, NOT EXECUTED)
- `72-01-PLAN.md` and `72-02-PLAN.md` exist but have no SUMMARY files — **not executed**
- However, the feedback widget code was built as part of Phase 73 work (the foundation types/constants/db were created as prerequisites during 73-02)
- Key commits:
  - `e637a4e` — thumbs up/down widget with chat integration and tests
  - `afa5d62` — signal API route with throttle and consent checks

### Phase 73: Admin Dashboard & Sentiment (IN PROGRESS — 2/4 plans complete)

**73-01 COMPLETE** (commit `7df5406`, `a678c97`):
- `lib/feedback/sentiment.ts` — per-message LLM sentiment extraction via `generateObject`
- `lib/feedback/sentiment-aggregator.ts` — session-level aggregation, spike detection, trend analysis
- Fire-and-forget integration in both streaming and non-streaming FRED chat paths
- Heuristic fallback for short messages (<10 chars)

**73-02 COMPLETE** (commits `2ec5748`, plus foundation files):
- `app/admin/feedback/page.tsx` — full admin dashboard with filters, stats cards, category chart
- `GET /api/admin/feedback` — paginated, filterable signal list (7 filter params)
- `GET /api/admin/feedback/stats` — aggregate stats (volume, ratios, distribution, flagged sessions)
- `lib/db/feedback-admin.ts` — admin query functions
- `lib/feedback/types.ts`, `lib/feedback/constants.ts`, `lib/db/feedback.ts` — foundation layer
- Admin nav bar updated with "Feedback" link
- Dark mode, loading skeletons, empty/error states

**73-03 NOT EXECUTED** (plan exists):
- Session drill-down page at `/admin/feedback/[sessionId]`
- Sentiment arc visualization (horizontal timeline with colored dots)
- Conversation replay with inline feedback annotations
- Triage workflow (New → Reviewed → Actioned → Resolved → Communicated)
- **NOTE**: Commit `9c27986` says "session drill-down with sentiment arc and triage workflow" — this may have been partially built but no SUMMARY was written

**73-04 NOT EXECUTED** (plan exists):
- CSV export endpoint (`/api/admin/feedback/export`)
- Weekly feedback digest email via Resend + cron
- React Email template for digest
- Export CSV button on admin page

### Also shipped this session (non-v7.0 work):
- `be54f59` — Warehouse acquisition fund proposal page
- `53f1640` — 25-slide investor presentation viewer
- `24ae0d8` — Email sequence review page for client
- `e659c38` — Pitch deck content + PDF generation script
- `2cc2ef3` — Fund landing page for A Start Up Biz by Tory R Zweigle
- `f6dde02` — Fixed broken external image + chat build error

## Work Remaining

### Immediate (Phase 73 completion):

1. **Verify 73-03 status** — commit `9c27986` suggests drill-down was built. Check if `app/admin/feedback/[sessionId]/page.tsx` exists and if the triage API works. If complete, write `73-03-SUMMARY.md`. If partial, finish remaining tasks.
   - Complexity: trivial (if already built) to moderate (if partial)

2. **Verify 73-04 status** — commit `292e9fc` says "CSV export endpoint + weekly feedback digest email". Check if `app/api/admin/feedback/export/route.ts` and `app/api/cron/feedback-digest/route.ts` exist. If complete, write `73-04-SUMMARY.md`.
   - Complexity: trivial (if already built) to moderate (if partial)

3. **Write missing SUMMARY files** for any completed plans without summaries

4. **Update STATE.md** to reflect accurate completion status

### Next phases (after 73):

5. **Phase 72 summaries** — Plans 72-01 and 72-02 may have been implicitly completed (the widget and API route commits exist). Verify and write summaries.

6. **Phase 74: Intelligence & Pattern Detection** (2 plans estimated)
   - Trigger.dev daily job to cluster feedback by theme
   - Deduplication for Linear issues
   - "Top Issues This Week" admin dashboard section
   - Auto-create Linear issues from feedback clusters

7. **Phase 75: A/B Testing + Feedback Metrics** (2 plans estimated)
   - `getVariantStats()` with thumbs ratio and sentiment score
   - Statistical significance testing (chi-squared, t-test)
   - Pre-registration template for experiments
   - Admin dashboard experiment results view

8. **Phase 76: FRED Self-Improvement (RLHF-Lite) + Close-the-Loop** (3-4 plans estimated)
   - Thumbs-up/down as few-shot examples
   - Prompt patch generation from recurring complaints
   - Admin approval queue for prompt patches
   - Monthly "improvements from your feedback" digest to founders

### Carried blockers from v6.0:
- Phase 66 Plan 04 (Mux admin routes) — blocked pending Mux credentials
- Phase 70 (Boardy API) — blocked pending partnership and API credentials
- Sentry env vars not configured (AI-388)
- CI blocks on 335 lint errors + 12 test failures (pre-existing)
- Twilio credentials needed for SMS feedback parsing

## Attempted Approaches

- No failed approaches in this session — all plans executed cleanly
- Phase 72 plans were written but execution was skipped because Phase 73 created the prerequisite foundation files itself (decision 73-02-D1)
- Sentiment extraction uses `getModelForTier('free', 'structured')` — cheapest model since it's background work

## Critical Context

- **Branch**: `pers-53-research-build-funnel-version-at-u-joinsahara` — all v7.0 work is on this branch
- **Remote**: Up to date with origin
- **Build**: 221 pages compiling, `npm run build` passes
- **Tests**: 766/778 passing (pre-existing failures in profile-creation and get-started)
- **FRED's voice is protected**: Immutable core prompt + supplemental mutable layer. 30 voice regression tests must pass before any prompt modification.
- **Fire-and-forget pattern**: All feedback writes use async IIFE with error swallowing — zero latency impact on FRED responses
- **Admin auth**: All admin API routes use `requireAdminRequest()` (session cookie or `x-admin-key` header)
- **Coaching discomfort**: Distinguished from quality issues throughout — blue badges, special handling in sentiment extraction
- **Phase dependency graph**: 71 → 72 → 75 → 76 (critical path), 72 and 73 parallel after 71

## Current State

| Deliverable | Status |
|-------------|--------|
| Phase 71 (Foundation) | Complete (3/3 plans) |
| Phase 72 (Collection) | Plans written, code likely shipped, summaries missing |
| Phase 73 Plans 01-02 | Complete with summaries |
| Phase 73 Plans 03-04 | Code likely committed, summaries missing — VERIFY |
| Phase 74-76 | Not started |
| v6.0 blocked items | Still blocked (Mux, Boardy, Sentry, Twilio) |

**Git status**: Modified `STATE.md` (unstaged), untracked `73-02-SUMMARY.md` and `.claude/worktrees/`

**Unpushed commits**: Branch is up to date with origin per `git status`

**Open questions**:
- Should Phase 72 summaries be backfilled since the code was built during Phase 73?
- Are Mux/Boardy/Twilio credentials ever going to be provided, or should those phases be officially shelved?

## Related Projects

- **A Startup Biz** (`/opt/agency-workspace/a-startup-biz/`) — Fund landing page and investor presentation shipped from this repo today
- **AI Acrobatics Fleet** — FRED voice agent worker depends on fleet infrastructure
- **Obsidian Vault** — YouTube transcripts may feed into FRED's knowledge base
