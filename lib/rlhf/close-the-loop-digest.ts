/**
 * Close-the-Loop Digest
 *
 * Phase 76 (REQ-L2, REQ-L3, REQ-L4): Monthly digest email telling founders
 * what improved based on their feedback. Sent via Resend to opted-in users
 * with 30-day staleness cutoff and severity threshold.
 */

import { sql } from "@/lib/db/supabase-sql"
import { getImprovementsForUser, markAsNotified } from "@/lib/rlhf/improvement-tracker"
import type { ImprovementEntry } from "@/lib/rlhf/improvement-tracker"
import { logger } from "@/lib/logger"

// Lazy Resend initialization
let resendInstance: { emails: { send: (opts: Record<string, unknown>) => Promise<{ data?: unknown; error?: unknown }> } } | null = null

function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error("RESEND_API_KEY not configured")
    // Dynamic require to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require("resend")
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

// ============================================================================
// Eligible Users
// ============================================================================

interface EligibleUser {
  userId: string
  email: string
  firstName: string
}

/**
 * Get users eligible for the feedback digest.
 * REQ-L4: Only opted-in users who have given feedback and haven't
 * received a digest in the past 28 days.
 */
export async function getEligibleUsers(): Promise<EligibleUser[]> {
  const twentyEightDaysAgo = new Date(
    Date.now() - 28 * 24 * 60 * 60 * 1000
  ).toISOString()

  const rows = await sql`
    SELECT
      fdp.user_id,
      p.email,
      COALESCE(p.full_name, p.display_name, 'Founder') as first_name
    FROM feedback_digest_preferences fdp
    JOIN profiles p ON p.id = fdp.user_id
    WHERE fdp.enabled = true
      AND (fdp.last_sent_at IS NULL OR fdp.last_sent_at < ${twentyEightDaysAgo})
      AND EXISTS (
        SELECT 1 FROM feedback_signals fs WHERE fs.user_id = fdp.user_id
      )
  `

  return rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      userId: String(row.user_id),
      email: String(row.email),
      firstName: String(row.first_name).split(" ")[0] || "Founder",
    }
  })
}

// ============================================================================
// Digest Content
// ============================================================================

export interface DigestContent {
  improvements: ImprovementEntry[]
  shouldSend: boolean
}

/**
 * Build digest content for a specific user.
 * REQ-L3: Only unnotified improvements from past 30 days, severity >= medium.
 */
export async function buildDigestContent(userId: string): Promise<DigestContent> {
  const improvements = await getImprovementsForUser(userId)

  // Filter to unnotified improvements only
  const unnotified = improvements.filter((imp) => !imp.notifiedAt)

  return {
    improvements: unnotified,
    shouldSend: unnotified.length >= 1,
  }
}

// ============================================================================
// Email Sending
// ============================================================================

/**
 * Build HTML email for the digest (inline, no React Email dependency needed).
 */
function buildDigestEmailHtml(
  firstName: string,
  improvements: ImprovementEntry[],
  unsubscribeUrl: string
): string {
  const improvementItems = improvements
    .map(
      (imp) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #1a1a1a;">${imp.title}</p>
          ${imp.description ? `<p style="margin: 0; color: #666; font-size: 14px;">${imp.description}</p>` : ""}
        </td>
      </tr>`
    )
    .join("")

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #ff6a1a; font-size: 24px; margin: 0;">Sahara</h1>
    <p style="color: #666; margin: 8px 0 0; font-size: 14px;">Your feedback is making FRED better</p>
  </div>

  <p style="color: #333; line-height: 1.6;">Hi ${firstName},</p>

  <p style="color: #333; line-height: 1.6;">
    Thanks to your feedback, we've made these improvements to FRED this month:
  </p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    ${improvementItems}
  </table>

  <p style="color: #333; line-height: 1.6;">
    Your input directly shapes how FRED coaches founders. Keep the feedback coming!
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    You're receiving this because you've given feedback to FRED and opted in to improvement notifications.
    <br>
    <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe from feedback digests</a>
  </p>
</body>
</html>`
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Send feedback digest emails to all eligible users.
 * Returns counts of sent, skipped, and errored sends.
 */
export async function sendFeedbackDigest(): Promise<{
  sent: number
  skipped: number
  errors: number
}> {
  const result = { sent: 0, skipped: 0, errors: 0 }

  const users = await getEligibleUsers()
  logger.log(`[digest] Found ${users.length} eligible users`)

  if (users.length === 0) {
    return result
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com"

  for (const user of users) {
    try {
      const { improvements, shouldSend } = await buildDigestContent(user.userId)

      if (!shouldSend) {
        result.skipped++
        continue
      }

      const unsubscribeUrl = `${appUrl}/settings/notifications?unsubscribe=feedback-digest`
      const html = buildDigestEmailHtml(user.firstName, improvements, unsubscribeUrl)

      const resend = getResend()
      if (!resend) {
        logger.log(`[digest] Resend not configured, skipping ${user.email}`)
        results.skipped++
        continue
      }
      const { error } = await resend.emails.send({
        from: "FRED at Sahara <fred@joinsahara.com>",
        to: user.email,
        subject: `Your feedback made FRED better — ${improvements.length} improvement${improvements.length !== 1 ? "s" : ""} this month`,
        html,
      })

      if (error) {
        logger.log(`[digest] Failed to send to ${user.email}: ${JSON.stringify(error)}`)
        result.errors++
        continue
      }

      // Mark improvements as notified
      await markAsNotified(improvements.map((i) => i.id))

      // Update last_sent_at
      await sql`
        UPDATE feedback_digest_preferences
        SET last_sent_at = NOW(), updated_at = NOW()
        WHERE user_id = ${user.userId}
      `

      result.sent++
      logger.log(`[digest] Sent digest to ${user.email} (${improvements.length} improvements)`)
    } catch (err) {
      logger.log(`[digest] Error for user ${user.userId}: ${err}`)
      result.errors++
    }
  }

  logger.log(`[digest] Complete: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`)
  return result
}
