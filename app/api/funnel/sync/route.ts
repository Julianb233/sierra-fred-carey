import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { corsHeaders, handleCorsOptions } from "@/lib/api/cors";

/**
 * POST /api/funnel/sync
 * Receive funnel session data (chat messages + journey progress) and
 * upsert into the funnel_sessions table so it survives localStorage clears
 * and can be migrated when the visitor signs up.
 *
 * No auth required — the funnel is a static Vite app without login.
 * Linear: AI-1903
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

    const { error } = await supabase.from("funnel_sessions").upsert(
      {
        session_id: sessionId,
        chat_messages: chatMessages ?? [],
        journey_progress: journeyProgress ?? {},
        funnel_version: funnelVersion ?? "1.0",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (error) {
      console.error("[Funnel Sync] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to sync" },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error("[Funnel Sync] Error:", error);
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
