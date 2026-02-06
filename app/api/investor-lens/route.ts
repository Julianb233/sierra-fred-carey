import { NextRequest, NextResponse } from "next/server";
import { generateTrackedResponse } from "@/lib/ai/client";
import { extractJSON } from "@/lib/ai/extract-json";
import { sql } from "@/lib/db/supabase-sql";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { extractInsights } from "@/lib/ai/insight-extractor";
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

// Type definitions

type FundingStage = "pre_seed" | "seed" | "series_a";
type ICVerdict = "yes" | "no" | "not_yet";

interface StartupProfile {
  // Company basics
  companyName?: string;
  description?: string;
  website?: string;

  // Team
  founders?: {
    name: string;
    background: string;
    role: string;
  }[];
  teamSize?: number;
  keyHires?: string[];

  // Market & Problem
  targetMarket?: string;
  marketSize?: string;
  problem?: string;
  problemEvidence?: string;

  // Solution & Product
  solution?: string;
  productStage?: string;
  differentiation?: string;
  competitiveAdvantage?: string;

  // Traction
  revenue?: string;
  revenueGrowth?: string;
  users?: string;
  userGrowth?: string;
  retention?: string;
  nps?: number;

  // Business Model
  businessModel?: string;
  pricing?: string;
  unitEconomics?: string;
  margins?: string;

  // GTM
  distribution?: string;
  customerAcquisition?: string;
  salesCycle?: string;

  // Fundraising
  askAmount?: string;
  valuation?: string;
  previousRaises?: string;
  useOfFunds?: string;
}

interface InvestorLensRequest {
  profile: StartupProfile;
  fundingStage: FundingStage;
}

interface AxisScore {
  score: number;
  subscores?: Record<string, number>;
  feedback: string;
}

interface HiddenFilter {
  filter: string;
  detected: boolean;
  explanation: string;
}

interface PassReason {
  reason: string;
  evidenceToFlip: string;
  priority: "high" | "medium" | "low";
}

interface DeriskingAction {
  action: string;
  timeline: string;
  priority: "high" | "medium" | "low";
  impact: string;
}

interface InvestorLensResponse {
  icVerdict: ICVerdict;
  icVerdictReasoning: string;

  // Core VC Evaluation Axes
  axes: {
    team: AxisScore & {
      subscores: {
        founderMarketFit: number;
        learningVelocity: number;
        abilityToRecruit: number;
      };
    };
    market: AxisScore & {
      subscores: {
        size: number;
        urgency: number;
        timing: number;
      };
    };
    problem: AxisScore & {
      subscores: {
        painful: number;
        frequent: number;
        expensive: number;
      };
    };
    solution: AxisScore & {
      subscores: {
        approach: number;
        vsAlternatives: number;
        whyNow: number;
      };
    };
    gtm: AxisScore & {
      subscores: {
        distribution: number;
        repeatability: number;
      };
    };
    traction: AxisScore & {
      subscores: {
        retention: number;
        usage: number;
        revenue: number;
      };
    };
    businessModel: AxisScore & {
      subscores: {
        pricing: number;
        margin: number;
        scalability: number;
      };
    };
    fundFit: AxisScore;
    valuation: AxisScore;
  };

  // Hidden/Unspoken VC Filters
  hiddenFilters: HiddenFilter[];

  // Top Pass Reasons
  topPassReasons: PassReason[];

  // De-risking Actions
  deriskingActions: DeriskingAction[];

  // Stage-specific outputs
  stageSpecific: {
    // Pre-Seed
    killSignals?: string[];
    thirtyDayPlan?: string[];

    // Seed
    tractionQualityScore?: number;
    repeatabilityScore?: number;
    seriesAClarity?: number;
    milestoneMap?: string[];

    // Series A
    objections?: string[];
    ninetyDayPlan?: string[];
  };

  // Deck recommendation
  deckRecommendation: {
    deckNeeded: boolean;
    reason: string;
    deckType?: "summary" | "full_deck";
  };

  // Venture-backability assessment
  ventureBackable: boolean;
  ventureBackableReason?: string;
}

