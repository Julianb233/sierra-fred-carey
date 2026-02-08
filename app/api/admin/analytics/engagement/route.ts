/**
 * Admin Analytics -- Engagement Metrics API
 *
 * Phase 30-02: Returns aggregated engagement data for the admin analytics
 * dashboard. Requires admin authentication (session cookie or x-admin-key).
 *
 * GET /api/admin/analytics/engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EngagementMetrics {
  totalUsers: number;
  activeUsers7d: number;
  newSignups7d: number;
  onboardingCompletionRate: number;
  featureAdoption: {
    chat: number;
    realityLens: number;
    pitchDeck: number;
    agents: number;
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Admin-only guard
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Run all queries in parallel for speed
    const [
      totalUsersRes,
      activeUsersRes,
      newSignupsRes,
      onboardingRes,
      chatUsersRes,
      realityLensRes,
      pitchDeckRes,
      agentUsersRes,
    ] = await Promise.all([
      // Total users
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),

      // Active users: distinct users with episodic memory entries in last 7 days
      supabase
        .from("fred_episodic_memory")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),

      // New signups in last 7 days
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),

      // Onboarding completed count
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("onboarding_completed", true),

      // Users who used chat (have episodic memory entries)
      supabase
        .from("fred_episodic_memory")
        .select("user_id", { count: "exact", head: true }),

      // Users who used Reality Lens (have documents of type reality-lens)
      supabase
        .from("documents")
        .select("user_id", { count: "exact", head: true })
        .eq("type", "reality-lens"),

      // Users who uploaded pitch decks
      supabase
        .from("documents")
        .select("user_id", { count: "exact", head: true })
        .eq("type", "pitch-deck"),

      // Users who triggered agent tasks
      supabase
        .from("agent_tasks")
        .select("user_id", { count: "exact", head: true }),
    ]);

    const totalUsers = totalUsersRes.count ?? 0;
    const safeTotal = totalUsers || 1; // prevent division by zero

    const metrics: EngagementMetrics = {
      totalUsers,
      activeUsers7d: activeUsersRes.count ?? 0,
      newSignups7d: newSignupsRes.count ?? 0,
      onboardingCompletionRate:
        ((onboardingRes.count ?? 0) / safeTotal) * 100,
      featureAdoption: {
        chat: ((chatUsersRes.count ?? 0) / safeTotal) * 100,
        realityLens: ((realityLensRes.count ?? 0) / safeTotal) * 100,
        pitchDeck: ((pitchDeckRes.count ?? 0) / safeTotal) * 100,
        agents: ((agentUsersRes.count ?? 0) / safeTotal) * 100,
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("[admin/analytics/engagement] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch engagement metrics" },
      { status: 500 }
    );
  }
}
