import { NextRequest, NextResponse } from "next/server";
import { POST as investorLensPOST } from "../route";

/**
 * POST /api/investor-lens/evaluate
 *
 * Adapter route: accepts the component's { profile } shape and
 * forwards to /api/investor-lens with the expected { profile, fundingStage } shape.
 * Transforms the response back to the component's expected format.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile } = body;

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile is required" },
        { status: 400 }
      );
    }

    // Map component stage format (kebab-case) to API format (snake_case)
    const stageMap: Record<string, string> = {
      "pre-seed": "pre_seed",
      "seed": "seed",
      "series-a": "series_a",
    };

    // Transform component's InvestorProfile to API's StartupProfile
    const apiProfile = {
      companyName: profile.companyName,
      description: profile.solution,
      problem: profile.problemDescription,
      solution: profile.solution,
      targetMarket: profile.marketSize,
      competitiveAdvantage: profile.competitiveAdvantage,
      revenue: profile.revenue,
      revenueGrowth: profile.growthRate,
      users: profile.traction,
      businessModel: profile.businessModel,
      askAmount: profile.fundingAsk,
      useOfFunds: profile.useOfFunds,
      previousRaises: profile.previousFunding,
      founders: profile.teamBackground
        ? [{ name: profile.companyName || "Founder", role: "Founder", background: profile.teamBackground }]
        : [],
    };

    const fundingStage = stageMap[profile.stage] || "seed";

    // Create a new request with the transformed body for the parent handler
    const transformedRequest = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ profile: apiProfile, fundingStage }),
    });

    const response = await investorLensPOST(transformedRequest);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(data, { status: response.status });
    }

    // Transform API response to component's expected EvaluationResults shape
    const d = data.data;
    return NextResponse.json({
      success: true,
      results: {
        verdict: d.icVerdict,
        confidence: d.axes?.fundFit?.score ?? 50,
        reasoning: d.icVerdictReasoning,
        axes: Object.entries(d.axes || {}).map(([name, val]) => {
          const axis = val as Record<string, unknown>;
          return {
            name,
            score: axis.score,
            subscores: axis.subscores,
            feedback: axis.feedback,
          };
        }),
        hiddenFilters: d.hiddenFilters || [],
        passReasons: d.topPassReasons || [],
        deriskingActions: d.deriskingActions || [],
        deckRecommendation: d.deckRecommendation || { deckNeeded: false, reason: "" },
        deckReasoning: d.deckRecommendation?.reason || "",
        deckGuidance: [],
        deckReadinessScore: d.axes?.valuation?.score ?? 0,
      },
    });
  } catch (error) {
    console.error("[Investor Lens Evaluate Adapter] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to evaluate. Please try again." },
      { status: 500 }
    );
  }
}
