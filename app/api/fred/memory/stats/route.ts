/**
 * FRED Memory Stats API
 *
 * GET /api/fred/memory/stats
 * Returns memory usage statistics for the authenticated user.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MEMORY_CONFIG, UserTier } from "@/lib/constants";

// Tier limits (total items: facts + episodes + decisions)
const TIER_LIMITS: Record<number, number> = {
  [UserTier.FREE]: 20,
  [UserTier.PRO]: 200,
  [UserTier.STUDIO]: 500,
};

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Query counts in parallel
    const [factsResult, episodesResult, decisionsResult, profileResult] =
      await Promise.all([
        supabase
          .from("fred_semantic_memory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("fred_episodic_memory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("fred_decision_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("profiles")
          .select("tier")
          .eq("id", userId)
          .single(),
      ]);

    const factsCount = factsResult.count ?? 0;
    const episodesCount = episodesResult.count ?? 0;
    const decisionsCount = decisionsResult.count ?? 0;

    // Determine tier
    const tierString = (profileResult.data?.tier as string) || "free";
    const tierMap: Record<string, UserTier> = {
      free: UserTier.FREE,
      pro: UserTier.PRO,
      studio: UserTier.STUDIO,
    };
    const userTier = tierMap[tierString] ?? UserTier.FREE;
    const tierLimit = TIER_LIMITS[userTier] ?? TIER_LIMITS[UserTier.FREE];

    const totalItems = factsCount + episodesCount + decisionsCount;
    const usagePercent = tierLimit > 0 ? Math.min(100, Math.round((totalItems / tierLimit) * 100)) : 0;

    return NextResponse.json({
      factsCount,
      episodesCount,
      decisionsCount,
      tierLimit,
      usagePercent,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[FRED Memory Stats] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
