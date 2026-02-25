import { NextRequest, NextResponse } from "next/server";
import { POST as positioningPOST } from "../route";

/**
 * POST /api/positioning/assess
 *
 * Adapter route: accepts the component's { companyInfo } shape and
 * forwards to /api/positioning with the expected flat field shape.
 * Transforms the response back to the component's expected format.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyInfo } = body;

    if (!companyInfo) {
      return NextResponse.json(
        { success: false, error: "Company info is required" },
        { status: 400 }
      );
    }

    // Transform component's CompanyInfo to API's PositioningInput
    const apiBody = {
      companyDescription: [
        companyInfo.companyName,
        companyInfo.industry ? `(${companyInfo.industry})` : "",
        companyInfo.stage ? `- ${companyInfo.stage} stage` : "",
        companyInfo.oneLiner ? `: ${companyInfo.oneLiner}` : "",
        companyInfo.businessModel ? `\nBusiness model: ${companyInfo.businessModel}` : "",
        companyInfo.marketSize ? `\nMarket size: ${companyInfo.marketSize}` : "",
      ].filter(Boolean).join(" "),
      targetCustomer: companyInfo.targetCustomer,
      problem: companyInfo.problemStatement,
      solution: companyInfo.solution,
      valueProp: companyInfo.uniqueValue,
      competitors: companyInfo.competitorDifferentiation,
      sourceType: "description" as const,
    };

    // Create a new request with the transformed body for the parent handler
    const transformedRequest = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(apiBody),
    });

    const response = await positioningPOST(transformedRequest);
    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(data, { status: response.status });
    }

    // Transform API response to component's expected AssessmentResults shape
    const d = data.data;
    return NextResponse.json({
      success: true,
      results: {
        overallGrade: d.positioningGrade,
        narrativeTightnessScore: d.narrativeTightnessScore,
        summary: `Grade: ${d.positioningGrade} | Narrative Tightness: ${d.narrativeTightnessScore}/10`,
        categories: Object.entries(d.categories || {}).map(([name, val]) => {
          const cat = val as Record<string, unknown>;
          return {
            name,
            score: cat.score,
            grade: cat.grade,
            elements: cat.elements,
            feedback: cat.feedback,
          };
        }),
        gaps: (d.gaps || []).map((g: Record<string, unknown>) => ({
          category: g.category,
          gap: g.gap,
          severity: g.severity,
        })),
        actions: (d.nextActions || []).map((a: Record<string, unknown>) => ({
          action: a.action,
          priority: a.priority,
          expectedImpact: a.expectedImpact,
        })),
      },
    });
  } catch (error) {
    console.error("[Positioning Assess Adapter] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assess positioning. Please try again." },
      { status: 500 }
    );
  }
}