// Stage-specific system prompts
const getSystemPrompt = (stage: FundingStage): string => {
  const basePrompt = `You are a veteran VC partner with 20+ years of experience across 500+ investments. Your job is to provide a brutally honest IC (Investment Committee) evaluation of this startup.

CRITICAL RULES:
1. Never encourage fundraising by default. Many great businesses aren't venture-backable.
2. Say plainly when a startup is not venture-backable, and explain why without sugarcoating.
3. Translate vague VC feedback into explicit pass reasons. Never hide behind "not a fit right now."
4. Issue a provisional verdict FIRST - never ask for a deck by default.
5. Focus on what ACTUALLY makes VCs pass, not what they SAY makes them pass.

Your IC verdict must be one of:
- "yes": Would invest at this stage with terms to be negotiated
- "no": Would not invest - explain exactly why
- "not_yet": Could invest with specific milestones - be explicit about what needs to change

CORE VC EVALUATION AXES (Score each 0-100):

1. TEAM
   - Founder-Market Fit: Why THIS team for THIS problem?
   - Learning Velocity: How fast do they incorporate feedback?
   - Ability to Recruit: Can they attract A-players?

2. MARKET
   - Size: Is this a $1B+ outcome market?
   - Urgency: Why must customers buy NOW?
   - Timing: Why is NOW the right moment?

3. PROBLEM
   - Painful: How acute is the problem?
   - Frequent: How often does it occur?
   - Expensive: What's the cost of not solving it?

4. SOLUTION & DIFFERENTIATION
   - Approach: Is this the right way to solve it?
   - vs Alternatives: Why is this 10x better?
   - Why Now: What changed to make this possible?

5. GO-TO-MARKET
   - Distribution: How do customers find you?
   - Repeatability: Can this scale predictably?

6. TRACTION QUALITY
   - Retention: Are customers staying?
   - Usage: Are they using it deeply?
   - Revenue: Is there willingness to pay?

7. BUSINESS MODEL
   - Pricing: Is the pricing power strong?
   - Margin: Are unit economics healthy?
   - Scalability: Does it get better at scale?

8. FUND FIT
   - Does this fit a typical VC fund's thesis?
   - Can it return a significant multiple on a fund?

9. VALUATION REALISM
   - Is the ask reasonable for the stage and metrics?

HIDDEN VC FILTERS TO CHECK:
- Outcome size mismatch (can this be $100M+ revenue?)
- Founder-investor culture clash signals
- Prior relationship or referral quality concerns
- Market category bias (oversaturated, out of thesis)
- Geographic or regulatory complexity
- Competitive timing concerns`;

  const stageSpecificPrompts: Record<FundingStage, string> = {
    pre_seed: `

STAGE: PRE-SEED
At this stage, focus on:
- Team DNA and founder-market fit (60% weight)
- Problem clarity and personal experience with it
- Initial signal of demand (waitlist, LOIs, early design partners)
- Market timing thesis

PRE-SEED SPECIFIC OUTPUTS:
1. Kill Signals: List any immediate red flags that would stop the investment
2. 30-Day Plan: If verdict is "not_yet", provide a 30-day sprint to address top gaps

The bar is: "Would I bet on THIS team to figure it out in THIS market?"`,

    seed: `

STAGE: SEED
At this stage, focus on:
- Validated problem-solution fit with real usage data
- Early traction quality (not just vanity metrics)
- Clear path to Series A milestones
- Repeatable acquisition channels emerging

SEED SPECIFIC OUTPUTS:
1. Traction Quality Score (0-100): Quality of existing traction
2. Repeatability Score (0-100): Likelihood of scaling what's working
3. Series A Clarity Score (0-100): How clear is the path to Series A?
4. Milestone Map: Key milestones needed before Series A

The bar is: "Is there enough signal in the noise to justify the risk?"`,

    series_a: `

STAGE: SERIES A
At this stage, focus on:
- Clear evidence of product-market fit (retention, NPS, growth)
- Scalable and profitable unit economics
- Proven GTM playbook that can 10x
- Clear use of funds tied to specific milestones

SERIES A SPECIFIC OUTPUTS:
1. Likely Objections: What will other IC members push back on?
2. 90-Day Plan: If verdict is "not_yet", provide a 90-day plan to address gaps

The bar is: "Is the machine proven enough to pour fuel on?"`,
  };

  const outputFormat = `

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "icVerdict": "yes" | "no" | "not_yet",
  "icVerdictReasoning": "2-3 sentences explaining the verdict",
  "axes": {
    "team": {
      "score": 0-100,
      "subscores": { "founderMarketFit": 0-100, "learningVelocity": 0-100, "abilityToRecruit": 0-100 },
      "feedback": "1-2 sentences"
    },
    "market": {
      "score": 0-100,
      "subscores": { "size": 0-100, "urgency": 0-100, "timing": 0-100 },
      "feedback": "1-2 sentences"
    },
    "problem": {
      "score": 0-100,
      "subscores": { "painful": 0-100, "frequent": 0-100, "expensive": 0-100 },
      "feedback": "1-2 sentences"
    },
    "solution": {
      "score": 0-100,
      "subscores": { "approach": 0-100, "vsAlternatives": 0-100, "whyNow": 0-100 },
      "feedback": "1-2 sentences"
    },
    "gtm": {
      "score": 0-100,
      "subscores": { "distribution": 0-100, "repeatability": 0-100 },
      "feedback": "1-2 sentences"
    },
    "traction": {
      "score": 0-100,
      "subscores": { "retention": 0-100, "usage": 0-100, "revenue": 0-100 },
      "feedback": "1-2 sentences"
    },
    "businessModel": {
      "score": 0-100,
      "subscores": { "pricing": 0-100, "margin": 0-100, "scalability": 0-100 },
      "feedback": "1-2 sentences"
    },
    "fundFit": {
      "score": 0-100,
      "feedback": "1-2 sentences"
    },
    "valuation": {
      "score": 0-100,
      "feedback": "1-2 sentences"
    }
  },
  "hiddenFilters": [
    { "filter": "string", "detected": boolean, "explanation": "string" }
  ],
  "topPassReasons": [
    { "reason": "string", "evidenceToFlip": "string", "priority": "high" | "medium" | "low" }
  ],
  "deriskingActions": [
    { "action": "string", "timeline": "string", "priority": "high" | "medium" | "low", "impact": "string" }
  ],
  "stageSpecific": {
    // Include stage-appropriate fields based on funding stage
  },
  "deckRecommendation": {
    "deckNeeded": boolean,
    "reason": "string",
    "deckType": "summary" | "full_deck" (optional)
  },
  "ventureBackable": boolean,
  "ventureBackableReason": "string (required if ventureBackable is false)"
}`;

  return basePrompt + stageSpecificPrompts[stage] + outputFormat;
};

