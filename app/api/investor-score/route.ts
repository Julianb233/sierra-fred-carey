import { NextRequest, NextResponse } from "next/server";
import { generateTrackedResponse } from "@/lib/ai/client";
import { sql } from "@/lib/db/neon";
import { requireAuth } from "@/lib/auth";
import { extractInsights } from "@/lib/ai/insight-extractor";

// System prompt for investor readiness scoring
const INVESTOR_SCORE_SYSTEM_PROMPT = `You are Fred Cary, a seasoned investor and startup advisor assessing investor readiness for a startup. Your job is to provide honest, actionable feedback across 8 key dimensions.

Score each dimension 0-100 based on:
- **Team** (0-100): Founder experience, team completeness, track record, advisory board
- **Traction** (0-100): Revenue, users, growth rate, product-market fit signals
- **Market** (0-100): TAM/SAM/SOM size, market timing, competitive positioning
- **Product** (0-100): Differentiation, technical moat, scalability, IP
- **Financials** (0-100): Unit economics, burn rate, runway, financial projections
- **Legal** (0-100): Cap table cleanliness, IP ownership, regulatory compliance
- **Materials** (0-100): Pitch deck quality, data room completeness, references
- **Network** (0-100): Existing investor relationships, warm intro potential, advisor network

For each dimension:
- Give a score 0-100
- Provide specific, actionable feedback (2-3 sentences)
- Assign priority: "low", "medium", or "high" based on impact and urgency

Overall readiness levels:
- 0-40: "Not Ready" - significant work needed
- 41-60: "Getting There" - making progress but gaps remain
- 61-80: "Almost Ready" - minor improvements needed
- 81-100: "Investor Ready" - ready to raise

Respond ONLY with valid JSON in this exact format:
{
  "overallScore": number,
  "readinessLevel": "Not Ready" | "Getting There" | "Almost Ready" | "Investor Ready",
  "dimensions": {
    "team": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" },
    "traction": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" },
    "market": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" },
    "product": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" },
    "financials": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" },
    "legal": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" },
    "materials": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" },
    "network": { "score": number, "feedback": "string", "priority": "low" | "medium" | "high" }
  },
  "topPriorities": ["string", "string", "string"],
  "nextSteps": ["string", "string", "string"]
}`;

// Type definitions
interface DimensionScore {
  score: number;
  feedback: string;
  priority: "low" | "medium" | "high";
}

interface InvestorScoreResponse {
  overallScore: number;
  readinessLevel: "Not Ready" | "Getting There" | "Almost Ready" | "Investor Ready";
  dimensions: {
    team: DimensionScore;
    traction: DimensionScore;
    market: DimensionScore;
    product: DimensionScore;
    financials: DimensionScore;
    legal: DimensionScore;
    materials: DimensionScore;
    network: DimensionScore;
  };
  topPriorities: string[];
  nextSteps: string[];
}

interface StartupProfile {
  team?: {
    founders?: string;
    experience?: string;
    advisors?: string;
  };
  traction?: {
    revenue?: string;
    users?: string;
    growth?: string;
  };
  market?: {
    tam?: string;
    sam?: string;
    som?: string;
    timing?: string;
  };
  product?: {
    description?: string;
    differentiation?: string;
    moat?: string;
  };
  financials?: {
    unitEconomics?: string;
    runway?: string;
    burnRate?: string;
  };
  legal?: {
    capTable?: string;
    ip?: string;
    compliance?: string;
  };
  materials?: {
    deck?: string;
    dataRoom?: string;
    references?: string;
  };
  network?: {
    investors?: string;
    warmIntros?: string;
  };
}

