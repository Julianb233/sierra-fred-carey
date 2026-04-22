/**
 * Linear Webhook — Issue State Change Handler
 *
 * Receives webhook events from Linear when issues change state.
 * When a Sahara project issue moves to "Done"/"Completed", sends a
 * resolution notification to the "Sahara Founders" WhatsApp group.
 *
 * POST /api/webhooks/linear
 *
 * Setup: In Linear → Settings → API → Webhooks → Create webhook
 *   URL: https://joinsahara.com/api/webhooks/linear
 *   Events: "Issues" (state changes)
 *   Secret: Set LINEAR_WEBHOOK_SECRET env var
 *
 * Linear: AI-4113
 */

import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { sendResolutionNotification } from "@/lib/feedback/whatsapp-reply"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const LOG_PREFIX = "[Webhook: Linear]"
const WHATSAPP_GROUP_NAME = "Sahara Founders"
const SAHARA_PROJECT_NAME = "Sahara - AI Founder OS"

interface LinearWebhookPayload {
  action: "create" | "update" | "remove"
  type: "Issue" | "Comment" | "Project"
  data: {
    id: string
    identifier: string
    title: string
    state?: { name: string; type: string }
    project?: { id: string; name: string }
    labelIds?: string[]
    labels?: Array<{ id: string; name: string }>
  }
  updatedFrom?: {
    stateId?: string
    state?: { name: string; type: string }
  }
}

function verifySignature(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.LINEAR_WEBHOOK_SECRET
  if (!secret) {
    // If no secret configured, skip verification (log warning)
    console.warn(`${LOG_PREFIX} LINEAR_WEBHOOK_SECRET not set — skipping signature verification`)
    return true
  }
  if (!signature) return false

  const hmac = createHmac("sha256", secret)
  hmac.update(body)
  const expected = hmac.digest("hex")

  return expected === signature
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("linear-signature")

  // Verify webhook signature
  if (!verifySignature(rawBody, signature)) {
    console.warn(`${LOG_PREFIX} Invalid signature`)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: LinearWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Only handle issue updates
  if (payload.type !== "Issue" || payload.action !== "update") {
    return NextResponse.json({ ok: true, skipped: "not an issue update" })
  }

  const { data, updatedFrom } = payload

  // Only handle state transitions to "completed" type
  const isNowCompleted = data.state?.type === "completed"
  const wasNotCompleted = updatedFrom?.stateId !== undefined // state changed
  const wasCompletedBefore = updatedFrom?.state?.type === "completed"

  if (!isNowCompleted || !wasNotCompleted || wasCompletedBefore) {
    return NextResponse.json({ ok: true, skipped: "not a completion transition" })
  }

  // Filter to Sahara project only
  if (data.project?.name && data.project.name !== SAHARA_PROJECT_NAME) {
    return NextResponse.json({ ok: true, skipped: "not Sahara project" })
  }

  console.log(
    `${LOG_PREFIX} Issue completed: ${data.identifier} — ${data.title}`
  )

  // Send WhatsApp resolution notification
  const result = await sendResolutionNotification(
    WHATSAPP_GROUP_NAME,
    data.title,
    data.identifier
  )

  if (!result.success) {
    console.error(
      `${LOG_PREFIX} WhatsApp notification failed: ${result.error}`
    )
  } else {
    console.log(
      `${LOG_PREFIX} WhatsApp notification sent for ${data.identifier}`
    )
  }

  // Also update feedback_insights if this issue was created from feedback
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: insight } = await supabase
      .from("feedback_insights")
      .select("id")
      .eq("linear_issue_id", data.id)
      .eq("status", "actioned")
      .single()

    if (insight) {
      await supabase
        .from("feedback_insights")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", insight.id)

      console.log(
        `${LOG_PREFIX} Feedback insight ${insight.id} marked resolved`
      )
    }
  } catch {
    // Non-critical — the cron fallback will catch this
  }

  return NextResponse.json({
    ok: true,
    issue: data.identifier,
    title: data.title,
    notified: result.success,
  })
}
