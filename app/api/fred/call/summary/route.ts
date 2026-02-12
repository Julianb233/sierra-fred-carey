/**
 * FRED Call Summary API Endpoint
 * Phase 42: Multi-Channel FRED Access
 *
 * POST /api/fred/call/summary
 * Generates post-call deliverables: transcript, summary, decisions, Next 3 Actions.
 * Called after a voice call ends.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { withLogging } from "@/lib/api/with-logging";
import { createServiceClient } from "@/lib/supabase/server";

const summaryRequestSchema = z.object({
  roomName: z.string().min(1),
  callType: z.enum(["on-demand", "scheduled"]).default("on-demand"),
  durationSeconds: z.number().int().min(0),
  /** Raw transcript entries from the call */
  transcript: z.array(
    z.object({
      speaker: z.enum(["user", "fred"]),
      text: z.string(),
      timestamp: z.string().optional(),
    })
  ),
});

/**
 * Extract structured deliverables from a call transcript.
 * Uses simple heuristic extraction rather than an LLM call
 * to avoid latency and cost for the MVP.
 */
function generateCallDeliverables(
  transcript: Array<{ speaker: string; text: string; timestamp?: string }>,
  callType: string,
  durationSeconds: number
) {
  // Build full transcript text
  const fullTranscript = transcript
    .map((t) => `${t.speaker === "user" ? "Founder" : "Fred"}: ${t.text}`)
    .join("\n");

  // Extract Fred's final substantive messages as key points
  const fredMessages = transcript
    .filter((t) => t.speaker === "fred" && t.text.length > 30)
    .map((t) => t.text);

  // Build summary from Fred's last few messages
  const recentFredMessages = fredMessages.slice(-3);
  const summary = recentFredMessages.length > 0
    ? `In this ${callType === "on-demand" ? "quick decision" : "scheduled coaching"} call (${Math.round(durationSeconds / 60)} min), Fred discussed: ${recentFredMessages.map((m) => m.slice(0, 100)).join(". ")}.`
    : `${callType === "on-demand" ? "Quick decision" : "Scheduled coaching"} call completed (${Math.round(durationSeconds / 60)} min).`;

  // Look for action-like statements in Fred's messages
  const actionPatterns = /(?:you should|I'd recommend|try|start|focus on|next step|make sure|go ahead and|consider)\s+(.+?)(?:\.|$)/gi;
  const actions: string[] = [];
  for (const msg of fredMessages) {
    let match: RegExpExecArray | null;
    while ((match = actionPatterns.exec(msg)) !== null) {
      if (match[1] && match[1].length > 10 && actions.length < 3) {
        actions.push(match[1].trim());
      }
    }
  }

  // Ensure we always have 3 actions
  while (actions.length < 3) {
    actions.push("Review the call transcript and identify your top priority");
  }

  // Look for decision-like statements
  const decisionPatterns = /(?:you need to decide|the decision is|let's go with|I'd go with|the answer is)\s+(.+?)(?:\.|$)/gi;
  const decisions: string[] = [];
  for (const msg of fredMessages) {
    let match: RegExpExecArray | null;
    while ((match = decisionPatterns.exec(msg)) !== null) {
      if (match[1] && match[1].length > 10) {
        decisions.push(match[1].trim());
      }
    }
  }

  return {
    transcript: fullTranscript,
    summary,
    decisions,
    nextActions: actions.slice(0, 3),
  };
}

async function handlePost(req: NextRequest) {
  try {
    const userId = await requireAuth();

    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      });
    }

    const body = await req.json();
    const parsed = summaryRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { roomName, callType, durationSeconds, transcript } = parsed.data;

    // Verify the room belongs to this user
    if (!roomName.includes(userId)) {
      return NextResponse.json(
        { error: "Unauthorized: room does not belong to this user" },
        { status: 403 }
      );
    }

    // Generate deliverables
    const deliverables = generateCallDeliverables(
      transcript,
      callType,
      durationSeconds
    );

    // Store call record in episodic memory for context continuity
    try {
      const supabase = createServiceClient();
      await supabase.from("fred_episodic_memory").insert({
        user_id: userId,
        session_id: roomName,
        episode_type: "voice_call",
        content: {
          callType,
          durationSeconds,
          summary: deliverables.summary,
          decisions: deliverables.decisions,
          nextActions: deliverables.nextActions,
          transcriptLength: transcript.length,
          channel: "voice",
        },
      });
    } catch (err) {
      console.warn("[Fred Call Summary] Failed to store call record:", err);
    }

    return NextResponse.json({
      success: true,
      ...deliverables,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Fred Call Summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate call summary" },
      { status: 500 }
    );
  }
}

export const POST = withLogging(handlePost as (request: Request, context?: unknown) => Promise<Response>);