// Helper to format profile for AI prompt
function formatProfileForPrompt(profile: StartupProfile, stage: FundingStage): string {
  const sections: string[] = [];

  sections.push(`FUNDING STAGE: ${stage.replace("_", "-").toUpperCase()}`);

  if (profile.companyName) {
    sections.push(`\nCOMPANY: ${profile.companyName}`);
  }
  if (profile.description) {
    sections.push(`DESCRIPTION: ${profile.description}`);
  }
  if (profile.website) {
    sections.push(`WEBSITE: ${profile.website}`);
  }

  // Team
  if (profile.founders && profile.founders.length > 0) {
    sections.push("\n**TEAM:**");
    profile.founders.forEach((f, i) => {
      sections.push(`Founder ${i + 1}: ${f.name} - ${f.role}`);
      sections.push(`  Background: ${f.background}`);
    });
  }
  if (profile.teamSize) {
    sections.push(`Team Size: ${profile.teamSize}`);
  }
  if (profile.keyHires && profile.keyHires.length > 0) {
    sections.push(`Key Hires Needed: ${profile.keyHires.join(", ")}`);
  }

  // Market & Problem
  if (profile.targetMarket || profile.marketSize || profile.problem) {
    sections.push("\n**MARKET & PROBLEM:**");
    if (profile.targetMarket) sections.push(`Target Market: ${profile.targetMarket}`);
    if (profile.marketSize) sections.push(`Market Size: ${profile.marketSize}`);
    if (profile.problem) sections.push(`Problem: ${profile.problem}`);
    if (profile.problemEvidence) sections.push(`Problem Evidence: ${profile.problemEvidence}`);
  }

  // Solution
  if (profile.solution || profile.productStage) {
    sections.push("\n**SOLUTION & PRODUCT:**");
    if (profile.solution) sections.push(`Solution: ${profile.solution}`);
    if (profile.productStage) sections.push(`Product Stage: ${profile.productStage}`);
    if (profile.differentiation) sections.push(`Differentiation: ${profile.differentiation}`);
    if (profile.competitiveAdvantage) sections.push(`Competitive Advantage: ${profile.competitiveAdvantage}`);
  }

  // Traction
  if (profile.revenue || profile.users || profile.retention) {
    sections.push("\n**TRACTION:**");
    if (profile.revenue) sections.push(`Revenue: ${profile.revenue}`);
    if (profile.revenueGrowth) sections.push(`Revenue Growth: ${profile.revenueGrowth}`);
    if (profile.users) sections.push(`Users: ${profile.users}`);
    if (profile.userGrowth) sections.push(`User Growth: ${profile.userGrowth}`);
    if (profile.retention) sections.push(`Retention: ${profile.retention}`);
    if (profile.nps !== undefined) sections.push(`NPS: ${profile.nps}`);
  }

  // Business Model
  if (profile.businessModel || profile.pricing) {
    sections.push("\n**BUSINESS MODEL:**");
    if (profile.businessModel) sections.push(`Model: ${profile.businessModel}`);
    if (profile.pricing) sections.push(`Pricing: ${profile.pricing}`);
    if (profile.unitEconomics) sections.push(`Unit Economics: ${profile.unitEconomics}`);
    if (profile.margins) sections.push(`Margins: ${profile.margins}`);
  }

  // GTM
  if (profile.distribution || profile.customerAcquisition) {
    sections.push("\n**GO-TO-MARKET:**");
    if (profile.distribution) sections.push(`Distribution: ${profile.distribution}`);
    if (profile.customerAcquisition) sections.push(`Customer Acquisition: ${profile.customerAcquisition}`);
    if (profile.salesCycle) sections.push(`Sales Cycle: ${profile.salesCycle}`);
  }

  // Fundraising
  if (profile.askAmount || profile.valuation) {
    sections.push("\n**FUNDRAISING:**");
    if (profile.askAmount) sections.push(`Ask Amount: ${profile.askAmount}`);
    if (profile.valuation) sections.push(`Valuation: ${profile.valuation}`);
    if (profile.previousRaises) sections.push(`Previous Raises: ${profile.previousRaises}`);
    if (profile.useOfFunds) sections.push(`Use of Funds: ${profile.useOfFunds}`);
  }

  return sections.join("\n");
}

