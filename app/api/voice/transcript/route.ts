/**
 * Voice Transcript API
 * Phase 82: Chat/Voice Continuity
 *
 * POST /api/voice/transcript
 * Accepts a voice call transcript, summarizes it, and injects
 * the summary into the user's chat history (episodic memory).
 *
 * Rate limit: 10/hour (one per voice call)
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/auth"
import { summarizeTranscript, injectTranscriptToChat } from "@/lib/voice/transcript-injector"
import { checkRateLimitForUser } from "@/lib/api/rate-limit"
import { captureError } from "@/lib/sentry"

// ============================================================================
// Request Validation
// ============================================================================

const transcriptEntrySchema = z.object({
  speaker: z.string(),
  text: z.string(),
  timestamp: z.string().optional(),
})

const requestSchema = z.object({
  transcript: z.array(transcriptEntrySchema).min(1, "Transcript must have at least one entry"),
})

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth()

    // Rate limit: 10 requests per hour via free tier
    const { response: rateLimitResponse } = await checkRateLimitForUser(req, userId, "free")
    if (rateLimitResponse) return rateLimitResponse

    // Parse and validate request body
    const rawBody = await req.json()
    const body = requestSchema.parse(rawBody)

    // Summarize the transcript
    const summary = await summarizeTranscript(body.transcript)

    // Inject into chat history
    await injectTranscriptToChat(userId, body.transcript, summary)

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    // requireAuth throws NextResponse on 401
    if (error instanceof NextResponse) return error

    // Zod validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: error.issues },
        { status: 400 }
      )
    }

    console.error("[Voice Transcript API] Error:", error)
    captureError(error instanceof Error ? error : new Error(String(error)), { route: "POST /api/voice/transcript" })
    return NextResponse.json(
      { success: false, error: "Failed to process transcript" },
      { status: 500 }
    )
  }
}
