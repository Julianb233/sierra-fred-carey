/**
 * FRED Chat Export API
 *
 * GET /api/fred/export
 * Export conversation history in JSON, Markdown, or CSV format.
 *
 * Query params:
 *   sessionId (optional) - Export a single session; omit for all user episodes
 *   format   - 'json' | 'markdown' | 'csv' (default: 'json')
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Schema
// ============================================================================

const exportQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  format: z.enum(["json", "markdown", "csv"]).default("json"),
});

// ============================================================================
// Types
// ============================================================================

interface ExportMessage {
  role: string;
  content: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Formatters
// ============================================================================

function toJSON(messages: ExportMessage[]): string {
  return JSON.stringify(messages, null, 2);
}

function toMarkdown(messages: ExportMessage[]): string {
  // Group by date
  const grouped = new Map<string, ExportMessage[]>();
  for (const msg of messages) {
    const date = new Date(msg.timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(msg);
  }

  const lines: string[] = [];
  for (const [date, msgs] of grouped) {
    lines.push(`## Session: ${date}\n`);
    for (const msg of msgs) {
      const label = msg.role === "user" ? "**User:**" : "**FRED:**";
      lines.push(`${label} ${msg.content}\n`);
    }
    lines.push("---\n");
  }

  return lines.join("\n");
}

function escapeCsv(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSV(messages: ExportMessage[]): string {
  const header = "timestamp,role,content";
  const rows = messages.map(
    (m) =>
      `${escapeCsv(m.timestamp)},${escapeCsv(m.role)},${escapeCsv(m.content)}`
  );
  return [header, ...rows].join("\n");
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();

    // Parse query params
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsed = exportQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { sessionId, format } = parsed.data;
    const supabase = await createClient();

    // Build query -- user-scoped via RLS + explicit filter
    let query = supabase
      .from("fred_episodic_memory")
      .select("*")
      .eq("user_id", userId)
      .eq("event_type", "conversation")
      .order("created_at", { ascending: true });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data: episodes, error: dbError } = await query;

    if (dbError) {
      console.error("[FRED Export] DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Transform episodes into exportable messages
    const messages: ExportMessage[] = (episodes || []).map((ep) => {
      const content = ep.content as {
        role?: string;
        content?: string;
        [k: string]: unknown;
      };
      return {
        role: String(content.role || "user"),
        content: String(content.content || ""),
        timestamp: ep.created_at,
        metadata: {
          sessionId: ep.session_id,
          importanceScore: ep.importance_score,
          ...(ep.metadata || {}),
        },
      };
    });

    // Format output
    let body: string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case "markdown":
        body = toMarkdown(messages);
        contentType = "text/markdown; charset=utf-8";
        fileExtension = "md";
        break;
      case "csv":
        body = toCSV(messages);
        contentType = "text/csv; charset=utf-8";
        fileExtension = "csv";
        break;
      case "json":
      default:
        body = toJSON(messages);
        contentType = "application/json; charset=utf-8";
        fileExtension = "json";
        break;
    }

    const filename = sessionId
      ? `fred-chat-${sessionId.slice(0, 8)}.${fileExtension}`
      : `fred-chat-export.${fileExtension}`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[FRED Export] Error:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
