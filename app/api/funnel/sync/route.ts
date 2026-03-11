import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { corsHeaders, handleCorsOptions } from "@/lib/api/cors";

/**
 * POST /api/funnel/sync
 * Receives funnel session data (chat messages + journey progress) from
 * the static funnel app at u.joinsahara.com and persists it to Supabase.
 *
 * No auth required — funnel users don't have accounts yet.
 * Data is keyed by anonymous sessionId for later migration.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const contentType = request.headers.get("content-type") || "";
    let body;

    // sendBeacon sends as text/plain, regular fetch sends as application/json
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      body = JSON.parse(text);
    }

    const { sessionId, chatMessages, journeyProgress, funnelVersion } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const supabase = createServiceClient();

    await supabase.from("funnel_sessions").upsert(
      {
        session_id: sessionId,
        chat_messages: chatMessages || [],
        journey_progress: journeyProgress || {},
        funnel_version: funnelVersion || "1.0",
        message_count: Array.isArray(chatMessages) ? chatMessages.length : 0,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    return NextResponse.json(
      { ok: true },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error("[Funnel Sync] Error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500, headers: corsHeaders(origin) }
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
