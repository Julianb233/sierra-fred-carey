import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { corsHeaders, handleCorsOptions } from "@/lib/api/cors";

/**
 * POST /api/funnel/sync
 * Receives funnel data (chat messages + journey progress) from u.joinsahara.com.
 *
 * Stores data in funnel_sessions table keyed by sessionId.
 * When a user signs up for the full platform, this data is used to pre-populate
 * their account (chat history, journey progress).
 *
 * No authentication required — the funnel is a public static app.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { sessionId, chatMessages, journeyProgress, funnelVersion } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const supabase = createServiceClient();

    // Upsert funnel session data
    const { error } = await supabase.from("funnel_sessions").upsert(
      {
        session_id: sessionId,
        chat_messages: chatMessages || [],
        journey_progress: journeyProgress || {},
        funnel_version: funnelVersion || "1.0",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (error) {
      // Table might not exist yet — fail silently in production
      console.warn("[Funnel Sync] DB error:", error.message);
      return NextResponse.json(
        { ok: true, synced: false },
        { headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { ok: true, synced: true },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error("[Funnel Sync] Error:", error);
    return NextResponse.json(
      { ok: true, synced: false },
      { headers: corsHeaders(origin) }
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