/**
 * POST /api/investor-score
 * Calculate investor readiness score for a startup
 *
 * SECURITY: Requires authentication - userId from server-side session
 * TRACKING: Uses generateTrackedResponse for full logging and A/B testing
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { profile } = body as { profile: StartupProfile };

    if (!profile || typeof profile !== "object") {
      return NextResponse.json(
        { error: "profile object is required" },
        { status: 400 }
      );
    }

    // Build prompt from startup profile
    const profileSummary = formatProfileForPrompt(profile);

    // Call AI to generate score using tracked response
    const trackedResult = await generateTrackedResponse(
      [
        {
          role: "user",
          content: `Assess this startup's investor readiness:\n\n${profileSummary}`,
        },
      ],
      INVESTOR_SCORE_SYSTEM_PROMPT,
      {
        userId,
        analyzer: "investor_score",
        inputData: { profile },
      }
    );

    const aiResponse = trackedResult.content;

    // Parse AI response
    let scoreData: InvestorScoreResponse;
    try {
      scoreData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      throw new Error("AI returned invalid JSON response");
    }

    // Validate response structure
    if (!validateScoreResponse(scoreData)) {
      throw new Error("AI response missing required fields");
    }

    // Save to database
    const result = await sql`
      INSERT INTO investor_scores (
        user_id,
        overall_score,
        readiness_level,
        team_score, team_feedback, team_priority,
        traction_score, traction_feedback, traction_priority,
        market_score, market_feedback, market_priority,
        product_score, product_feedback, product_priority,
        financials_score, financials_feedback, financials_priority,
        legal_score, legal_feedback, legal_priority,
        materials_score, materials_feedback, materials_priority,
        network_score, network_feedback, network_priority,
        top_priorities,
        next_steps,
        input_data
      ) VALUES (
        ${userId},
        ${scoreData.overallScore},
        ${scoreData.readinessLevel},
        ${scoreData.dimensions.team.score}, ${scoreData.dimensions.team.feedback}, ${scoreData.dimensions.team.priority},
        ${scoreData.dimensions.traction.score}, ${scoreData.dimensions.traction.feedback}, ${scoreData.dimensions.traction.priority},
        ${scoreData.dimensions.market.score}, ${scoreData.dimensions.market.feedback}, ${scoreData.dimensions.market.priority},
        ${scoreData.dimensions.product.score}, ${scoreData.dimensions.product.feedback}, ${scoreData.dimensions.product.priority},
        ${scoreData.dimensions.financials.score}, ${scoreData.dimensions.financials.feedback}, ${scoreData.dimensions.financials.priority},
        ${scoreData.dimensions.legal.score}, ${scoreData.dimensions.legal.feedback}, ${scoreData.dimensions.legal.priority},
        ${scoreData.dimensions.materials.score}, ${scoreData.dimensions.materials.feedback}, ${scoreData.dimensions.materials.priority},
        ${scoreData.dimensions.network.score}, ${scoreData.dimensions.network.feedback}, ${scoreData.dimensions.network.priority},
        ${JSON.stringify(scoreData.topPriorities)},
        ${JSON.stringify(scoreData.nextSteps)},
        ${JSON.stringify(profile)}
      )
      RETURNING id, created_at
    `;

    const savedScore = result[0];

    return NextResponse.json({
      success: true,
      scoreId: savedScore.id,
      createdAt: savedScore.created_at,
      score: scoreData,
    });
  } catch (error) {
    console.error("Error calculating investor score:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate investor score",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/investor-score?userId=xxx
 * Get score history for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch user's score history
    const scores = await sql`
      SELECT
        id,
        overall_score,
        readiness_level,
        team_score, team_feedback, team_priority,
        traction_score, traction_feedback, traction_priority,
        market_score, market_feedback, market_priority,
        product_score, product_feedback, product_priority,
        financials_score, financials_feedback, financials_priority,
        legal_score, legal_feedback, legal_priority,
        materials_score, materials_feedback, materials_priority,
        network_score, network_feedback, network_priority,
        top_priorities,
        next_steps,
        input_data,
        created_at
      FROM investor_scores
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Transform database rows to API response format
    const formattedScores = scores.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      overallScore: row.overall_score,
      readinessLevel: row.readiness_level,
      dimensions: {
        team: {
          score: row.team_score,
          feedback: row.team_feedback,
          priority: row.team_priority,
        },
        traction: {
          score: row.traction_score,
          feedback: row.traction_feedback,
          priority: row.traction_priority,
        },
        market: {
          score: row.market_score,
          feedback: row.market_feedback,
          priority: row.market_priority,
        },
        product: {
          score: row.product_score,
          feedback: row.product_feedback,
          priority: row.product_priority,
        },
        financials: {
          score: row.financials_score,
          feedback: row.financials_feedback,
          priority: row.financials_priority,
        },
        legal: {
          score: row.legal_score,
          feedback: row.legal_feedback,
          priority: row.legal_priority,
        },
        materials: {
          score: row.materials_score,
          feedback: row.materials_feedback,
          priority: row.materials_priority,
        },
        network: {
          score: row.network_score,
          feedback: row.network_feedback,
          priority: row.network_priority,
        },
      },
      topPriorities: row.top_priorities,
      nextSteps: row.next_steps,
      inputData: row.input_data,
    }));

    return NextResponse.json({
      success: true,
      count: formattedScores.length,
      scores: formattedScores,
    });
  } catch (error) {
    console.error("Error fetching investor scores:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch investor scores",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper functions

function formatProfileForPrompt(profile: StartupProfile): string {
  const sections: string[] = [];

  if (profile.team) {
    sections.push("**TEAM:**");
    if (profile.team.founders) sections.push(`Founders: ${profile.team.founders}`);
    if (profile.team.experience) sections.push(`Experience: ${profile.team.experience}`);
    if (profile.team.advisors) sections.push(`Advisors: ${profile.team.advisors}`);
  }

  if (profile.traction) {
    sections.push("\n**TRACTION:**");
    if (profile.traction.revenue) sections.push(`Revenue: ${profile.traction.revenue}`);
    if (profile.traction.users) sections.push(`Users: ${profile.traction.users}`);
    if (profile.traction.growth) sections.push(`Growth: ${profile.traction.growth}`);
  }

  if (profile.market) {
    sections.push("\n**MARKET:**");
    if (profile.market.tam) sections.push(`TAM: ${profile.market.tam}`);
    if (profile.market.sam) sections.push(`SAM: ${profile.market.sam}`);
    if (profile.market.som) sections.push(`SOM: ${profile.market.som}`);
    if (profile.market.timing) sections.push(`Timing: ${profile.market.timing}`);
  }

  if (profile.product) {
    sections.push("\n**PRODUCT:**");
    if (profile.product.description) sections.push(`Description: ${profile.product.description}`);
    if (profile.product.differentiation) sections.push(`Differentiation: ${profile.product.differentiation}`);
    if (profile.product.moat) sections.push(`Moat: ${profile.product.moat}`);
  }

  if (profile.financials) {
    sections.push("\n**FINANCIALS:**");
    if (profile.financials.unitEconomics) sections.push(`Unit Economics: ${profile.financials.unitEconomics}`);
    if (profile.financials.runway) sections.push(`Runway: ${profile.financials.runway}`);
    if (profile.financials.burnRate) sections.push(`Burn Rate: ${profile.financials.burnRate}`);
  }

  if (profile.legal) {
    sections.push("\n**LEGAL:**");
    if (profile.legal.capTable) sections.push(`Cap Table: ${profile.legal.capTable}`);
    if (profile.legal.ip) sections.push(`IP: ${profile.legal.ip}`);
    if (profile.legal.compliance) sections.push(`Compliance: ${profile.legal.compliance}`);
  }

  if (profile.materials) {
    sections.push("\n**MATERIALS:**");
    if (profile.materials.deck) sections.push(`Deck: ${profile.materials.deck}`);
    if (profile.materials.dataRoom) sections.push(`Data Room: ${profile.materials.dataRoom}`);
    if (profile.materials.references) sections.push(`References: ${profile.materials.references}`);
  }

  if (profile.network) {
    sections.push("\n**NETWORK:**");
    if (profile.network.investors) sections.push(`Investors: ${profile.network.investors}`);
    if (profile.network.warmIntros) sections.push(`Warm Intros: ${profile.network.warmIntros}`);
  }

  return sections.join("\n");
}

function validateScoreResponse(data: any): data is InvestorScoreResponse {
  if (!data || typeof data !== "object") return false;
  if (typeof data.overallScore !== "number") return false;
  if (!["Not Ready", "Getting There", "Almost Ready", "Investor Ready"].includes(data.readinessLevel)) return false;
  if (!data.dimensions || typeof data.dimensions !== "object") return false;

  const requiredDimensions = ["team", "traction", "market", "product", "financials", "legal", "materials", "network"];
  for (const dim of requiredDimensions) {
    const dimension = data.dimensions[dim];
    if (!dimension || typeof dimension !== "object") return false;
    if (typeof dimension.score !== "number") return false;
    if (typeof dimension.feedback !== "string") return false;
    if (!["low", "medium", "high"].includes(dimension.priority)) return false;
  }

  if (!Array.isArray(data.topPriorities)) return false;
  if (!Array.isArray(data.nextSteps)) return false;

  return true;
}
