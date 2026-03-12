import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { corsHeaders, handleCorsOptions } from "@/lib/api/cors";

/**
 * POST /api/funnel/sync
 * Receives funnel data (chat messages + journey progress) and upserts
 * into the funnel_sessions staging table.
 *
 * No auth required — the funnel is a public SPA with anonymous sessions.
 * Data is migrated to full platform tables when the user signs up.
 *
 * Linear: AI-2276
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { sessionId, chatMessages, journeyProgress, funnelVersion, exportedAt } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Validate chat messages array
    const messages = Array.isArray(chatMessages) ? chatMessages : [];

    // Validate journey progress object
    const progress =
      journeyProgress && typeof journeyProgress === "object" && !Array.isArray(journeyProgress)
        ? journeyProgress
        : {};

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("funnel_sessions")
      .upsert(
        {
          session_id: sessionId,
          chat_messages: messages,
          journey_progress: progress,
          funnel_version: funnelVersion || "1.0",
          last_synced_at: exportedAt || new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );

    if (error) {
      console.error("[funnel/sync] Upsert error:", error.message);
      return NextResponse.json(
        { error: "Failed to sync data" },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: corsHeaders(origin) }
    );
  } catch (err) {
    console.error("[funnel/sync] Error:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }
}

/**
 * OPTIONS /api/funnel/sync
 * Handle CORS preflight for cross-origin requests from the funnel.
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
