/**
 * Voice Context API
 * Phase 82: Chat/Voice Continuity
 *
 * GET /api/voice/context
 * Returns recent chat context for the voice agent preamble
 * and the last discussed topic for the LastDiscussed UI component.
 *
 * Rate limit: 20/hour (voice sessions are less frequent than chat)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { loadChatContextForVoice, formatChatForPreamble } from "@/lib/voice/chat-context-loader"
import { checkRateLimitForUser } from "@/lib/api/rate-limit"

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth()

    // Rate limit: 20 requests per hour via free tier (20/min = more than enough)
    const { response: rateLimitResponse } = await checkRateLimitForUser(req, userId, "free")
    if (rateLimitResponse) return rateLimitResponse

    const context = await loadChatContextForVoice(userId)
    const preamble = formatChatForPreamble(context)

    return NextResponse.json({
      success: true,
      messages: context.messages,
      lastTopic: context.lastTopic,
      summary: context.summary,
      preamble,
    })
  } catch (error) {
    // requireAuth throws NextResponse on 401
    if (error instanceof NextResponse) return error

    console.error("[Voice Context API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load voice context" },
      { status: 500 }
    )
  }
}
