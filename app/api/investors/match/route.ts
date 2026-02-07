/**
 * Investor Match API
 * Phase 20: Investor Targeting
 *
 * POST /api/investors/match - Trigger AI matching for a user's investors
 * GET  /api/investors/match - Retrieve existing match results
 *
 * Requires Studio tier.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import { matchInvestors } from "@/lib/investors/matching";

export async function POST(request: NextRequest) {
  try {
    // Authenticate and check tier
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Studio tier required for Investor Matching" },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Optional listId from body
    let listId: string | undefined;
    try {
      const body = await request.json();
      listId = body.listId;
    } catch {
      // No body or invalid JSON -- match all lists
    }

    // Run matching engine
    const matches = await matchInvestors(userId, listId);

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
    });
  } catch (error) {
    console.error("[InvestorMatch] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run investor matching" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate and check tier
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Studio tier required for Investor Matching" },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");

    const supabase = createServiceClient();

    // Build query for matches with investor details
    let query = supabase
      .from("investor_matches")
      .select(`
        id,
        user_id,
        investor_id,
        overall_score,
        stage_score,
        sector_score,
        size_score,
        reasoning,
        status,
        created_at,
        investors (
          name,
          firm,
          email,
          website,
          stage_focus,
          sector_focus,
          check_size_min,
          check_size_max,
          location,
          list_id
        )
      `)
      .eq("user_id", userId)
      .order("overall_score", { ascending: false });

    // Filter by listId if provided
    if (listId) {
      query = query.eq("investors.list_id", listId);
    }

    const { data: matches, error: matchError } = await query;

    if (matchError) {
      console.error("[InvestorMatch] GET error:", matchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch matches" },
        { status: 500 }
      );
    }

    // Transform to clean response format
    const formattedMatches = (matches || [])
      .filter((m: Record<string, unknown>) => m.investors) // Filter out any with deleted investors
      .map((m: Record<string, unknown>) => {
        const inv = m.investors as Record<string, unknown>;
        return {
          id: m.id,
          userId: m.user_id,
          investorId: m.investor_id,
          investorName: inv.name,
          investorFirm: inv.firm,
          investorEmail: inv.email,
          investorWebsite: inv.website,
          investorStageFocus: inv.stage_focus,
          investorSectorFocus: inv.sector_focus,
          investorCheckSizeMin: inv.check_size_min,
          investorCheckSizeMax: inv.check_size_max,
          investorLocation: inv.location,
          overallScore: m.overall_score,
          stageScore: m.stage_score,
          sectorScore: m.sector_score,
          sizeScore: m.size_score,
          reasoning: m.reasoning,
          status: m.status,
          createdAt: m.created_at,
        };
      });

    return NextResponse.json({
      success: true,
      matches: formattedMatches,
      count: formattedMatches.length,
    });
  } catch (error) {
    console.error("[InvestorMatch] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch match results" },
      { status: 500 }
    );
  }
}
