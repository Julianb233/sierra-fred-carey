import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { generateTrackedResponse } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { requireAuth } from "@/lib/auth";
import { extractAndSaveInsights } from "@/lib/ai/insight-extractor";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { logger } from "@/lib/logger";
import { sanitizeUserInput, detectInjectionAttempt } from "@/lib/ai/guards/prompt-guard";

// Fallback system prompt if not loaded from database
const POSITIONING_ASSESSMENT_PROMPT = `You are Fred Carey, a startup advisor who has coached 10,000+ founders. You specialize in positioning clarity diagnostics - helping founders understand whether their positioning is sharp enough to resonate with their target market.

IMPORTANT: You are NOT here to rewrite their marketing copy. You are here to DIAGNOSE positioning clarity issues and identify specific gaps.

Evaluate the founder's positioning using these 4 categories with weighted scoring:

## CATEGORY 1: CLARITY (30% weight)
Score each element as true/false:
- ONE_SENTENCE: Can they explain what they do in one sentence without jargon?
- CUSTOMER_POV: Is the problem framed from the customer's point of view (not the founder's)?
- SOLUTION_FIT: Does the solution clearly map back to the stated problem?
- SPECIFIC_TARGET: Is the target specific enough that you could identify them in a crowd?

Scoring: Each true = 25 points (max 100)

## CATEGORY 2: DIFFERENTIATION (25% weight)
Score each element as true/false:
- VS_ALTERNATIVES: Is it clear why this solution needs to exist vs. status quo or alternatives?
- COMPETITOR_AWARENESS: Do they show awareness of direct AND indirect competitors?
- WHY_YOU: Is "why you/your team" articulated credibly?

Scoring: Each true = 33.3 points (max 100)

## CATEGORY 3: MARKET UNDERSTANDING (20% weight)
Score each element as true/false:
- LANDSCAPE_UNDERSTOOD: Do they demonstrate understanding of the market landscape?
- PROBLEM_VALIDATED: Has the problem been validated through real customer interaction?
- CURRENT_SOLUTIONS: Do they know how customers currently solve this problem?

Scoring: Each true = 33.3 points (max 100)

## CATEGORY 4: NARRATIVE STRENGTH (25% weight)
Score each element as true/false:
- COHERENT_STORY: Is the overall story coherent and compelling?
- WHY_NOW: Is there a clear "why now" - timing or market catalyst?
- CREATES_URGENCY: Does the narrative create curiosity or urgency?

Scoring: Each true = 33.3 points (max 100)

## GRADING SCALE (weighted average of categories):
- A: 85-100 (Ready for market, positioning is sharp)
- B: 70-84 (Strong foundation, minor refinements needed)
- C: 55-69 (Workable but unclear in key areas)
- D: 40-54 (Significant positioning gaps)
- F: 0-39 (Fundamental positioning rethink required)

## NARRATIVE TIGHTNESS SCORE (1-10):
Separate from the grade, rate how "tight" the overall narrative is:
- 9-10: Could pitch to investors tomorrow
- 7-8: Solid story, minor polish needed
- 5-6: Story exists but meanders or has holes
- 3-4: Multiple disconnects in the narrative
- 1-2: No coherent narrative present

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "positioningGrade": "<A/B/C/D/F>",
  "narrativeTightnessScore": <number 1-10>,
  "categories": {
    "clarity": {
      "score": <number 0-100>,
      "grade": "<A/B/C/D/F>",
      "elements": {
        "oneSentence": <boolean>,
        "customerPov": <boolean>,
        "solutionFit": <boolean>,
        "specificTarget": <boolean>
      },
      "feedback": "<2-3 sentence specific feedback>"
    },
    "differentiation": {
      "score": <number 0-100>,
      "grade": "<A/B/C/D/F>",
      "elements": {
        "vsAlternatives": <boolean>,
        "competitorAwareness": <boolean>,
        "whyYou": <boolean>
      },
      "feedback": "<2-3 sentence specific feedback>"
    },
    "marketUnderstanding": {
      "score": <number 0-100>,
      "grade": "<A/B/C/D/F>",
      "elements": {
        "landscapeUnderstood": <boolean>,
        "problemValidated": <boolean>,
        "currentSolutions": <boolean>
      },
      "feedback": "<2-3 sentence specific feedback>"
    },
    "narrativeStrength": {
      "score": <number 0-100>,
      "grade": "<A/B/C/D/F>",
      "elements": {
        "coherentStory": <boolean>,
        "whyNow": <boolean>,
        "createsUrgency": <boolean>
      },
      "feedback": "<2-3 sentence specific feedback>"
    }
  },
  "gaps": [
    {
      "category": "<clarity/differentiation/marketUnderstanding/narrativeStrength>",
      "gap": "<specific gap description>",
      "severity": "<high/medium/low>"
    }
  ],
  "nextActions": [
    {
      "action": "<specific actionable step>",
      "priority": <number 1-3>,
      "expectedImpact": "<high/medium/low>"
    }
  ]
}

CRITICAL RULES:
1. Identify 3-5 specific gaps based on the false elements
2. Provide exactly 3 next actions, prioritized by impact
3. Be direct and specific - vague feedback is useless
4. DO NOT rewrite their copy - diagnose the issues
5. Focus on what's missing or unclear, not stylistic preferences`;

