import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual, createHmac } from "crypto"
import { sendFeedbackDigest } from "@/lib/rlhf/close-the-loop-digest"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * GET /api/cron/feedback-loop-digest
 * Monthly cron job to send "close-the-loop" digest emails to founders.
 * Tells them what improved based on their feedback (REQ-L2).
 *
 * Protected by CRON_SECRET header.
 * Schedule: Monthly (1st of each month at 9:00 AM UTC)
 *
 * Vercel Cron: { "path": "/api/cron/feedback-loop-digest", "schedule": "0 9 1 * *" }
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  logger.log("[Cron: Feedback Loop Digest] Starting monthly digest")

  try {
    // Verify authorization (timing-safe)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || !authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const expectedToken = `Bearer ${cronSecret}`
    const hmac1 = createHmac("sha256", "cron-auth").update(authHeader).digest()
    const hmac2 = createHmac("sha256", "cron-auth").update(expectedToken).digest()
    if (!timingSafeEqual(hmac1, hmac2)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sendFeedbackDigest()
    const duration = Date.now() - startTime

    logger.log(
      `[Cron: Feedback Loop Digest] Complete in ${duration}ms: ` +
      `${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`
    )

    return NextResponse.json({
      success: true,
      ...result,
      duration: `${duration}ms`,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Cron: Feedback Loop Digest] Failed after ${duration}ms:`, error)
    return NextResponse.json(
      { success: false, error: "Digest send failed", duration: `${duration}ms` },
      { status: 500 }
    )
  }
}
