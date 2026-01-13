import { NextRequest, NextResponse } from "next/server";
import { generateTrackedResponse } from "@/lib/ai/client";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";
import { extractInsights } from "@/lib/ai/insight-extractor";

/**
 * Deck Review API
 *
 * Provides IC-perspective review of pitch decks following the Investor Lens framework.
 * Reviews decks slide-by-slide and identifies likely objections with best responses.
 */

interface SlideAnalysis {
  slideNumber: number;
  slideType: string;
  content: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  vcReaction: string;
}

interface DeckReviewInput {
  evaluationId?: string;
  deckUrl?: string;
  deckContent?: {
    slides: {
      slideNumber: number;
      type: string;
      content: string;
    }[];
  };
  deckType: "summary" | "full_deck";
}

interface ObjectionResponse {
  objection: string;
  likelihood: "high" | "medium" | "low";
  bestResponse: string;
  supportingEvidence: string;
}

interface DeckReviewResponse {
  overallScore: number;
  slideAnalysis: SlideAnalysis[];
  icReview: {
    firstImpression: string;
    investmentThesis: string;
    keyStrengths: string[];
    criticalGaps: string[];
    dealbreakers: string[];
  };
  likelyObjections: ObjectionResponse[];
  readinessGaps: {
    gap: string;
    severity: "critical" | "major" | "minor";
    fix: string;
  }[];
  recommendations: string[];
}

const DECK_REVIEW_PROMPT = `You are a senior VC partner reviewing a pitch deck from an IC (Investment Committee) perspective. Your job is to predict how the deck will be received in an IC meeting and identify likely objections.

REVIEW FRAMEWORK:

1. SLIDE-BY-SLIDE ANALYSIS
For each slide, analyze:
- What information is conveyed
- Strengths of the presentation
- Weaknesses or gaps
- How a typical VC partner would react

2. IC MEETING SIMULATION
Predict:
- First impression (first 30 seconds)
- Whether the investment thesis is clear
- Key strengths that will resonate
- Critical gaps that will raise questions
- Any immediate dealbreakers

3. OBJECTION MAPPING
Identify likely objections and prepare responses:
- What will skeptical partners push back on?
- What's the best way to address each objection?
- What evidence supports the response?

4. READINESS GAPS
Identify what's missing:
- Critical gaps that must be fixed
- Major gaps that should be addressed
- Minor improvements for polish

SCORING CRITERIA (0-100):
- 90-100: IC-ready, compelling deck
- 70-89: Good but needs refinement
- 50-69: Significant gaps to address
- 30-49: Major rework needed
- 0-29: Not ready for IC

Respond ONLY with valid JSON (no markdown):
{
  "overallScore": number,
  "slideAnalysis": [
    {
      "slideNumber": number,
      "slideType": "string",
      "content": "summary of slide content",
      "strengths": ["list"],
      "weaknesses": ["list"],
      "suggestions": ["list"],
      "vcReaction": "how a VC would react to this slide"
    }
  ],
  "icReview": {
    "firstImpression": "string",
    "investmentThesis": "Is the thesis clear? What is it?",
    "keyStrengths": ["list"],
    "criticalGaps": ["list"],
    "dealbreakers": ["list or empty if none"]
  },
  "likelyObjections": [
    {
      "objection": "What the VC will ask/say",
      "likelihood": "high" | "medium" | "low",
      "bestResponse": "How to respond",
      "supportingEvidence": "What evidence supports the response"
    }
  ],
  "readinessGaps": [
    {
      "gap": "What's missing",
      "severity": "critical" | "major" | "minor",
      "fix": "How to fix it"
    }
  ],
  "recommendations": ["Top 5 recommendations to improve the deck"]
}`;