interface PositioningInput {
  companyDescription: string;
  targetCustomer?: string;
  problem?: string;
  solution?: string;
  valueProp?: string;
  competitors?: string;
  whyNow?: string;
  sourceType?: "conversation" | "pitch" | "deck" | "description";
}

interface CategoryElements {
  oneSentence?: boolean;
  customerPov?: boolean;
  solutionFit?: boolean;
  specificTarget?: boolean;
  vsAlternatives?: boolean;
  competitorAwareness?: boolean;
  whyYou?: boolean;
  landscapeUnderstood?: boolean;
  problemValidated?: boolean;
  currentSolutions?: boolean;
  coherentStory?: boolean;
  whyNow?: boolean;
  createsUrgency?: boolean;
}

interface CategoryScore {
  score: number;
  grade: string;
  elements: CategoryElements;
  feedback: string;
}

interface Gap {
  category: string;
  gap: string;
  severity: "high" | "medium" | "low";
}

interface NextAction {
  action: string;
  priority: number;
  expectedImpact: "high" | "medium" | "low";
}

interface PositioningAnalysis {
  positioningGrade: string;
  narrativeTightnessScore: number;
  categories: {
    clarity: CategoryScore;
    differentiation: CategoryScore;
    marketUnderstanding: CategoryScore;
    narrativeStrength: CategoryScore;
  };
  gaps: Gap[];
  nextActions: NextAction[];
}

