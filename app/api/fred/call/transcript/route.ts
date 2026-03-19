/**
 * Voice Call Transcript API
 * Phase 82: Chat/Voice Continuity
 *
 * POST /api/fred/call/transcript
 * Accepts a voice call transcript from the client and injects it into
 * chat history via the conversation context layer (storeChannelEntry).
 *
 * The client receives real-time transcript data via LiveKit's data channel
 * during the call, then POSTs the collected transcript when the call ends.
 * This complements the existing /api/voice/transcript endpoint (which uses
 * LLM summarization) by providing a lightweight channel-entry based path.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/auth"
import {
  injectVoiceTranscriptToChat,
  type VoiceTranscriptEntry,
} from "@/lib/fred/chat-voice-bridge"

// ============================================================================
// Request Validation
// ============================================================================

const transcriptEntrySchema = z.object({
  speaker: z.enum(["user", "fred"]),
  text: z.string().min(1),
  timestamp: z.string(),
})

const requestSchema = z.object({
  roomName: z.string().min(1),
  transcript: z
    .array(transcriptEntrySchema)
    .min(1, "Transcript must have at least one entry"),
})

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth()

    const rawBody = await req.json()
    const body = requestSchema.parse(rawBody)

    // Security: verify the caller owns the room (userId appears in room name)
    if (!body.roomName.includes(userId)) {
      return NextResponse.json(
        { success: false, error: "Room does not belong to this user" },
        { status: 403 }
      )
    }

    const result = await injectVoiceTranscriptToChat(
      userId,
      body.roomName,
      body.transcript as VoiceTranscriptEntry[]
    )

    if (result.error && !result.stored) {
      console.error("[Fred Call Transcript] Storage failed completely:", result.error)
      return NextResponse.json(
        { success: false, error: "Failed to store transcript", entriesStored: 0 },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entriesStored: result.entriesStored,
      ...(result.error ? { warning: "Some entries may not have been stored" } : {}),
    })
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

    console.error("[Fred Call Transcript] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to store transcript" },
      { status: 500 }
    )
  }
}
