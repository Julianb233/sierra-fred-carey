# AI-6487 — Internal Token/Credit Usage Tracking

Underpins throttling + tiered pricing and provides the VC success metrics Fred
outlined (10+ min sessions, return-within-48h).

## Components

| Layer | Path | Purpose |
|---|---|---|
| Schema | `lib/db/migrations/082_usage_tracking.sql` | `usage_records` + `usage_sessions` tables (indexes, RLS, FKs to `auth.users`) |
| Credit model | `lib/usage/credits.ts` | Pure logic: per-action costs + per-tier allowances (env-overridable). Unit-tested. |
| Data layer | `lib/db/usage.ts` | `recordUsage`, `getCreditStatus`, `getUsageHistory`, session tracking, admin aggregates + session metrics |
| User API | `app/api/usage/route.ts` | `GET` — remaining credits + history |
| Track API | `app/api/usage/track/route.ts` | `POST` — record an action (402 when over budget) |
| Session API | `app/api/usage/session/route.ts` | `POST` — heartbeat/end for duration tracking |
| Admin API | `app/api/admin/usage/route.ts` | `GET` — aggregate usage + VC metrics (admin-gated) |
| Admin UI | `app/admin/usage/page.tsx` | "Usage" tab in the admin panel |

## Applying the migration

```bash
npx tsx scripts/run-migration.ts lib/db/migrations/082_usage_tracking.sql
```

(Uses the Supabase service client like the other migrations.)

## Credit model (defaults — tune via env)

Action costs (`lib/usage/credits.ts` → `DEFAULT_ACTION_COSTS`): chat_message 1,
voice_call_minute 10, report_generation 25, pitch_deck_review 50,
investor_score 20, strategy_doc 15, agent_run 30, document_upload 5,
document_search 2, investor_match 20.

Tier monthly allowances (`DEFAULT_TIER_CREDIT_ALLOWANCE`): FREE 100, BUILDER
1 000, PRO 5 000, STUDIO 25 000.

Override without a deploy via `USAGE_ACTION_COSTS` / `USAGE_TIER_ALLOWANCE` JSON
env vars (see `.env.example`).

## Instrumenting a call site

Record consumption right after a successful action. `recordUsage` is fail-soft
(never throws into a user request):

```ts
import { recordUsage } from "@/lib/db/usage";
import { getActionCost } from "@/lib/usage/credits";

// after generating a report for `userId`
await recordUsage(userId, "report_generation", { metadata: { reportId } });
```

To enforce a budget *before* doing expensive work, check first (the
`/api/usage/track` route already does this and returns 402 when over budget):

```ts
import { getCreditStatus } from "@/lib/db/usage";
import { getActionCost } from "@/lib/usage/credits";

const status = await getCreditStatus(userId);
if (status.remaining < getActionCost("pitch_deck_review")) {
  // surface the paywall (see components/tier/paywall-modal.tsx)
}
```

For session duration, have the authenticated client `POST /api/usage/session`
on activity (and on an interval, e.g. every 60s) and `{ event: "end" }` on
logout/tab close.

## Follow-ups (not in the initial PR)

- Wire `recordUsage` into the live LLM/voice/report routes (placement is a
  product decision — left to Alex/Julian to position precisely).
- Optional: a Postgres RPC for server-side aggregation if usage volume grows
  past JS-side aggregation comfort (current approach is fine for the early
  cohort).
- Hook the credit meter into the existing `components/tier/paywall-modal.tsx`
  upgrade flow.
