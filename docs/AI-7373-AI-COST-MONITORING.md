# AI Platform Cost Monitoring & Routing SOP

> Linear: **AI-7373** — "Monitor and optimize AI platform costs (Claude vs Gemini)".
> Source: Sahara Founders meeting, 2026-04-08. Last updated: 2026-06-30.

## Strategy (from the 2026-04-08 meeting)

- **Claude** — system architect / high-reasoning work.
- **Gemini** — cost-effective report & content generation (default/primary).
- **Monitor** usage and keep the Claude↔Gemini split balanced to control spend.
- **Evaluate** Perplexity and OpenClaw for agent/trading support _(open decision — see below)_.

This maps onto the existing provider tiers in `lib/ai/providers.ts`:

| Tier (`ProviderKey`) | Model | Blended $/Mtok* | Intended use |
|---|---|---|---|
| `primary`   | Gemini 3 Flash Preview | 1.75 | Default generation, reports, content |
| `fast`      | Gemini 2.0 Flash | 0.25 | Cheap/high-volume calls |
| `fallback1` | Claude Sonnet 4.5 | 9.00 | Architecture / high-reasoning, fallback |
| `fallback2` | Gemini 2.0 Flash | 3.13 | Secondary fallback |
| `reasoning` | Claude Sonnet 4.5 / Gemini 3 Flash | 9.00 | Reasoning-heavy tasks |

\* blended = average of input & output `costPerMillionTokens`, for rough comparison only.

## How to monitor spend

Two read-only surfaces, both backed by the **same** aggregation
(`lib/ai/cost-monitor.ts`) so they never disagree:

**1. Admin dashboard (AI-7363) — for the team.** Sign in to `/admin` and open
**`/admin/ai-costs`**. Shows the Claude vs Gemini spend split (stacked bar +
per-platform cards), per-provider/model table, and top analyzers, with a 7 / 30 /
90-day window selector. Served by `GET /api/admin/ai-costs?days=N` (admin-gated).

**2. CLI report (AI-7373) — for devs / cron.**

```bash
npx tsx scripts/ai-cost-report.ts            # last 30 days
npx tsx scripts/ai-cost-report.ts --days 7   # last 7 days
npx tsx scripts/ai-cost-report.ts --json     # machine-readable
# or:  npm run ai:cost-report
```

Both aggregate `ai_requests` / `ai_responses` by platform (Claude vs Gemini vs
OpenAI), provider/model, and analyzer. They report the **persisted**
`estimated_cost` once migration 003 (below) is applied and rows carry it;
otherwise they fall back to an **approximate** blended-rate figure and flag
`telemetrySchemaMissing`. Nothing is written.

## ⚠ Known blocker — telemetry is not being persisted

As of 2026-06-30 both `ai_requests` and `ai_responses` have **0 rows**, because
`lib/ai/logging.ts` is out of sync with the live table schema:

| Code (`logging.ts` INSERT) | Live table | Result |
|---|---|---|
| `ai_responses.output_tokens`, `finish_reason`, `estimated_cost` | columns do **not** exist | INSERT throws |
| `ai_requests.session_id`, `input_tokens` | columns do **not** exist | INSERT throws |
| `ai_requests.input_data` (NOT NULL, no default) | required, but not provided by the INSERT | INSERT throws |

The errors are caught and swallowed (the functions return `unlogged-<ts>` so the
real AI call doesn't fail), so this fails **silently**. **No cost data can exist
until this is fixed.**

**Fix shipped under AI-7363** — apply `supabase-migrations/003_ai_cost_telemetry.sql`
(additive, idempotent: `ADD COLUMN IF NOT EXISTS` + `DROP NOT NULL` on
`ai_requests.input_data`). `lib/ai/logging.ts` now also supplies `input_data`,
so request rows persist under either schema variant. After applying:

```bash
psql "$DATABASE_URL" -f supabase-migrations/003_ai_cost_telemetry.sql
```

Until it is applied the dashboard + CLI degrade gracefully to the approximate
basis (verified live 2026-06-30: `telemetry_schema_missing: true`, 0 rows). The
remaining step to get real numbers is to route the live AI call paths through
`trackedGenerate()` / `logAIResponse()` rather than raw `fred-client.generate`.

**Recommended fix (additive, idempotent):**

```sql
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS output_tokens  INTEGER;
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS finish_reason  TEXT;
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12,6);
ALTER TABLE ai_requests  ADD COLUMN IF NOT EXISTS session_id     UUID;
ALTER TABLE ai_requests  ADD COLUMN IF NOT EXISTS input_tokens   INTEGER;
ALTER TABLE ai_requests  ALTER COLUMN input_data DROP NOT NULL;   -- logging omits it
```

After applying, also confirm the AI call paths route through
`trackedGenerate()`/`logAIResponse()` (not raw `fred-client.generate`), or no
rows will be written even with a correct schema. Then switch
`scripts/ai-cost-report.ts` to read the stored `estimated_cost`/`output_tokens`
instead of the in-script blended approximation.

## Open decisions (need Fred / Julian — not code)

- **Evaluate Perplexity and OpenClaw** for agent/trading support — a research
  decision, no buildable scope yet.
- **Routing-policy enforcement** — should the Claude↔Gemini split be enforced in
  code (e.g. caps per tier) or just observed via this report? Decide once real
  telemetry is flowing.
