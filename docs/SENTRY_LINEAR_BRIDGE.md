# Sentry → Linear Bridge (Human-Approved Bug Maintenance)

**Linear:** AI-12549 · **Source:** Sahara Founders sync (2026-07-09), Alex LaTorre's ask.

## What it does

When Sentry captures a production error and fires an issue alert, this bridge
opens a **Linear issue** in the `Sahara - AI Founder OS` project so an engineer
can pick it up. It also posts an **advisory suggested fix** as a comment.

## The guardrail (non-negotiable)

Alex asked that the agent **suggest changes for human review — never
auto-execute**. This implementation enforces that:

- The Linear issue is created in the team's default/triage state. A **human must
  action it**; nothing is moved to Done automatically.
- The issue is tagged **`needs-human-review`** (created automatically if the
  label doesn't exist yet).
- The suggested fix is posted as a comment with an explicit banner:
  _"🤖 Automated suggestion — HUMAN REVIEW REQUIRED. Do NOT auto-merge or
  auto-deploy."_
- **No code is changed, no PR is opened, no deploy is triggered** from this path.

## Components

| Path | Role |
|---|---|
| `lib/sentry/linear-bridge.ts` | Signature verify, payload normalize, priority map, suggestion heuristic, dedup + Linear issue creation |
| `app/api/webhooks/sentry/route.ts` | `POST /api/webhooks/sentry` handler |
| `lib/sentry/linear-bridge.test.ts` | Unit tests for the pure logic |

## Setup

1. **Sentry** → Settings → Developer Settings → **New Internal Integration**
   (or a per-project Issue Alert with a Webhook action).
   - Webhook URL: `https://joinsahara.com/api/webhooks/sentry`
   - Enable the **issue** resource / alert events.
2. Copy the integration's **Client Secret** into `SENTRY_WEBHOOK_SECRET`.
3. Ensure `LINEAR_API_KEY` is set (already used by the feedback + bug-report flows).

## Payload handling

`normalizeSentryPayload` accepts the common Sentry shapes:

- internal-integration `data.issue` resource
- legacy issue-alert `data.event` / `data.event_alert.event` / top-level `event`

Repeat alerts for the same error are **deduplicated** by exact issue title
(`[Sentry] <title>`), so a noisy error won't spam Linear.

## Priority mapping

| Sentry level | Linear priority |
|---|---|
| fatal | 1 (Urgent) |
| error | 2 (High) |
| warning | 3 (Normal) |
| info / other | 4 (Low) |

## End-to-end test (manual)

```bash
# Signed sample payload → expect a Linear issue + a suggestion comment, no auto-exec
BODY='{"action":"created","data":{"issue":{"id":"e2e-123","shortId":"SAHARA-E2E","title":"E2E test error","culprit":"app/test.ts","level":"error","permalink":"https://sentry.io/x","count":1}}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SENTRY_WEBHOOK_SECRET" | awk '{print $2}')
curl -sS -X POST https://joinsahara.com/api/webhooks/sentry \
  -H 'Content-Type: application/json' \
  -H "sentry-hook-resource: issue" \
  -H "sentry-hook-signature: $SIG" \
  --data "$BODY"
```

Verify in Linear: a new `[Sentry] E2E test error` issue exists in
`Sahara - AI Founder OS`, tagged `needs-human-review`, with the advisory comment.

## Remaining scoping (owner: Alex LaTorre — see AI-12549)

The "Century agent" routing and Alex's sign-off are external to this repo. This
bridge is the concrete, testable Sentry→Linear half that was buildable now; the
Century-agent front-end can POST the same normalized shape to this endpoint (or
call `createLinearIssueFromSentry` directly) once its API is defined.
