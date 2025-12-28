import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { generateChatResponse } from "@/lib/ai/client";

// Reality Lens AI Analysis System Prompt
const REALITY_LENS_SYSTEM_PROMPT = `You are Fred Carey, a startup advisor who has coached 10,000+ founders. Analyze this startup idea objectively using your proven "5 Dimensions of Reality" framework.

Score each dimension 0-100 based on these criteria:

**FEASIBILITY (0-100)**: Can this be built with available resources?
- Technical complexity and required expertise
- Time to market and development resources
- Dependencies on emerging tech or infrastructure
- Regulatory or compliance barriers

**ECONOMICS (0-100)**: Is the unit economics viable?
- Revenue model clarity and sustainability
- Customer acquisition cost vs lifetime value
- Path to profitability and margins
- Pricing power and competitive positioning

**DEMAND (0-100)**: Is there real market need?
- Problem severity and frequency
- Willingness to pay for solution
- Market size and growth trajectory
- Evidence of customer pain points

**DISTRIBUTION (0-100)**: Is the go-to-market clear?
- Accessible customer acquisition channels
- Sales cycle length and complexity
- Partnership or platform opportunities
- Competitive moat and defensibility

**TIMING (0-100)**: Is the market timing right?
- Market maturity and adoption readiness
- Competitive landscape dynamics
- Technology enablers availability
- Regulatory or social trends alignment

Be direct, honest, and specific. Use your pattern recognition from 10,000+ founders to identify common pitfalls and opportunities. Provide actionable feedback that founders can act on immediately.

The overall score should be the average of all 5 dimensions, rounded to nearest integer.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "overallScore": <number 0-100>,
  "dimensions": {
    "feasibility": {
      "score": <number 0-100>,
      "analysis": "<2-3 sentence specific analysis>"
    },
    "economics": {
      "score": <number 0-100>,
      "analysis": "<2-3 sentence specific analysis>"
    },
    "demand": {
      "score": <number 0-100>,
      "analysis": "<2-3 sentence specific analysis>"
    },
    "distribution": {
      "score": <number 0-100>,
      "analysis": "<2-3 sentence specific analysis>"
    },
    "timing": {
      "score": <number 0-100>,
      "analysis": "<2-3 sentence specific analysis>"
    }
  },
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>", "<specific weakness 3>"],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"]
}`;

interface RealityLensInput {
  idea: string;
  stage?: string;
  market?: string;
}

interface DimensionScore {
  score: number;
  analysis: string;
}

interface RealityLensAnalysis {
  overallScore: number;
  dimensions: {
    feasibility: DimensionScore;
    economics: DimensionScore;
    demand: DimensionScore;
    distribution: DimensionScore;
    timing: DimensionScore;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * POST /api/reality-lens
 * Analyze a startup idea using Fred Carey's 5 Dimensions of Reality framework
 */
export async function POST(request: NextRequest) {
  try {
    // User ID from session cookie or header (auth integration pending)
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

    const body: RealityLensInput = await request.json();
    const { idea, stage, market } = body;

    // Validation
    if (!idea || idea.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Startup idea is required" },
        { status: 400 }
      );
    }

    if (idea.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: "Please provide more details about your startup idea (minimum 20 characters)" },
        { status: 400 }
      );
    }

    if (idea.trim().length > 2000) {
      return NextResponse.json(
        { success: false, error: "Idea description is too long (maximum 2000 characters)" },
        { status: 400 }
      );
    }

    // Build context for AI analysis
    let contextualIdea = `STARTUP IDEA:\n${idea.trim()}`;

    if (stage) {
      contextualIdea += `\n\nCURRENT STAGE: ${stage}`;
    }

    if (market) {
      contextualIdea += `\n\nTARGET MARKET: ${market}`;
    }

    // Generate AI analysis using Fred Carey's framework
    console.log("[Reality Lens] Analyzing idea for user:", userId);

    const aiResponse = await generateChatResponse(
      [
        {
          role: "user",
          content: contextualIdea,
        },
      ],
      REALITY_LENS_SYSTEM_PROMPT
    );

