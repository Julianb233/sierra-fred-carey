/**
 * FRED History API Endpoint
 *
 * GET /api/fred/history
 * Retrieve conversation and decision history grouped by session.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimitForUser } from "@/lib/api/rate-limit";

// ============================================================================
// Types
// ============================================================================

interface Session {
  sessionId: string;
  firstMessage: string;
  messageCount: number;
  decisionCount: number;
  startedAt: string;
  lastActivityAt: string;
}

interface SessionDetail {
  sessionId: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    confidence?: "high" | "medium" | "low";
    action?: string;
  }>;
  decisions: Array<{
    id: string;
    type: string;
    recommendation?: Record<string, unknown>;
    confidence?: number;
    createdAt: string;
  }>;
  facts: Array<{
    category: string;
    key: string;
    value: Record<string, unknown>;
    updatedAt: string;
  }>;
}

// ============================================================================
// Request Schema
// ============================================================================

const querySchema = z.object({
  sessionId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();

    const { response: rateLimitResponse } = await checkRateLimitForUser(req, userId, "pro");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsed = querySchema.safeParse(queryParams);

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

    const { sessionId, limit, offset } = parsed.data;
    const supabase = await createClient();

    if (sessionId) {
      const detail = await getSessionDetail(supabase, userId, sessionId);
      return NextResponse.json({
        success: true,
        type: "detail",
        data: detail,
      });
    }

    const sessions = await getSessionList(supabase, userId, limit, offset);
    const total = await getSessionCount(supabase, userId);

    return NextResponse.json({
      success: true,
      type: "list",
      data: sessions,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + sessions.length < total,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[FredHistory] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getSessionList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  limit: number,
  offset: number
): Promise<Session[]> {
  const { data: episodes, error } = await supabase
    .from("fred_episodic_memory")
    .select("session_id, event_type, content, content_hash, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[FRED History] Error fetching episodes:", error);
    return [];
  }

  // Deduplicate episodes by (session_id, content_hash)
  const seenHashes = new Set<string>();
  const dedupedList = (episodes || []).filter((ep) => {
    const hash = ep.content_hash as string | null;
    if (!hash) return true;
    const key = `${ep.session_id}:${hash}`;
    if (seenHashes.has(key)) return false;
    seenHashes.add(key);
    return true;
  });

  const sessionMap = new Map<string, {
    sessionId: string;
    firstMessage: string;
    messages: Array<{ content: unknown; createdAt: string }>;
    decisions: number;
    startedAt: string;
    lastActivityAt: string;
  }>();

  for (const episode of dedupedList) {
    const sessionId = episode.session_id;

    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, {
        sessionId,
        firstMessage: "",
        messages: [],
        decisions: 0,
        startedAt: episode.created_at,
        lastActivityAt: episode.created_at,
      });
    }

    const session = sessionMap.get(sessionId)!;

    if (episode.event_type === "conversation") {
      session.messages.push({
        content: episode.content,
        createdAt: episode.created_at,
      });
    }

    if (episode.event_type === "decision") {
      session.decisions++;
    }

    if (episode.created_at < session.startedAt) {
      session.startedAt = episode.created_at;
    }
    if (episode.created_at > session.lastActivityAt) {
      session.lastActivityAt = episode.created_at;
    }
  }

  const sortedSessions = Array.from(sessionMap.values())
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

  const paginatedSessions = sortedSessions.slice(offset, offset + limit);

  return paginatedSessions.map((session) => {
    const sortedMessages = session.messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstUserMessage = sortedMessages.find(
      (m) => (m.content as { role?: string })?.role === "user"
    );

    return {
      sessionId: session.sessionId,
      firstMessage: firstUserMessage
        ? String((firstUserMessage.content as { content?: string })?.content || "New conversation")
        : "New conversation",
      messageCount: session.messages.length,
      decisionCount: session.decisions,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
    };
  });
}

async function getSessionCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("fred_episodic_memory")
    .select("session_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[FRED History] Error counting sessions:", error);
    return 0;
  }

  const uniqueSessions = new Set((data || []).map((d) => d.session_id));
  return uniqueSessions.size;
}

async function getSessionDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string
): Promise<SessionDetail> {
  const { data: episodes, error: episodesError } = await supabase
    .from("fred_episodic_memory")
    .select("id, event_type, content, content_hash, importance_score, metadata, created_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (episodesError) {
    console.error("[FRED History] Error fetching session episodes:", episodesError);
  }

  const { data: decisions, error: decisionsError } = await supabase
    .from("fred_decision_log")
    .select("id, decision_type, input_context, recommendation, final_decision, confidence, created_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (decisionsError) {
    console.warn("[FRED History] Error fetching decisions:", decisionsError);
  }

  const { data: facts, error: factsError } = await supabase
    .from("fred_semantic_memory")
    .select("id, category, key, value, confidence, source, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (factsError) {
    console.warn("[FRED History] Error fetching facts:", factsError);
  }

  // Deduplicate episodes by content_hash
  const seen = new Set<string>();
  const dedupedEpisodes = (episodes || []).filter((e) => {
    const hash = e.content_hash as string | null;
    if (!hash) return true;
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  const messages = dedupedEpisodes
    .filter((e) => e.event_type === "conversation")
    .map((e) => {
      const content = e.content as {
        role?: string;
        content?: string;
        confidence?: number;
        action?: string;
      };

      let confidence: "high" | "medium" | "low" | undefined;
      if (typeof content.confidence === "number") {
        if (content.confidence >= 0.8) confidence = "high";
        else if (content.confidence >= 0.5) confidence = "medium";
        else confidence = "low";
      }

      return {
        id: e.id,
        role: (content.role || "user") as "user" | "assistant",
        content: String(content.content || ""),
        timestamp: e.created_at,
        confidence,
        action: content.action,
      };
    });

  return {
    sessionId,
    messages,
    decisions: (decisions || []).map((d) => ({
      id: d.id,
      type: d.decision_type,
      recommendation: d.recommendation,
      confidence: d.confidence,
      createdAt: d.created_at,
    })),
    facts: (facts || []).map((f) => ({
      category: f.category,
      key: f.key,
      value: f.value,
      updatedAt: f.updated_at,
    })),
  };
}