/**
 * POST /api/investor-lens/deck-review
 * Submit a deck for IC-perspective review
 *
 * SECURITY: Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const body: DeckReviewInput = await request.json();
    const { evaluationId, deckUrl, deckContent, deckType } = body;

    // Validation
    if (!deckContent && !deckUrl) {
      return NextResponse.json(
        { success: false, error: "Either deckContent or deckUrl is required" },
        { status: 400 }
      );
    }

    if (!deckType || !["summary", "full_deck"].includes(deckType)) {
      return NextResponse.json(
        { success: false, error: "Valid deckType is required (summary or full_deck)" },
        { status: 400 }
      );
    }

    // Get evaluation context if provided
    let evaluationContext = "";
    if (evaluationId) {
      const evalResult = await sql`
        SELECT
          funding_stage,
          ic_verdict,
          ic_verdict_reasoning,
          top_pass_reasons,
          input_data
        FROM investor_lens_evaluations
        WHERE id = ${evaluationId} AND user_id = ${userId}
      `;

      if (evalResult.length > 0) {
        const eval_ = evalResult[0];
        evaluationContext = `
PRIOR EVALUATION CONTEXT:
- Funding Stage: ${eval_.funding_stage}
- Previous IC Verdict: ${eval_.ic_verdict}
- Reasoning: ${eval_.ic_verdict_reasoning}
- Known Concerns: ${JSON.stringify(eval_.top_pass_reasons)}
`;
      }
    }

    // Build deck content for review
    let deckDescription = "";
    if (deckContent && deckContent.slides) {
      deckDescription = deckContent.slides
        .map(
          (slide) =>
            `SLIDE ${slide.slideNumber} (${slide.type}):\n${slide.content}`
        )
        .join("\n\n---\n\n");
    } else if (deckUrl) {
      // In production, you would fetch and parse the deck here
      deckDescription = `Deck URL: ${deckUrl}\n\n[Note: URL-based deck parsing would be implemented here]`;
    }

    const userPrompt = `
Review this ${deckType === "summary" ? "summary" : "full"} pitch deck from an IC perspective:

${evaluationContext}

DECK CONTENT:
${deckDescription}

Provide a thorough IC-perspective review with slide-by-slide analysis, objection mapping, and recommendations.
`;

    console.log("[Deck Review] Starting review for user:", userId);

    // Call AI
    const trackedResult = await generateTrackedResponse(
      [{ role: "user", content: userPrompt }],
      DECK_REVIEW_PROMPT,
      {
        userId,
        analyzer: "investor_lens_deck_review",
        inputData: { evaluationId, deckType, slideCount: deckContent?.slides?.length || 0 },
      }
    );

    // Parse response
    let review: DeckReviewResponse;
    try {
      const cleanResponse = trackedResult.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      review = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("[Deck Review] Parse error:", parseError);
      console.error("[Deck Review] Raw response:", trackedResult.content);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process deck review",
          details: process.env.NODE_ENV === "development" ? trackedResult.content : undefined,
        },
        { status: 500 }
      );
    }

    // Save deck review
    const result = await sql`
      INSERT INTO deck_reviews (
        user_id,
        investor_lens_id,
        deck_url,
        deck_type,
        review_status,
        slide_analysis,
        ic_review,
        likely_objections,
        best_responses,
        readiness_gaps,
        completed_at
      ) VALUES (
        ${userId},
        ${evaluationId || null},
        ${deckUrl || null},
        ${deckType},
        'completed',
        ${JSON.stringify(review.slideAnalysis)},
        ${JSON.stringify(review.icReview)},
        ${JSON.stringify(review.likelyObjections)},
        ${JSON.stringify(review.recommendations)},
        ${JSON.stringify(review.readinessGaps)},
        NOW()
      )
      RETURNING id, created_at, completed_at
    `;

    const savedReview = result[0];

    console.log("[Deck Review] Review saved with ID:", savedReview.id);

    // Update evaluation if linked
    if (evaluationId) {
      await sql`
        UPDATE investor_lens_evaluations
        SET deck_review_completed = true
        WHERE id = ${evaluationId} AND user_id = ${userId}
      `;
    }

    // Extract insights (async, non-blocking)
    extractInsights(
      userId,
      "deck_review",
      savedReview.id,
      trackedResult.content,
      `Deck review - Score: ${review.overallScore}, Type: ${deckType}`
    ).catch((err) => console.error("[Deck Review] Insight extraction failed:", err));

    // Log journey event
    try {
      await sql`
        INSERT INTO journey_events (user_id, event_type, event_data, score_after)
        VALUES (
          ${userId},
          'deck_review_completed',
          ${JSON.stringify({
            reviewId: savedReview.id,
            evaluationId,
            deckType,
            overallScore: review.overallScore,
            objectionCount: review.likelyObjections.length,
            gapCount: review.readinessGaps.length,
          })},
          ${review.overallScore}
        )
      `;
    } catch (err) {
      console.error("[Deck Review] Journey event logging failed:", err);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: savedReview.id,
          createdAt: savedReview.created_at,
          completedAt: savedReview.completed_at,
          ...review,
        },
        meta: {
          requestId: trackedResult.requestId,
          responseId: trackedResult.responseId,
          latencyMs: trackedResult.latencyMs,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Deck Review] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to review deck" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/investor-lens/deck-review
 * Get deck review results
 *
 * SECURITY: Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("id");
    const evaluationId = searchParams.get("evaluationId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    // If specific review ID requested
    if (reviewId) {
      const result = await sql`
        SELECT
          id,
          investor_lens_id,
          deck_url,
          deck_type,
          review_status,
          slide_analysis,
          ic_review,
          likely_objections,
          best_responses,
          readiness_gaps,
          created_at,
          completed_at
        FROM deck_reviews
        WHERE id = ${reviewId} AND user_id = ${userId}
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { success: false, error: "Review not found" },
          { status: 404 }
        );
      }

      const review = result[0];
      return NextResponse.json({
        success: true,
        data: {
          id: review.id,
          evaluationId: review.investor_lens_id,
          deckUrl: review.deck_url,
          deckType: review.deck_type,
          status: review.review_status,
          slideAnalysis: review.slide_analysis,
          icReview: review.ic_review,
          likelyObjections: review.likely_objections,
          recommendations: review.best_responses,
          readinessGaps: review.readiness_gaps,
          createdAt: review.created_at,
          completedAt: review.completed_at,
        },
      });
    }

    // List reviews (optionally filtered by evaluation)
    let whereClause = sql`WHERE user_id = ${userId}`;
    if (evaluationId) {
      whereClause = sql`${whereClause} AND investor_lens_id = ${evaluationId}`;
    }

    const countResult = await sql`
      SELECT COUNT(*) as total FROM deck_reviews ${whereClause}
    `;
    const total = parseInt(countResult[0].total);

    const reviews = await sql`
      SELECT
        id,
        investor_lens_id,
        deck_url,
        deck_type,
        review_status,
        ic_review,
        created_at,
        completed_at
      FROM deck_reviews
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const formattedReviews = reviews.map((r: any) => ({
      id: r.id,
      evaluationId: r.investor_lens_id,
      deckUrl: r.deck_url,
      deckType: r.deck_type,
      status: r.review_status,
      firstImpression: r.ic_review?.firstImpression,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedReviews,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("[Deck Review] Fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch deck reviews" },
      { status: 500 }
    );
  }
}