    // Parse AI response
    let analysis: RealityLensAnalysis;
    try {
      // Remove markdown code blocks if present
      const cleanResponse = aiResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      analysis = JSON.parse(cleanResponse);

      // Validate structure
      if (!analysis.overallScore || !analysis.dimensions || !analysis.strengths || !analysis.weaknesses || !analysis.recommendations) {
        throw new Error("Invalid AI response structure");
      }

      // Validate all dimension scores exist
      const requiredDimensions = ["feasibility", "economics", "demand", "distribution", "timing"];
      for (const dim of requiredDimensions) {
        if (!analysis.dimensions[dim as keyof typeof analysis.dimensions]) {
          throw new Error(`Missing dimension: ${dim}`);
        }
      }
    } catch (parseError) {
      console.error("[Reality Lens] AI response parse error:", parseError);
      console.error("[Reality Lens] Raw AI response:", aiResponse);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to analyze idea. Please try again.",
          details: process.env.NODE_ENV === "development" ? aiResponse : undefined
        },
        { status: 500 }
      );
    }

    // Save to database
    const result = await sql`
      INSERT INTO reality_lens_analyses (
        user_id,
        idea,
        stage,
        market,
        overall_score,
        feasibility_score,
        feasibility_analysis,
        economics_score,
        economics_analysis,
        demand_score,
        demand_analysis,
        distribution_score,
        distribution_analysis,
        timing_score,
        timing_analysis,
        strengths,
        weaknesses,
        recommendations,
        created_at
      )
      VALUES (
        ${userId},
        ${idea.trim()},
        ${stage || null},
        ${market || null},
        ${analysis.overallScore},
        ${analysis.dimensions.feasibility.score},
        ${analysis.dimensions.feasibility.analysis},
        ${analysis.dimensions.economics.score},
        ${analysis.dimensions.economics.analysis},
        ${analysis.dimensions.demand.score},
        ${analysis.dimensions.demand.analysis},
        ${analysis.dimensions.distribution.score},
        ${analysis.dimensions.distribution.analysis},
        ${analysis.dimensions.timing.score},
        ${analysis.dimensions.timing.analysis},
        ${JSON.stringify(analysis.strengths)},
        ${JSON.stringify(analysis.weaknesses)},
        ${JSON.stringify(analysis.recommendations)},
        NOW()
      )
      RETURNING
        id,
        user_id as "userId",
        idea,
        stage,
        market,
        overall_score as "overallScore",
        feasibility_score as "feasibilityScore",
        feasibility_analysis as "feasibilityAnalysis",
        economics_score as "economicsScore",
        economics_analysis as "economicsAnalysis",
        demand_score as "demandScore",
        demand_analysis as "demandAnalysis",
        distribution_score as "distributionScore",
        distribution_analysis as "distributionAnalysis",
        timing_score as "timingScore",
        timing_analysis as "timingAnalysis",
        strengths,
        weaknesses,
        recommendations,
        created_at as "createdAt"
    `;

    const savedAnalysis = result[0];

    console.log("[Reality Lens] Analysis saved with ID:", savedAnalysis.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: savedAnalysis.id,
          overallScore: savedAnalysis.overallScore,
          dimensions: {
            feasibility: {
              score: savedAnalysis.feasibilityScore,
              analysis: savedAnalysis.feasibilityAnalysis,
            },
            economics: {
              score: savedAnalysis.economicsScore,
              analysis: savedAnalysis.economicsAnalysis,
            },
            demand: {
              score: savedAnalysis.demandScore,
              analysis: savedAnalysis.demandAnalysis,
            },
            distribution: {
              score: savedAnalysis.distributionScore,
              analysis: savedAnalysis.distributionAnalysis,
            },
            timing: {
              score: savedAnalysis.timingScore,
              analysis: savedAnalysis.timingAnalysis,
            },
          },
          strengths: savedAnalysis.strengths,
          weaknesses: savedAnalysis.weaknesses,
          recommendations: savedAnalysis.recommendations,
          createdAt: savedAnalysis.createdAt,
        },
        message: "Idea analyzed successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Reality Lens] Analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze startup idea. Please try again.",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reality-lens
 * Get user's analysis history
 */
export async function GET(request: NextRequest) {
  try {
    // User ID from session cookie or header (auth integration pending)
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

    const { searchParams } = new URL(request.url);
    const userFilter = searchParams.get("userId") || userId;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM reality_lens_analyses
      WHERE user_id = ${userFilter}
    `;
    const total = parseInt(countResult[0].total);

    // Get analyses with pagination
    const analyses = await sql`
      SELECT
        id,
        user_id as "userId",
        idea,
        stage,
        market,
        overall_score as "overallScore",
        feasibility_score as "feasibilityScore",
        feasibility_analysis as "feasibilityAnalysis",
        economics_score as "economicsScore",
        economics_analysis as "economicsAnalysis",
        demand_score as "demandScore",
        demand_analysis as "demandAnalysis",
        distribution_score as "distributionScore",
        distribution_analysis as "distributionAnalysis",
        timing_score as "timingScore",
        timing_analysis as "timingAnalysis",
        strengths,
        weaknesses,
        recommendations,
        created_at as "createdAt"
      FROM reality_lens_analyses
      WHERE user_id = ${userFilter}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Transform data for response
    const formattedAnalyses = analyses.map((analysis) => ({
      id: analysis.id,
      idea: analysis.idea,
      stage: analysis.stage,
      market: analysis.market,
      overallScore: analysis.overallScore,
      dimensions: {
        feasibility: {
          score: analysis.feasibilityScore,
          analysis: analysis.feasibilityAnalysis,
        },
        economics: {
          score: analysis.economicsScore,
          analysis: analysis.economicsAnalysis,
        },
        demand: {
          score: analysis.demandScore,
          analysis: analysis.demandAnalysis,
        },
        distribution: {
          score: analysis.distributionScore,
          analysis: analysis.distributionAnalysis,
        },
        timing: {
          score: analysis.timingScore,
          analysis: analysis.timingAnalysis,
        },
      },
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      createdAt: analysis.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedAnalyses,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("[Reality Lens] Fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analysis history" },
      { status: 500 }
    );
  }
}
