/**
 * POST /api/funnel/sync
 *
 * Receives funnel data (chat messages + journey progress) from the funnel
 * app and persists it to the funnel_leads staging table.
 *
 * Called periodically by the funnel to ensure data survives localStorage clears.
 * No authentication required (funnel visitors are anonymous).
 *
 * Linear: AI-1903
 */

import { NextRequest, NextResponse } from "next/server"
import { upsertFunnelLead } from "@/lib/db/funnel-migration"
import type { FunnelChatMessage, FunnelJourneyProgress } from "@/lib/types/funnel-migration"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const sessionId = body.sessionId as string
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    const chatMessages = (body.chatMessages ?? []) as FunnelChatMessage[]
    const journeyProgress = (body.journeyProgress ?? {}) as FunnelJourneyProgress
    const funnelVersion = (body.funnelVersion ?? "1.0") as string

    // Basic validation: chatMessages should be an array
    if (!Array.isArray(chatMessages)) {
      return NextResponse.json(
        { error: "chatMessages must be an array" },
        { status: 400 }
      )
    }

    const result = await upsertFunnelLead({
      sessionId,
      chatMessages,
      journeyProgress,
      funnelVersion,
    })

    return NextResponse.json({ success: true, id: result.id })
  } catch (error) {
    console.error("[funnel/sync] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
