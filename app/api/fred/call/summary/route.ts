/**
 * FRED Call Summary API Endpoint
 * Phase 42: Multi-Channel FRED Access
 *
 * POST /api/fred/call/summary
 * Generates post-call deliverables: transcript, summary, decisions, Next 3 Actions.
 * Called after a voice call ends.
 *
 * Uses LLM-based extraction with heuristic fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { withLogging } from "@/lib/api/with-logging";
import { createServiceClient } from "@/lib/supabase/server";
import { generateChatResponse } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { storeEpisode } from "@/lib/db/fred-memory";

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
  ).max(500),
});

interface CallDeliverables {
  transcript: string;
  summary: string;
  decisions: string[];
  nextActions: string[];
}

interface LLMSummaryResponse {
  summary: string;
  decisions: string[];
  nextActions: string[];
}

/**
 * Generate structured deliverables using LLM analysis of the transcript.
 * Falls back to heuristic extraction if the LLM call fails.
 */
async function generateCallDeliverables(
  transcript: Array<{ speaker: string; text: string; timestamp?: string }>,
  callType: string,
  durationSeconds: number
): Promise<CallDeliverables> {
  const fullTranscript = transcript
    .map((t) => `${t.speaker === "user" ? "Founder" : "Fred"}: ${t.text}`)
    .join("\n");

  try {
    const llmResult = await generateLLMSummary(fullTranscript, callType, durationSeconds);
    return {
      transcript: fullTranscript,
      ...llmResult,
    };
  } catch (err) {
    console.warn("[Fred Call Summary] LLM extraction failed, using heuristic fallback:", err);
    return {
      transcript: fullTranscript,
      ...generateHeuristicDeliverables(transcript, callType, durationSeconds),
    };
  }
}

/**
 * Use LLM to extract structured summary, decisions, and actions from the transcript.
 */
async function generateLLMSummary(
  fullTranscript: string,
  callType: string,
  durationSeconds: number
): Promise<LLMSummaryResponse> {
  const callLabel = callType === "on-demand" ? "quick decision" : "scheduled coaching";
  const durationMin = Math.round(durationSeconds / 60);

  const systemPrompt = `You are a call summary assistant for Fred Cary's founder coaching platform.
Given a transcript of a ${callLabel} call (${durationMin} min), extract structured deliverables.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "summary": "2-3 sentence summary of what was discussed and the key outcome",
  "decisions": ["Each key decision or recommendation Fred made during the call"],
  "nextActions": ["Action 1 the founder should take", "Action 2", "Action 3"]
}

Rules:
- The summary should capture the core topic and outcome in 2-3 sentences.
- Decisions should be specific commitments or recommendations, not vague statements.
- Always return exactly 3 next actions, ordered by priority.
- Actions should be concrete and actionable (start with a verb).
- If the transcript is too short to extract meaningful content, still produce a reasonable summary.`;

  const response = await generateChatResponse(
    [{ role: "user", content: `Analyze this call transcript:\n\n${fullTranscript}` }],
    systemPrompt
  );

  const parsed = extractJSON<LLMSummaryResponse>(response);

  // Validate the parsed response has the expected shape
  if (
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.decisions) ||
    !Array.isArray(parsed.nextActions)
  ) {
    throw new Error("LLM response missing required fields");
  }

  // Ensure exactly 3 actions
  while (parsed.nextActions.length < 3) {
    parsed.nextActions.push("Review the call transcript and identify your top priority");
  }
  parsed.nextActions = parsed.nextActions.slice(0, 3);

  return parsed;
}

/**
 * Heuristic fallback: extract structured deliverables using regex patterns.
 * Used when the LLM call fails.
 */
function generateHeuristicDeliverables(
  transcript: Array<{ speaker: string; text: string; timestamp?: string }>,
  callType: string,
  durationSeconds: number
): Omit<CallDeliverables, "transcript"> {
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

    // Generate deliverables (LLM with heuristic fallback)
    const deliverables = await generateCallDeliverables(
      transcript,
      callType,
      durationSeconds
    );

    const supabase = createServiceClient();

    // Persist transcript and summary to coaching_sessions
    try {
      const { error: updateError } = await supabase
        .from('coaching_sessions')
        .update({
          transcript_json: transcript,
          summary: deliverables.summary,
          decisions: deliverables.decisions,
          next_actions: deliverables.nextActions,
          call_type: callType,
        })
        .eq('room_name', roomName)
        .eq('user_id', userId);

      if (updateError) {
        console.warn('[Fred Call Summary] Failed to persist to coaching_sessions:', updateError.message);
      } else {
        console.log(`[Fred Call Summary] Persisted transcript and summary for room: ${roomName}`);
      }
    } catch (persistErr) {
      console.warn('[Fred Call Summary] coaching_sessions persistence error:', persistErr);
    }

    // Store call record in episodic memory for cross-channel context continuity
    try {
      await storeEpisode(userId, roomName, "conversation", {
        role: "assistant",
        content: deliverables.summary,
        channel: "voice",
        callType,
        durationSeconds,
        decisions: deliverables.decisions,
        nextActions: deliverables.nextActions,
        transcriptLength: transcript.length,
      }, { channel: "voice", importanceScore: 0.8 });
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
