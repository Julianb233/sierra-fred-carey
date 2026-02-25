import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

interface VideoParticipant {
  id: string;
  room_id: string | null;
  user_id: string | null;
  participant_name: string;
  participant_identity: string;
  role: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
  connection_quality: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// POST - Record participant join event
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' } },
        { status: 400 }
      );
    }
    const { sessionId, name } = body as {
      sessionId?: string;
      name?: string;
    };

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Verify the coaching session exists and belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from("coaching_sessions")
      .select("id, room_name")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Find or create a video_rooms record for this coaching session
    let roomId: string | null = null;
    const { data: existingRoom } = await supabase
      .from("video_rooms")
      .select("id")
      .eq("room_name", session.room_name)
      .single();

    if (existingRoom) {
      roomId = existingRoom.id;
    } else {
      const { data: newRoom, error: roomError } = await supabase
        .from("video_rooms")
        .insert({
          room_name: session.room_name,
          host_user_id: user.id,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (roomError) {
        console.error("[Participants POST] Room creation error:", roomError);
        return NextResponse.json(
          { error: "Failed to create room record" },
          { status: 500 }
        );
      }
      roomId = newRoom.id;
    }

    // Insert participant record
    const { data: participant, error: insertError } = await supabase
      .from("video_participants")
      .insert({
        room_id: roomId,
        user_id: user.id,
        participant_name: name.trim(),
        participant_identity: user.id,
        role: "host",
        joined_at: new Date().toISOString(),
        metadata: { coaching_session_id: sessionId },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Participants POST] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to record participant join" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { participant: participant as VideoParticipant },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Participants POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Record participant leave event
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' } },
        { status: 400 }
      );
    }
    const { participantId } = body as {
      participantId?: string;
    };

    if (!participantId || typeof participantId !== "string") {
      return NextResponse.json(
        { error: "participantId is required" },
        { status: 400 }
      );
    }

    // Fetch the participant record to calculate duration
    const { data: existing, error: fetchError } = await supabase
      .from("video_participants")
      .select("id, joined_at")
      .eq("id", participantId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    const leftAt = new Date();
    const joinedAt = new Date(existing.joined_at);
    const durationSeconds = Math.floor(
      (leftAt.getTime() - joinedAt.getTime()) / 1000
    );

    // Update participant with leave time and duration
    const { data: participant, error: updateError } = await supabase
      .from("video_participants")
      .update({
        left_at: leftAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", participantId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[Participants PATCH] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update participant" },
        { status: 500 }
      );
    }

    return NextResponse.json({ participant: participant as VideoParticipant });
  } catch (error) {
    console.error("[Participants PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List participants for a session
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify the coaching session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from("coaching_sessions")
      .select("id, room_name")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Find the video room for this session
    const { data: room } = await supabase
      .from("video_rooms")
      .select("id")
      .eq("room_name", session.room_name)
      .single();

    if (!room) {
      // No room record means no participants joined yet
      return NextResponse.json({ participants: [], count: 0 });
    }

    // Get all participants for this room
    const { data: participants, error: queryError } = await supabase
      .from("video_participants")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });

    if (queryError) {
      console.error("[Participants GET] Query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch participants" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      participants: (participants || []) as VideoParticipant[],
      count: (participants || []).length,
    });
  } catch (error) {
    console.error("[Participants GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
