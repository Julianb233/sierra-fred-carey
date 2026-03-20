/**
 * Improvements Digest — Close-the-Loop
 * Phase 76: RLHF-Lite (REQ-L2, REQ-L3, REQ-L4)
 *
 * Gathers recent FRED improvements driven by user feedback
 * for the monthly "improvements from your feedback" digest email.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { shouldSendEmail } from "@/lib/email/preferences"
import { sendEmail } from "@/lib/email/send"
import { getRecentlyActivatedPatches } from "@/lib/db/prompt-patches"
import type { PromptPatch } from "@/lib/feedback/types"

// ============================================================================
// Types
// ============================================================================

export interface ImprovementItem {
  topic: string
  description: string
  signalCount: number
  improvementPercent: number | null
}

export interface DigestRecipient {
  userId: string
  email: string
  founderName: string
}

export interface DigestResult {
  totalRecipients: number
  sent: number
  skipped: number
  errors: number
  improvements: ImprovementItem[]
}

// ============================================================================
// Data Gathering
// ============================================================================

/**
 * Get recent improvements for the digest email.
 * Respects 30-day staleness cutoff (REQ-L3) and severity threshold.
 */
export async function getRecentImprovements(
  sinceDays = 30,
  minSeverity: string = "medium"
): Promise<ImprovementItem[]> {
  const sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
  const patches = await getRecentlyActivatedPatches(sinceDate, minSeverity)

  return patches.map((patch: PromptPatch) => {
    const metadata = patch.metadata as Record<string, unknown>
    const title = (metadata?.title as string) || patch.topic.replace(/_/g, " ")

    let improvementPercent: number | null = null
    if (patch.thumbs_up_before !== null && patch.thumbs_up_after !== null) {
      improvementPercent = Math.round((patch.thumbs_up_after - patch.thumbs_up_before) * 100)
    }

    return {
      topic: title,
      description: patch.content.slice(0, 200),
      signalCount: patch.source_signal_ids?.length || 0,
      improvementPercent,
    }
  })
}

/**
 * Get users who are eligible for the improvements digest.
 * Must have given feedback consent and opted in to notifications.
 */
export async function getDigestRecipients(): Promise<DigestRecipient[]> {
  const supabase = createServiceClient()

  // Get users who have given feedback (have at least one signal with consent)
  const { data, error } = await supabase
    .from("feedback_signals")
    .select("user_id")
    .eq("consent_given", true)
    .limit(1000)

  if (error) {
    logger.error("[improvements-digest] Failed to query feedback users", { error })
    return []
  }

  // Deduplicate user IDs
  const userIds = [...new Set((data || []).map((s) => s.user_id))]

  if (userIds.length === 0) return []

  // Get profiles with emails
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, name")
    .in("id", userIds)

  if (profileError) {
    logger.error("[improvements-digest] Failed to query profiles", { error: profileError })
    return []
  }

  return (profiles || [])
    .filter((p) => p.email)
    .map((p) => ({
      userId: p.id,
      email: p.email as string,
      founderName: (p.name as string) || "Founder",
    }))
}

// ============================================================================
// Digest Sending (REQ-L2, REQ-L4)
// ============================================================================

/**
 * Send the monthly improvements digest to all eligible users.
 * Checks notification preferences (REQ-L4) before sending.
 */
export async function sendImprovementsDigest(): Promise<DigestResult> {
  const improvements = await getRecentImprovements()

  if (improvements.length === 0) {
    logger.info("[improvements-digest] No improvements to report, skipping digest")
    return {
      totalRecipients: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      improvements: [],
    }
  }

  const recipients = await getDigestRecipients()
  const result: DigestResult = {
    totalRecipients: recipients.length,
    sent: 0,
    skipped: 0,
    errors: 0,
    improvements,
  }

  // Dynamic import to avoid circular deps and keep bundle clean
  const { FeedbackImprovementsEmail } = await import(
    "@/components/email/feedback-improvements"
  )

  for (const recipient of recipients) {
    try {
      // Check notification preferences (REQ-L4)
      const shouldSend = await shouldSendEmail(recipient.userId, "feedback_improvement")
      if (!shouldSend) {
        result.skipped++
        continue
      }

      const emailResult = await sendEmail({
        to: recipient.email,
        subject: "FRED got better because of you",
        react: FeedbackImprovementsEmail({
          founderName: recipient.founderName,
          improvements,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com",
        }),
        tags: [
          { name: "category", value: "feedback_improvement" },
        ],
        tracking: {
          userId: recipient.userId,
          emailType: "feedback_improvement",
          emailSubtype: "monthly_digest",
        },
      })

      if (emailResult.success) {
        result.sent++
      } else {
        result.errors++
        logger.warn("[improvements-digest] Failed to send to user", {
          userId: recipient.userId,
          error: emailResult.error,
        })
      }
    } catch (error) {
      result.errors++
      logger.error("[improvements-digest] Error sending digest", {
        userId: recipient.userId,
        error,
      })
    }
  }

  logger.info("[improvements-digest] Digest send complete", result)
  return result
}