function scoreToGrade(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

/**
 * POST /api/positioning
 * Create a positioning assessment using Fred Carey's Positioning Readiness Framework
 *
 * SECURITY: Requires authentication - userId from server-side session
 * TRACKING: Uses generateTrackedResponse for full logging and A/B testing
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    // SECURITY: Require Pro tier for Positioning assessment
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      });
    }

    const body: PositioningInput = await request.json();
    const {
      companyDescription,
      targetCustomer,
      problem,
      solution,
      valueProp,
      competitors,
      whyNow,
      sourceType = "description",
    } = body;

    // Validation
    if (!companyDescription || companyDescription.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Company description is required" },
        { status: 400 }
      );
    }

    if (companyDescription.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide more details about your company (minimum 50 characters)",
        },
        { status: 400 }
      );
    }

    if (companyDescription.trim().length > 5000) {
      return NextResponse.json(
        {
          success: false,
          error: "Description is too long (maximum 5000 characters)",
        },
        { status: 400 }
      );
    }

    // SECURITY: Check for prompt injection attempts
    const injectionCheck = detectInjectionAttempt(companyDescription);
    if (injectionCheck.isInjection) {
      return NextResponse.json(
        { success: false, error: "Input rejected: potentially harmful content detected" },
        { status: 400 }
      );
    }

    // Sanitize user inputs before passing to AI
    const sanitizedDescription = sanitizeUserInput(companyDescription.trim());

    // Build context for AI analysis
    let contextualInput = `COMPANY/PRODUCT DESCRIPTION:\n${sanitizedDescription}`;

    if (targetCustomer) {
      contextualInput += `\n\nTARGET CUSTOMER:\n${targetCustomer.trim()}`;
    }

    if (problem) {
      contextualInput += `\n\nPROBLEM BEING SOLVED:\n${problem.trim()}`;
    }

    if (solution) {
      contextualInput += `\n\nSOLUTION:\n${solution.trim()}`;
    }

    if (valueProp) {
      contextualInput += `\n\nVALUE PROPOSITION:\n${valueProp.trim()}`;
    }

    if (competitors) {
      contextualInput += `\n\nCOMPETITORS/ALTERNATIVES:\n${competitors.trim()}`;
    }

    if (whyNow) {
      contextualInput += `\n\nWHY NOW:\n${whyNow.trim()}`;
    }

    // Generate AI analysis using tracked response
    logger.log("[Positioning] Analyzing positioning for user:", userId);

    const trackedResult = await generateTrackedResponse(
      [
        {
          role: "user",
          content: contextualInput,
        },
      ],
      POSITIONING_ASSESSMENT_PROMPT,
      {
        userId,
        analyzer: "positioning_assessment",
        inputData: {
          companyDescription: companyDescription.trim(),
          targetCustomer,
          problem,
          solution,
          valueProp,
          competitors,
          whyNow,
          sourceType,
        },
      }
    );

    const aiResponse = trackedResult.content;

    // Parse AI response
    let analysis: PositioningAnalysis;
    try {
      analysis = extractJSON<PositioningAnalysis>(aiResponse);

      // Validate structure
      if (
        !analysis.positioningGrade ||
        !analysis.narrativeTightnessScore ||
        !analysis.categories ||
        !analysis.gaps ||
        !analysis.nextActions
      ) {
        throw new Error("Invalid AI response structure");
      }

      // Validate all categories exist
      const requiredCategories = [
        "clarity",
        "differentiation",
        "marketUnderstanding",
        "narrativeStrength",
      ];
      for (const cat of requiredCategories) {
        if (!analysis.categories[cat as keyof typeof analysis.categories]) {
          throw new Error(`Missing category: ${cat}`);
        }
      }

      // Validate grade
      if (!["A", "B", "C", "D", "F"].includes(analysis.positioningGrade)) {
        throw new Error(`Invalid positioning grade: ${analysis.positioningGrade}`);
      }

      // Validate narrative score
      if (
        analysis.narrativeTightnessScore < 1 ||
        analysis.narrativeTightnessScore > 10
      ) {
        analysis.narrativeTightnessScore = Math.max(
          1,
          Math.min(10, analysis.narrativeTightnessScore)
        );
      }
    } catch (parseError) {
      console.error("[Positioning] AI response parse error:", parseError);
      console.error("[Positioning] Raw AI response:", aiResponse);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to analyze positioning. Please try again.",
          details:
            process.env.NODE_ENV === "development" ? aiResponse : undefined,
        },
        { status: 500 }
      );
    }

    // Calculate weighted overall score for verification
    const weightedScore =
      analysis.categories.clarity.score * 0.3 +
      analysis.categories.differentiation.score * 0.25 +
      analysis.categories.marketUnderstanding.score * 0.2 +
      analysis.categories.narrativeStrength.score * 0.25;

    // Save to database
    const result = await sql`
      INSERT INTO positioning_assessments (
        user_id,
        positioning_grade,
        narrative_tightness_score,
        clarity_score,
        clarity_grade,
        clarity_one_sentence,
        clarity_customer_pov,
        clarity_solution_fit,
        clarity_specific_target,
        clarity_feedback,
        differentiation_score,
        differentiation_grade,
        differentiation_vs_alternatives,
        differentiation_competitor_awareness,
        differentiation_why_you,
        differentiation_feedback,
        market_understanding_score,
        market_understanding_grade,
        market_landscape_understood,
        market_problem_validated,
        market_current_solutions,
        market_understanding_feedback,
        narrative_strength_score,
        narrative_strength_grade,
        narrative_coherent,
        narrative_why_now,
        narrative_creates_urgency,
        narrative_strength_feedback,
        gaps,
        next_actions,
        input_data,
        source_type,
        source_content,
        created_at
      )
      VALUES (
        ${userId},
        ${analysis.positioningGrade},
        ${analysis.narrativeTightnessScore},
        ${analysis.categories.clarity.score},
        ${analysis.categories.clarity.grade || scoreToGrade(analysis.categories.clarity.score)},
        ${analysis.categories.clarity.elements.oneSentence || false},
        ${analysis.categories.clarity.elements.customerPov || false},
        ${analysis.categories.clarity.elements.solutionFit || false},
        ${analysis.categories.clarity.elements.specificTarget || false},
        ${analysis.categories.clarity.feedback},
        ${analysis.categories.differentiation.score},
        ${analysis.categories.differentiation.grade || scoreToGrade(analysis.categories.differentiation.score)},
        ${analysis.categories.differentiation.elements.vsAlternatives || false},
        ${analysis.categories.differentiation.elements.competitorAwareness || false},
        ${analysis.categories.differentiation.elements.whyYou || false},
        ${analysis.categories.differentiation.feedback},
        ${analysis.categories.marketUnderstanding.score},
        ${analysis.categories.marketUnderstanding.grade || scoreToGrade(analysis.categories.marketUnderstanding.score)},
        ${analysis.categories.marketUnderstanding.elements.landscapeUnderstood || false},
        ${analysis.categories.marketUnderstanding.elements.problemValidated || false},
        ${analysis.categories.marketUnderstanding.elements.currentSolutions || false},
        ${analysis.categories.marketUnderstanding.feedback},
        ${analysis.categories.narrativeStrength.score},
        ${analysis.categories.narrativeStrength.grade || scoreToGrade(analysis.categories.narrativeStrength.score)},
        ${analysis.categories.narrativeStrength.elements.coherentStory || false},
        ${analysis.categories.narrativeStrength.elements.whyNow || false},
        ${analysis.categories.narrativeStrength.elements.createsUrgency || false},
        ${analysis.categories.narrativeStrength.feedback},
        ${JSON.stringify(analysis.gaps)},
        ${JSON.stringify(analysis.nextActions)},
        ${JSON.stringify(body)},
        ${sourceType},
        ${companyDescription.trim()},
        NOW()
      )
      RETURNING
        id,
        user_id as "userId",
        positioning_grade as "positioningGrade",
        narrative_tightness_score as "narrativeTightnessScore",
        created_at as "createdAt"
    `;

    const savedAssessment = result[0];

    logger.log(
      "[Positioning] Assessment saved with ID:",
      savedAssessment.id
    );

    // Extract insights in background (but await to ensure completion)
    try {
      await extractAndSaveInsights(
        userId,
        "positioning_assessment",
        savedAssessment.id,
        aiResponse,
        `Positioning assessment for: ${companyDescription.substring(0, 100)}`
      );
    } catch (err) {
      console.error("[Positioning] Failed to extract insights:", err);
      // Don't fail the main request if insight extraction fails
    }

    // Log journey event
    try {
      await sql`
        INSERT INTO journey_events (user_id, event_type, event_data, score_after)
        VALUES (
          ${userId},
          'positioning_assessment',
          ${JSON.stringify({
            assessmentId: savedAssessment.id,
            grade: analysis.positioningGrade,
            narrativeScore: analysis.narrativeTightnessScore,
            requestId: trackedResult.requestId,
            variant: trackedResult.variant,
          })},
          ${Math.round(weightedScore)}
        )
      `;
    } catch (err) {
      console.error("[Positioning] Journey event logging failed:", err);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: savedAssessment.id,
          positioningGrade: analysis.positioningGrade,
          narrativeTightnessScore: analysis.narrativeTightnessScore,
          weightedScore: Math.round(weightedScore),
          categories: analysis.categories,
          gaps: analysis.gaps,
          nextActions: analysis.nextActions,
          createdAt: savedAssessment.createdAt,
        },
        meta: {
          requestId: trackedResult.requestId,
          responseId: trackedResult.responseId,
          latencyMs: trackedResult.latencyMs,
          variant: trackedResult.variant,
        },
        message: "Positioning assessed successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Handle auth errors (NextResponse thrown by requireAuth)
    if (error instanceof Response || (error && typeof error.status === 'number' && typeof error.json === 'function')) {
      return error;
    }
    console.error("[Positioning] Assessment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to assess positioning. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/positioning
 * Get user's positioning assessment history
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session
    const userId = await requireAuth();

    // SECURITY: Require Pro tier for Positioning assessment history
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM positioning_assessments
      WHERE user_id = ${userId}
    `;
    const total = countResult?.[0]?.total ? parseInt(countResult[0].total) : 0;

    // Get assessments with pagination
    const assessments = await sql`
      SELECT
        id,
        user_id as "userId",
        positioning_grade as "positioningGrade",
        narrative_tightness_score as "narrativeTightnessScore",
        clarity_score as "clarityScore",
        clarity_grade as "clarityGrade",
        clarity_one_sentence as "clarityOneSentence",
        clarity_customer_pov as "clarityCustomerPov",
        clarity_solution_fit as "claritySolutionFit",
        clarity_specific_target as "claritySpecificTarget",
        clarity_feedback as "clarityFeedback",
        differentiation_score as "differentiationScore",
        differentiation_grade as "differentiationGrade",
        differentiation_vs_alternatives as "differentiationVsAlternatives",
        differentiation_competitor_awareness as "differentiationCompetitorAwareness",
        differentiation_why_you as "differentiationWhyYou",
        differentiation_feedback as "differentiationFeedback",
        market_understanding_score as "marketUnderstandingScore",
        market_understanding_grade as "marketUnderstandingGrade",
        market_landscape_understood as "marketLandscapeUnderstood",
        market_problem_validated as "marketProblemValidated",
        market_current_solutions as "marketCurrentSolutions",
        market_understanding_feedback as "marketUnderstandingFeedback",
        narrative_strength_score as "narrativeStrengthScore",
        narrative_strength_grade as "narrativeStrengthGrade",
        narrative_coherent as "narrativeCoherent",
        narrative_why_now as "narrativeWhyNow",
        narrative_creates_urgency as "narrativeCreatesUrgency",
        narrative_strength_feedback as "narrativeStrengthFeedback",
        gaps,
        next_actions as "nextActions",
        source_type as "sourceType",
        created_at as "createdAt"
      FROM positioning_assessments
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Transform data for response
    const formattedAssessments = assessments.map((a: any) => ({
      id: a.id,
      positioningGrade: a.positioningGrade,
      narrativeTightnessScore: a.narrativeTightnessScore,
      categories: {
        clarity: {
          score: a.clarityScore,
          grade: a.clarityGrade,
          elements: {
            oneSentence: a.clarityOneSentence,
            customerPov: a.clarityCustomerPov,
            solutionFit: a.claritySolutionFit,
            specificTarget: a.claritySpecificTarget,
          },
          feedback: a.clarityFeedback,
        },
        differentiation: {
          score: a.differentiationScore,
          grade: a.differentiationGrade,
          elements: {
            vsAlternatives: a.differentiationVsAlternatives,
            competitorAwareness: a.differentiationCompetitorAwareness,
            whyYou: a.differentiationWhyYou,
          },
          feedback: a.differentiationFeedback,
        },
        marketUnderstanding: {
          score: a.marketUnderstandingScore,
          grade: a.marketUnderstandingGrade,
          elements: {
            landscapeUnderstood: a.marketLandscapeUnderstood,
            problemValidated: a.marketProblemValidated,
            currentSolutions: a.marketCurrentSolutions,
          },
          feedback: a.marketUnderstandingFeedback,
        },
        narrativeStrength: {
          score: a.narrativeStrengthScore,
          grade: a.narrativeStrengthGrade,
          elements: {
            coherentStory: a.narrativeCoherent,
            whyNow: a.narrativeWhyNow,
            createsUrgency: a.narrativeCreatesUrgency,
          },
          feedback: a.narrativeStrengthFeedback,
        },
      },
      gaps: a.gaps,
      nextActions: a.nextActions,
      sourceType: a.sourceType,
      createdAt: a.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedAssessments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    if (error instanceof Response || (error && typeof error.status === 'number' && typeof error.json === 'function')) {
      return error;
    }
    console.error("[Positioning] Fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assessment history" },
      { status: 500 }
    );
  }
}