// Validation helper
function validateResponse(data: any): data is InvestorLensResponse {
  if (!data || typeof data !== "object") return false;
  if (!["yes", "no", "not_yet"].includes(data.icVerdict)) return false;
  if (typeof data.icVerdictReasoning !== "string") return false;
  if (!data.axes || typeof data.axes !== "object") return false;
  if (typeof data.ventureBackable !== "boolean") return false;

  const requiredAxes = ["team", "market", "problem", "solution", "gtm", "traction", "businessModel", "fundFit", "valuation"];
  for (const axis of requiredAxes) {
    if (!data.axes[axis] || typeof data.axes[axis].score !== "number") return false;
  }

  return true;
}

/**
 * POST /api/investor-lens
 * Create a new investor lens evaluation
 *
 * SECURITY: Requires authentication - userId from server-side session
 * TRACKING: Uses generateTrackedResponse for full logging and A/B testing
 */
export async function POST(request: NextRequest) {
  try {
    // Pro tier required for Investor Lens
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Investor Lens requires Pro tier" },
        { status: 403 }
      );
    }

    const userId = await requireAuth();

    const body: InvestorLensRequest = await request.json();
    const { profile, fundingStage } = body;

    // Validation
    if (!profile || typeof profile !== "object") {
      return NextResponse.json(
        { success: false, error: "Startup profile is required" },
        { status: 400 }
      );
    }

    if (!fundingStage || !["pre_seed", "seed", "series_a"].includes(fundingStage)) {
      return NextResponse.json(
        { success: false, error: "Valid funding stage is required (pre_seed, seed, or series_a)" },
        { status: 400 }
      );
    }

    // Build prompt
    const profileSummary = formatProfileForPrompt(profile, fundingStage);
    const systemPrompt = getSystemPrompt(fundingStage);

    console.log("[Investor Lens] Evaluating startup for user:", userId, "Stage:", fundingStage);

    // Call AI
    const trackedResult = await generateTrackedResponse(
      [
        {
          role: "user",
          content: `Evaluate this startup for IC decision:\n\n${profileSummary}`,
        },
      ],
      systemPrompt,
      {
        userId,
        analyzer: "investor_lens",
        inputData: { profile, fundingStage },
      }
    );

    const aiResponse = trackedResult.content;

    // Parse response
    let evaluation: InvestorLensResponse;
    try {
      evaluation = extractJSON<InvestorLensResponse>(aiResponse);

      if (!validateResponse(evaluation)) {
        throw new Error("Invalid AI response structure");
      }
    } catch (parseError) {
      console.error("[Investor Lens] AI response parse error:", parseError);
      console.error("[Investor Lens] Raw AI response:", aiResponse);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to evaluate startup. Please try again.",
          details: process.env.NODE_ENV === "development" ? aiResponse : undefined,
        },
        { status: 500 }
      );
    }

    // Save to database
    const result = await sql`
      INSERT INTO investor_lens_evaluations (
        user_id,
        funding_stage,
        ic_verdict,
        ic_verdict_reasoning,

        team_founder_market_fit_score,
        team_learning_velocity_score,
        team_ability_to_recruit_score,
        team_feedback,

        market_size_score,
        market_urgency_score,
        market_timing_score,
        market_feedback,

        problem_painful_score,
        problem_frequent_score,
        problem_expensive_score,
        problem_feedback,

        solution_approach_score,
        solution_vs_alternatives_score,
        solution_why_now_score,
        solution_feedback,

        gtm_distribution_score,
        gtm_repeatability_score,
        gtm_feedback,

        traction_retention_score,
        traction_usage_score,
        traction_revenue_score,
        traction_feedback,

        business_pricing_score,
        business_margin_score,
        business_scalability_score,
        business_feedback,

        fund_fit_score,
        fund_fit_feedback,

        valuation_realism_score,
        valuation_feedback,

        hidden_filters,
        top_pass_reasons,
        derisking_actions,

        preseed_kill_signals,
        preseed_30day_plan,

        seed_traction_quality_score,
        seed_repeatability_score,
        seed_series_a_clarity_score,
        seed_milestone_map,

        seriesa_objections,
        seriesa_90day_plan,

        deck_requested,
        deck_premature_reason,

        input_data
      ) VALUES (
        ${userId},
        ${fundingStage},
        ${evaluation.icVerdict},
        ${evaluation.icVerdictReasoning},

        ${evaluation.axes.team.subscores?.founderMarketFit || null},
        ${evaluation.axes.team.subscores?.learningVelocity || null},
        ${evaluation.axes.team.subscores?.abilityToRecruit || null},
        ${evaluation.axes.team.feedback},

        ${evaluation.axes.market.subscores?.size || null},
        ${evaluation.axes.market.subscores?.urgency || null},
        ${evaluation.axes.market.subscores?.timing || null},
        ${evaluation.axes.market.feedback},

        ${evaluation.axes.problem.subscores?.painful || null},
        ${evaluation.axes.problem.subscores?.frequent || null},
        ${evaluation.axes.problem.subscores?.expensive || null},
        ${evaluation.axes.problem.feedback},

        ${evaluation.axes.solution.subscores?.approach || null},
        ${evaluation.axes.solution.subscores?.vsAlternatives || null},
        ${evaluation.axes.solution.subscores?.whyNow || null},
        ${evaluation.axes.solution.feedback},

        ${evaluation.axes.gtm.subscores?.distribution || null},
        ${evaluation.axes.gtm.subscores?.repeatability || null},
        ${evaluation.axes.gtm.feedback},

        ${evaluation.axes.traction.subscores?.retention || null},
        ${evaluation.axes.traction.subscores?.usage || null},
        ${evaluation.axes.traction.subscores?.revenue || null},
        ${evaluation.axes.traction.feedback},

        ${evaluation.axes.businessModel.subscores?.pricing || null},
        ${evaluation.axes.businessModel.subscores?.margin || null},
        ${evaluation.axes.businessModel.subscores?.scalability || null},
        ${evaluation.axes.businessModel.feedback},

        ${evaluation.axes.fundFit.score},
        ${evaluation.axes.fundFit.feedback},

        ${evaluation.axes.valuation.score},
        ${evaluation.axes.valuation.feedback},

        ${JSON.stringify(evaluation.hiddenFilters)},
        ${JSON.stringify(evaluation.topPassReasons)},
        ${JSON.stringify(evaluation.deriskingActions)},

        ${fundingStage === "pre_seed" ? JSON.stringify(evaluation.stageSpecific?.killSignals || []) : null},
        ${fundingStage === "pre_seed" ? JSON.stringify(evaluation.stageSpecific?.thirtyDayPlan || []) : null},

        ${fundingStage === "seed" ? evaluation.stageSpecific?.tractionQualityScore || null : null},
        ${fundingStage === "seed" ? evaluation.stageSpecific?.repeatabilityScore || null : null},
        ${fundingStage === "seed" ? evaluation.stageSpecific?.seriesAClarity || null : null},
        ${fundingStage === "seed" ? JSON.stringify(evaluation.stageSpecific?.milestoneMap || []) : null},

        ${fundingStage === "series_a" ? JSON.stringify(evaluation.stageSpecific?.objections || []) : null},
        ${fundingStage === "series_a" ? JSON.stringify(evaluation.stageSpecific?.ninetyDayPlan || []) : null},

        ${evaluation.deckRecommendation?.deckNeeded || false},
        ${!evaluation.deckRecommendation?.deckNeeded ? evaluation.deckRecommendation?.reason : null},

        ${JSON.stringify({ ...profile, fundingStage })}
      )
      RETURNING id, created_at
    `;

    const savedEvaluation = result[0];

    console.log("[Investor Lens] Evaluation saved with ID:", savedEvaluation.id);

    // Extract insights (async, non-blocking)
    extractInsights(
      userId,
      "investor_lens",
      savedEvaluation.id,
      aiResponse,
      `Investor Lens IC evaluation - Verdict: ${evaluation.icVerdict}, Stage: ${fundingStage}`
    ).catch((err) => console.error("[Investor Lens] Insight extraction failed:", err));

    // Log journey event
    try {
      await sql`
        INSERT INTO journey_events (user_id, event_type, event_data)
        VALUES (
          ${userId},
          'investor_lens_evaluation',
          ${JSON.stringify({
            evaluationId: savedEvaluation.id,
            fundingStage,
            icVerdict: evaluation.icVerdict,
            ventureBackable: evaluation.ventureBackable,
            requestId: trackedResult.requestId,
            variant: trackedResult.variant,
          })}
        )
      `;
    } catch (err) {
      console.error("[Investor Lens] Journey event logging failed:", err);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: savedEvaluation.id,
          createdAt: savedEvaluation.created_at,
          fundingStage,
          ...evaluation,
        },
        meta: {
          requestId: trackedResult.requestId,
          responseId: trackedResult.responseId,
          latencyMs: trackedResult.latencyMs,
          variant: trackedResult.variant,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Investor Lens] Evaluation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to evaluate startup. Please try again.",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/investor-lens
 * Get evaluation history for the authenticated user
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // Pro tier required for Investor Lens
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Investor Lens requires Pro tier" },
        { status: 403 }
      );
    }

    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const stage = searchParams.get("stage") as FundingStage | null;
    const verdict = searchParams.get("verdict") as ICVerdict | null;

    // Use Supabase query builder for composable filtering
    const supabase = createServiceClient();

    // Build count query
    let countQuery = supabase
      .from("investor_lens_evaluations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (stage && ["pre_seed", "seed", "series_a"].includes(stage)) {
      countQuery = countQuery.eq("funding_stage", stage);
    }
    if (verdict && ["yes", "no", "not_yet"].includes(verdict)) {
      countQuery = countQuery.eq("ic_verdict", verdict);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error("[Investor Lens] Count query error:", countError);
    }
    const total = count ?? 0;

    // Build data query with same filters
    let dataQuery = supabase
      .from("investor_lens_evaluations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (stage && ["pre_seed", "seed", "series_a"].includes(stage)) {
      dataQuery = dataQuery.eq("funding_stage", stage);
    }
    if (verdict && ["yes", "no", "not_yet"].includes(verdict)) {
      dataQuery = dataQuery.eq("ic_verdict", verdict);
    }

    const { data: evaluations, error: dataError } = await dataQuery;
    if (dataError) {
      throw new Error(`Failed to fetch evaluations: ${dataError.message}`);
    }

    // Transform for response
    const formattedEvaluations = evaluations.map((e: any) => ({
      id: e.id,
      fundingStage: e.funding_stage,
      icVerdict: e.ic_verdict,
      icVerdictReasoning: e.ic_verdict_reasoning,
      axes: {
        team: {
          score: Math.round(
            ((e.team_founder_market_fit_score || 0) +
              (e.team_learning_velocity_score || 0) +
              (e.team_ability_to_recruit_score || 0)) / 3
          ),
          subscores: {
            founderMarketFit: e.team_founder_market_fit_score,
            learningVelocity: e.team_learning_velocity_score,
            abilityToRecruit: e.team_ability_to_recruit_score,
          },
          feedback: e.team_feedback,
        },
        market: {
          score: Math.round(
            ((e.market_size_score || 0) +
              (e.market_urgency_score || 0) +
              (e.market_timing_score || 0)) / 3
          ),
          subscores: {
            size: e.market_size_score,
            urgency: e.market_urgency_score,
            timing: e.market_timing_score,
          },
          feedback: e.market_feedback,
        },
        problem: {
          score: Math.round(
            ((e.problem_painful_score || 0) +
              (e.problem_frequent_score || 0) +
              (e.problem_expensive_score || 0)) / 3
          ),
          subscores: {
            painful: e.problem_painful_score,
            frequent: e.problem_frequent_score,
            expensive: e.problem_expensive_score,
          },
          feedback: e.problem_feedback,
        },
        solution: {
          score: Math.round(
            ((e.solution_approach_score || 0) +
              (e.solution_vs_alternatives_score || 0) +
              (e.solution_why_now_score || 0)) / 3
          ),
          subscores: {
            approach: e.solution_approach_score,
            vsAlternatives: e.solution_vs_alternatives_score,
            whyNow: e.solution_why_now_score,
          },
          feedback: e.solution_feedback,
        },
        gtm: {
          score: Math.round(
            ((e.gtm_distribution_score || 0) + (e.gtm_repeatability_score || 0)) / 2
          ),
          subscores: {
            distribution: e.gtm_distribution_score,
            repeatability: e.gtm_repeatability_score,
          },
          feedback: e.gtm_feedback,
        },
        traction: {
          score: Math.round(
            ((e.traction_retention_score || 0) +
              (e.traction_usage_score || 0) +
              (e.traction_revenue_score || 0)) / 3
          ),
          subscores: {
            retention: e.traction_retention_score,
            usage: e.traction_usage_score,
            revenue: e.traction_revenue_score,
          },
          feedback: e.traction_feedback,
        },
        businessModel: {
          score: Math.round(
            ((e.business_pricing_score || 0) +
              (e.business_margin_score || 0) +
              (e.business_scalability_score || 0)) / 3
          ),
          subscores: {
            pricing: e.business_pricing_score,
            margin: e.business_margin_score,
            scalability: e.business_scalability_score,
          },
          feedback: e.business_feedback,
        },
        fundFit: {
          score: e.fund_fit_score,
          feedback: e.fund_fit_feedback,
        },
        valuation: {
          score: e.valuation_realism_score,
          feedback: e.valuation_feedback,
        },
      },
      hiddenFilters: e.hidden_filters,
      topPassReasons: e.top_pass_reasons,
      deriskingActions: e.derisking_actions,
      stageSpecific: {
        killSignals: e.preseed_kill_signals,
        thirtyDayPlan: e.preseed_30day_plan,
        tractionQualityScore: e.seed_traction_quality_score,
        repeatabilityScore: e.seed_repeatability_score,
        seriesAClarity: e.seed_series_a_clarity_score,
        milestoneMap: e.seed_milestone_map,
        objections: e.seriesa_objections,
        ninetyDayPlan: e.seriesa_90day_plan,
      },
      deckRequested: e.deck_requested,
      deckReviewCompleted: e.deck_review_completed,
      deckPrematureReason: e.deck_premature_reason,
      inputData: e.input_data,
      createdAt: e.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedEvaluations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("[Investor Lens] Fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}
