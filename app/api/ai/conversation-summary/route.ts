/**
 * Conversation Summary + Upsell API (AI-3522)
 *
 * GET  /api/ai/conversation-summary
 *   Returns the latest stored summary for the authenticated user (or null),
 *   plus a fresh upsell recommendation derived from it + their current tier.
 *
 * POST /api/ai/conversation-summary
 *   Runs the summarization routine over the user's recent conversations,
 *   persists the summary, evaluates the upsell opportunity, and returns both.
 *   Body (optional): { "limit": number }  // episodes to analyze (default 20)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resolveUserTier } from "@/lib/db/usage";
import {
  summarizeUserConversations,
  saveSummary,
  getLatestSummary,
} from "@/lib/ai/conversation-summarizer";
import { evaluateUpsell } from "@/lib/sales/upsell-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireAuth();
    const [summary, tier] = await Promise.all([
      getLatestSummary(userId),
      resolveUserTier(userId),
    ]);

    if (!summary) {
      return NextResponse.json({ success: true, data: null });
    }

    const upsell = evaluateUpsell({ currentTier: tier, summary });
    return NextResponse.json({ success: true, data: { summary, upsell } });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[GET /api/ai/conversation-summary]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load conversation summary" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    let limit = 20;
    try {
      const body = await request.json();
      if (body && typeof body.limit === "number") {
        limit = Math.max(1, Math.min(100, Math.round(body.limit)));
      }
    } catch {
      /* no/invalid body — use default */
    }

    const [summary, tier] = await Promise.all([
      summarizeUserConversations(userId, { limit }),
      resolveUserTier(userId),
    ]);

    const upsell = evaluateUpsell({ currentTier: tier, summary });

    // Persist (fail-soft inside saveSummary).
    const id = await saveSummary(userId, summary, {
      recommend: upsell.recommend,
      targetTier: upsell.targetTier,
      urgency: upsell.urgency,
      confidence: upsell.confidence,
    });

    return NextResponse.json({
      success: true,
      data: { id, summary, upsell },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[POST /api/ai/conversation-summary]", error);
    return NextResponse.json(
      { success: false, error: "Failed to summarize conversations" },
      { status: 500 }
    );
  }
}
