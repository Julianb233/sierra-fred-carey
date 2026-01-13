import { NextRequest, NextResponse } from "next/server";
import { generateTrackedResponse } from "@/lib/ai/client";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";

/**
 * Deck Request Protocol
 *
 * This endpoint evaluates whether requesting a deck is appropriate based on the
 * Investor Lens PRD principles:
 * 1. Never ask for deck by default - issue provisional verdict first
 * 2. Only request deck when specific information is needed
 * 3. Determine if summary deck or full deck is required
 */

interface DeckRequestInput {
  evaluationId?: string;
  profile?: {
    stage?: string;
    hasProduct?: boolean;
    hasTraction?: boolean;
    hasRevenue?: boolean;
    previousEvaluation?: {
      icVerdict: string;
      topConcerns: string[];
    };
  };
  reason?: string;
}

interface DeckRequestResponse {
  deckNeeded: boolean;
  deckType?: "summary" | "full_deck";
  reason: string;
  specificInfoNeeded?: string[];
  alternative?: string;
}

const DECK_REQUEST_PROMPT = `You are a VC analyst applying the "Deck Review Protocol" to determine if requesting a pitch deck is appropriate.

CORE PRINCIPLE: Never ask for a deck by default. Issue a provisional verdict based on available information first.

DECK REQUEST RULES:
1. A deck is ONLY needed when specific visual/detailed information cannot be conveyed through conversation
2. For pre-seed: Almost never need a full deck - summary or conversation is usually sufficient
3. For seed: May need summary deck to see traction charts, but full deck rarely needed
4. For Series A: Full deck may be appropriate to see financial models and GTM details

WHEN DECK IS NOT NEEDED:
- Team background can be gathered via LinkedIn/conversation
- Market size can be validated through research
- Problem clarity comes from founder's articulation
- Early traction can be described in numbers

WHEN DECK IS NEEDED:
- Complex product with visual demos
- Traction charts that tell a story
- Financial models needing detailed review
- Competitive landscape visualization
- Series A+ with formal process

DECK TYPES:
1. "summary" - 5-10 slides, problem/solution/traction/team/ask
2. "full_deck" - 15-20 slides, full investor presentation

Analyze the situation and determine if a deck request is appropriate.

Respond ONLY with valid JSON (no markdown):
{
  "deckNeeded": boolean,
  "deckType": "summary" | "full_deck" | null,
  "reason": "Explanation for the decision",
  "specificInfoNeeded": ["list", "of", "specific", "info"] or null,
  "alternative": "Alternative way to get the info if deck not needed" or null
}`;

/**
 * POST /api/investor-lens/deck-request
 * Evaluate if a deck is needed and what type
 *
 * SECURITY: Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const body: DeckRequestInput = await request.json();
    const { evaluationId, profile, reason } = body;

    // If evaluationId provided, fetch the evaluation context
    let evaluationContext = "";
    if (evaluationId) {
      const evalResult = await sql`
        SELECT
          funding_stage,
          ic_verdict,
          ic_verdict_reasoning,
          top_pass_reasons,
          deck_requested,
          input_data
        FROM investor_lens_evaluations
        WHERE id = ${evaluationId} AND user_id = ${userId}
      `;

      if (evalResult.length === 0) {
        return NextResponse.json(
          { success: false, error: "Evaluation not found" },
          { status: 404 }
        );
      }

      const eval_ = evalResult[0];

      // If deck already requested, return that info
      if (eval_.deck_requested) {
        return NextResponse.json({
          success: true,
          data: {
            deckNeeded: true,
            reason: "A deck has already been requested for this evaluation",
            alreadyRequested: true,
          },
        });
      }

      evaluationContext = `
EXISTING EVALUATION:
- Funding Stage: ${eval_.funding_stage}
- IC Verdict: ${eval_.ic_verdict}
- Reasoning: ${eval_.ic_verdict_reasoning}
- Top Pass Reasons: ${JSON.stringify(eval_.top_pass_reasons)}
- Company Info: ${JSON.stringify(eval_.input_data)}
`;
    }

    // Build context from profile if provided
    let profileContext = "";
    if (profile) {
      profileContext = `
STARTUP PROFILE:
- Stage: ${profile.stage || "Unknown"}
- Has Product: ${profile.hasProduct ? "Yes" : "No"}
- Has Traction: ${profile.hasTraction ? "Yes" : "No"}
- Has Revenue: ${profile.hasRevenue ? "Yes" : "No"}
${profile.previousEvaluation ? `
- Previous IC Verdict: ${profile.previousEvaluation.icVerdict}
- Top Concerns: ${profile.previousEvaluation.topConcerns.join(", ")}
` : ""}
`;
    }

    // Build user prompt
    const userPrompt = `
Evaluate if requesting a pitch deck is appropriate for this situation:

${evaluationContext}
${profileContext}
${reason ? `REASON FOR DECK REQUEST: ${reason}` : ""}

Remember: Default to NOT requesting a deck unless specific visual/detailed information is truly needed that cannot be gathered through conversation.
`;

    console.log("[Deck Request] Evaluating deck need for user:", userId);

    // Call AI
    const trackedResult = await generateTrackedResponse(
      [{ role: "user", content: userPrompt }],
      DECK_REQUEST_PROMPT,
      {
        userId,
        analyzer: "investor_lens_deck_request",
        inputData: { evaluationId, profile, reason },
      }
    );

    // Parse response
    let response: DeckRequestResponse;
    try {
      const cleanResponse = trackedResult.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      response = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("[Deck Request] Parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Failed to evaluate deck request" },
        { status: 500 }
      );
    }

    // If evaluation ID provided and deck is needed, update the evaluation
    if (evaluationId && response.deckNeeded) {
      await sql`
        UPDATE investor_lens_evaluations
        SET deck_requested = true
        WHERE id = ${evaluationId} AND user_id = ${userId}
      `;
    }

    return NextResponse.json({
      success: true,
      data: response,
      meta: {
        requestId: trackedResult.requestId,
        latencyMs: trackedResult.latencyMs,
      },
    });
  } catch (error) {
    console.error("[Deck Request] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to evaluate deck request" },
      { status: 500 }
    );
  }
}
