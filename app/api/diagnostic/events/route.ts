import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { requireAuth } from "@/lib/auth";

/**
 * Diagnostic Events API
 * Logs and retrieves diagnostic events for audit trail
 *
 * Event types:
 * - 'signal_detected' - A positioning or investor signal was detected
 * - 'framework_introduced' - A framework was introduced
 * - 'assessment_completed' - A formal assessment was completed
 * - 'clarity_updated' - Positioning or investor clarity was updated
 */

type EventType =
  | "signal_detected"
  | "framework_introduced"
  | "assessment_completed"
  | "clarity_updated";

type FrameworkType = "positioning" | "investor";

interface DiagnosticEvent {
  id: number;
  userId: string;
  eventType: EventType;
  framework: FrameworkType | null;
  signalType: string | null;
  signalContext: string | null;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  createdAt: string;
}

interface CreateEventInput {
  eventType: EventType;
  framework?: FrameworkType;
  signalType?: string;
  signalContext?: string;
  stateBefore?: Record<string, unknown>;
  stateAfter?: Record<string, unknown>;
}

const VALID_EVENT_TYPES: EventType[] = [
  "signal_detected",
  "framework_introduced",
  "assessment_completed",
  "clarity_updated",
];

const VALID_FRAMEWORKS: FrameworkType[] = ["positioning", "investor"];

/**
 * POST /api/diagnostic/events
 * Log a diagnostic event
 *
 * SECURITY: Requires authentication - events are tied to users
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body: CreateEventInput = await request.json();

    const {
      eventType,
      framework,
      signalType,
      signalContext,
      stateBefore = {},
      stateAfter = {},
    } = body;

    // Validate event type
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        {
          success: false,
          error: `eventType must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate framework if provided
    if (framework && !VALID_FRAMEWORKS.includes(framework)) {
      return NextResponse.json(
        {
          success: false,
          error: `framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Insert event
    const result = await sql`
      INSERT INTO diagnostic_events (
        user_id,
        event_type,
        framework,
        signal_type,
        signal_context,
        state_before,
        state_after
      )
      VALUES (
        ${userId},
        ${eventType},
        ${framework || null},
        ${signalType || null},
        ${signalContext?.slice(0, 500) || null},
        ${JSON.stringify(stateBefore)}::jsonb,
        ${JSON.stringify(stateAfter)}::jsonb
      )
      RETURNING
        id,
        user_id as "userId",
        event_type as "eventType",
        framework,
        signal_type as "signalType",
        signal_context as "signalContext",
        state_before as "stateBefore",
        state_after as "stateAfter",
        created_at as "createdAt"
    `;

    return NextResponse.json(
      {
        success: true,
        data: result[0] as DiagnosticEvent,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[POST /api/diagnostic/events]", error);
    return NextResponse.json(
      { success: false, error: "Failed to log diagnostic event" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/diagnostic/events
 * Get diagnostic event history with optional filters
 *
 * Query params:
 * - eventType: Filter by event type
 * - framework: Filter by framework
 * - limit: Max number of events (default 100)
 * - offset: Pagination offset
 *
 * SECURITY: Requires authentication - only returns user's own events
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType") as EventType | null;
    const framework = searchParams.get("framework") as FrameworkType | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate filters if provided
    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        {
          success: false,
          error: `eventType must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (framework && !VALID_FRAMEWORKS.includes(framework)) {
      return NextResponse.json(
        {
          success: false,
          error: `framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Query events with filters
    const events = await sql`
      SELECT
        id,
        user_id as "userId",
        event_type as "eventType",
        framework,
        signal_type as "signalType",
        signal_context as "signalContext",
        state_before as "stateBefore",
        state_after as "stateAfter",
        created_at as "createdAt"
      FROM diagnostic_events
      WHERE user_id = ${userId}
        AND (${eventType}::text IS NULL OR event_type = ${eventType})
        AND (${framework}::text IS NULL OR framework = ${framework})
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM diagnostic_events
      WHERE user_id = ${userId}
        AND (${eventType}::text IS NULL OR event_type = ${eventType})
        AND (${framework}::text IS NULL OR framework = ${framework})
    `;

    const total = parseInt(countResult[0]?.total || "0", 10);

    return NextResponse.json({
      success: true,
      data: events as DiagnosticEvent[],
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + events.length < total,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[GET /api/diagnostic/events]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch diagnostic events" },
      { status: 500 }
    );
  }
}
