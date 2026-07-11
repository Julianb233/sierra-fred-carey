/**
 * Sentry Webhook — Human-Approved Bug Maintenance Bridge
 *
 * AI-12549: When Sentry captures a production error and fires an issue alert,
 * this endpoint opens a Linear issue in the "Sahara - AI Founder OS" project
 * so an engineer can pick it up. It posts an ADVISORY suggested fix and tags
 * the issue `needs-human-review` — it never auto-executes, auto-merges, or
 * auto-deploys anything (Alex LaTorre's explicit guardrail).
 *
 * POST /api/webhooks/sentry
 *
 * Setup (Sentry → Settings → Developer Settings → Internal Integration, or a
 * per-project Issue Alert with a webhook action):
 *   URL:    https://joinsahara.com/api/webhooks/sentry
 *   Events: "issue" (created / triggered)
 *   Secret: set SENTRY_WEBHOOK_SECRET to the integration's Client Secret
 *
 * Requires: LINEAR_API_KEY (already configured for the feedback/bug-report flows).
 */

import { NextRequest, NextResponse } from "next/server"
import {
  verifySentrySignature,
  normalizeSentryPayload,
  createLinearIssueFromSentry,
} from "@/lib/sentry/linear-bridge"

export const dynamic = "force-dynamic"

const LOG_PREFIX = "[Webhook: Sentry→Linear]"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Sentry sends the HMAC in `sentry-hook-signature` (internal integrations).
  const signature =
    request.headers.get("sentry-hook-signature") ??
    request.headers.get("sentry-hook-signature-v2")

  if (!verifySentrySignature(rawBody, signature)) {
    console.warn(`${LOG_PREFIX} Invalid signature`)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Only act on issue-shaped payloads (created/triggered). Sentry also pings
  // the endpoint on install/uninstall — acknowledge those without side effects.
  const resource = request.headers.get("sentry-hook-resource")
  const action = (payload as Record<string, unknown>)?.action
  if (resource && !["issue", "event_alert", "error"].includes(resource)) {
    return NextResponse.json({ ok: true, skipped: `resource=${resource}` })
  }
  if (action === "resolved" || action === "ignored") {
    return NextResponse.json({ ok: true, skipped: `action=${action}` })
  }

  const summary = normalizeSentryPayload(payload)
  if (!summary) {
    return NextResponse.json({ ok: true, skipped: "no issue in payload" })
  }

  const result = await createLinearIssueFromSentry(summary)

  if (!result.success) {
    console.error(`${LOG_PREFIX} ${result.error}`)
    // 200 so Sentry does not retry-storm on a config error; the log carries detail.
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 200 }
    )
  }

  console.log(
    `${LOG_PREFIX} ${result.duplicate ? "deduped to" : "created"} ${result.identifier} for Sentry issue ${summary.issueId}`
  )

  return NextResponse.json({
    ok: true,
    duplicate: Boolean(result.duplicate),
    linearIssue: result.identifier,
    url: result.url,
  })
}
