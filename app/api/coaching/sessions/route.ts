import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UserTier } from "@/lib/constants";
import {
  getUserTier,
  createTierErrorResponse,
} from "@/lib/api/tier-middleware";

// ============================================================================
// Types
// ============================================================================

interface CoachingSession {
  id: string;
  user_id: string;
  room_name: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// GET - List user's coaching sessions (paginated, most recent first)
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

    // Parse pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const offset = (page - 1) * limit;

    // Query sessions (RLS ensures user_id scoping)
    const { data: sessions, error: queryError, count } = await supabase
      .from("coaching_sessions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error("[Coaching Sessions GET] Query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch coaching sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessions: sessions as CoachingSession[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("[Coaching Sessions GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create a new coaching session (Studio tier required)
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

    // Check Studio tier
    const userTier = await getUserTier(user.id);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId: user.id,
      });
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const { roomName, notes } = body as {
      roomName?: string;
      notes?: string;
    };

    if (!roomName || typeof roomName !== "string" || !roomName.trim()) {
      return NextResponse.json(
        { error: "roomName is required" },
        { status: 400 }
      );
    }

    // Validate room name format
    if (!/^[a-zA-Z0-9_-]+$/.test(roomName.trim())) {
      return NextResponse.json(
        {
          error:
            "Invalid roomName: must contain only alphanumeric characters, hyphens, or underscores",
        },
        { status: 400 }
      );
    }

    // Insert session
    const { data: session, error: insertError } = await supabase
      .from("coaching_sessions")
      .insert({
        user_id: user.id,
        room_name: roomName.trim(),
        status: "scheduled",
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Coaching Sessions POST] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create coaching session" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { session: session as CoachingSession },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Coaching Sessions POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update a coaching session (notes, status, duration)
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
    const body = await request.json().catch(() => ({}));
    const { id, notes, status, duration_seconds } = body as {
      id?: string;
      notes?: string | null;
      status?: string;
      duration_seconds?: number;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Session id is required" },
        { status: 400 }
      );
    }

    // Build update payload (only include provided fields)
    const updates: Record<string, unknown> = {};

    if (notes !== undefined) {
      updates.notes = typeof notes === "string" ? notes.trim() || null : null;
    }

    if (status !== undefined) {
      const validStatuses = ["scheduled", "active", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (duration_seconds !== undefined) {
      if (typeof duration_seconds !== "number" || duration_seconds < 0) {
        return NextResponse.json(
          { error: "duration_seconds must be a non-negative number" },
          { status: 400 }
        );
      }
      updates.duration_seconds = Math.floor(duration_seconds);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update. Provide notes, status, or duration_seconds." },
        { status: 400 }
      );
    }

    // Update session (RLS ensures user_id scoping)
    const { data: session, error: updateError } = await supabase
      .from("coaching_sessions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[Coaching Sessions PATCH] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update coaching session" },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: session as CoachingSession });
  } catch (error) {
    console.error("[Coaching Sessions PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete a coaching session by id
// ============================================================================

export async function DELETE(request: NextRequest) {
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
    const body = await request.json().catch(() => ({}));
    const { id } = body as { id?: string };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Session id is required" },
        { status: 400 }
      );
    }

    // Delete session (RLS ensures user_id scoping)
    const { error: deleteError, count } = await supabase
      .from("coaching_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Coaching Sessions DELETE] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete coaching session" },
        { status: 500 }
      );
    }

    // count may be null if RLS prevents access or session doesn't exist
    if (count !== null && count === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("[Coaching Sessions DELETE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
