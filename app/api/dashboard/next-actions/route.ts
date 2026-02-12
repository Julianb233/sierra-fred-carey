/**
 * Next Actions API
 *
 * GET /api/dashboard/next-actions
 * Returns structured Next 3 Actions from the founder's most recent
 * FRED conversation. Extracts from the "Next 3 Actions:" block that
 * FRED appends to every substantive response (Operating Bible 3.3).
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface NextAction {
  text: string;
  source: "conversation";
  date: string;
}

export interface NextActionsResponse {
  actions: NextAction[];
  conversationDate: string | null;
}

// ============================================================================
// Extraction
// ============================================================================

/**
 * Extracts "Next 3 Actions:" items from a FRED response body.
 * FRED appends these as:
 *   **Next 3 Actions:**
 *   1. Do X
 *   2. Do Y
 *   3. Do Z
 */
function extractNextActions(text: string): string[] {
  const marker = /\*?\*?Next 3 Actions:?\*?\*?\s*\n/i;
  const match = text.match(marker);
  if (!match || match.index === undefined) return [];

  const afterMarker = text.slice(match.index + match[0].length);
  const lines = afterMarker.split("\n");
  const actions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered list items: "1. Do X" or "- Do X"
    const itemMatch = trimmed.match(/^(?:\d+\.\s*|-\s*)(.+)/);
    if (itemMatch) {
      actions.push(itemMatch[1].trim());
      if (actions.length >= 3) break;
    } else if (trimmed === "" && actions.length > 0) {
      // Stop at blank line after we've started collecting
      break;
    } else if (trimmed !== "" && actions.length === 0) {
      // Non-list content before any items found -- keep looking
      continue;
    } else {
      break;
    }
  }

  return actions;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Get recent FRED assistant responses (most recent first)
    const { data: episodes } = await supabase
      .from("fred_episodic_memory")
      .select("content, created_at")
      .eq("user_id", userId)
      .eq("event_type", "conversation")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!episodes || episodes.length === 0) {
      return NextResponse.json({
        success: true,
        data: { actions: [], conversationDate: null } as NextActionsResponse,
      });
    }

    // Search through recent episodes for the most recent one with Next 3 Actions
    for (const episode of episodes) {
      const content = episode.content as Record<string, unknown> | null;
      if (!content) continue;

      // FRED's responses are stored with role=assistant
      const role = content.role as string | undefined;
      const text = content.content as string | undefined;
      if (role !== "assistant" || !text) continue;

      const extracted = extractNextActions(text);
      if (extracted.length > 0) {
        const actions: NextAction[] = extracted.map((text) => ({
          text,
          source: "conversation" as const,
          date: episode.created_at,
        }));

        return NextResponse.json({
          success: true,
          data: {
            actions,
            conversationDate: episode.created_at,
          } as NextActionsResponse,
        });
      }
    }

    // No Next 3 Actions found in recent conversations
    return NextResponse.json({
      success: true,
      data: { actions: [], conversationDate: null } as NextActionsResponse,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Next Actions] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch next actions" },
      { status: 500 }
    );
  }
}
