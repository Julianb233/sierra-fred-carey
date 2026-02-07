/**
 * Founder Profile Snapshot API
 *
 * GET /api/dashboard/profile/snapshot
 * Returns the full enriched profile for the authenticated user.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

interface ProfileSnapshot {
  startupName: string | null;
  stage: string | null;
  challenges: string[];
  industry: string | null;
  revenueRange: string | null;
  teamSize: number | null;
  fundingHistory: string | null;
  enrichedAt: string | null;
  enrichmentSource: string | null;
  createdAt: string | null;
}

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = createServiceClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "name, stage, challenges, industry, revenue_range, team_size, funding_history, enriched_at, enrichment_source, created_at"
      )
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const snapshot: ProfileSnapshot = {
      startupName: profile.name ?? null,
      stage: profile.stage ?? null,
      challenges: Array.isArray(profile.challenges) ? profile.challenges : [],
      industry: profile.industry ?? null,
      revenueRange: profile.revenue_range ?? null,
      teamSize: profile.team_size ?? null,
      fundingHistory: profile.funding_history ?? null,
      enrichedAt: profile.enriched_at ?? null,
      enrichmentSource: profile.enrichment_source ?? null,
      createdAt: profile.created_at ?? null,
    };

    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Profile Snapshot] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile snapshot" },
      { status: 500 }
    );
  }
}
