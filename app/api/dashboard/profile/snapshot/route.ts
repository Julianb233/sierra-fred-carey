/**
 * Founder Profile Snapshot API
 *
 * GET /api/dashboard/profile/snapshot
 * Returns the full enriched profile for the authenticated user, including
 * the Firebase-parity fields backfilled on 2026-04-24 so migrated users
 * see every value they entered during the Vite/Firebase onboarding.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

interface ProfileSnapshot {
  founderName: string | null;
  companyName: string | null;
  productPositioning: string | null;
  stage: string | null;
  stageCategory: string | null;
  industry: string | null;
  targetMarket: string | null;
  location: string | null;
  phone: string | null;
  challenges: string[];
  weakSpot: string | null;
  weakSpotCategory: string | null;
  ideaStatus: string | null;
  passions: string | null;
  coFounder: string | null;
  hasPartners: boolean | null;
  revenueRange: string | null;
  teamSize: number | null;
  fundingHistory: string | null;
  realityLensComplete: boolean | null;
  realityLensScore: number | null;
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
        "name, company_name, product_positioning, stage, stage_category, industry, target_market, " +
          "location, phone, challenges, weak_spot, weak_spot_category, idea_status, passions, " +
          "co_founder, has_partners, revenue_range, team_size, funding_history, " +
          "reality_lens_complete, reality_lens_score, enriched_at, enrichment_source, created_at",
      )
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const snapshot: ProfileSnapshot = {
      founderName: (profile as { name?: string | null }).name ?? null,
      companyName: (profile as { company_name?: string | null }).company_name ?? null,
      productPositioning:
        (profile as { product_positioning?: string | null }).product_positioning ?? null,
      stage: (profile as { stage?: string | null }).stage ?? null,
      stageCategory: (profile as { stage_category?: string | null }).stage_category ?? null,
      industry: (profile as { industry?: string | null }).industry ?? null,
      targetMarket: (profile as { target_market?: string | null }).target_market ?? null,
      location: (profile as { location?: string | null }).location ?? null,
      phone: (profile as { phone?: string | null }).phone ?? null,
      challenges: Array.isArray(
        (profile as unknown as { challenges?: unknown }).challenges,
      )
        ? ((profile as unknown as { challenges: unknown[] }).challenges as string[])
        : [],
      weakSpot: (profile as { weak_spot?: string | null }).weak_spot ?? null,
      weakSpotCategory:
        (profile as { weak_spot_category?: string | null }).weak_spot_category ?? null,
      ideaStatus: (profile as { idea_status?: string | null }).idea_status ?? null,
      passions: (profile as { passions?: string | null }).passions ?? null,
      coFounder: (profile as { co_founder?: string | null }).co_founder ?? null,
      hasPartners: (profile as { has_partners?: boolean | null }).has_partners ?? null,
      revenueRange: (profile as { revenue_range?: string | null }).revenue_range ?? null,
      teamSize: (profile as { team_size?: number | null }).team_size ?? null,
      fundingHistory: (profile as { funding_history?: string | null }).funding_history ?? null,
      realityLensComplete:
        (profile as { reality_lens_complete?: boolean | null }).reality_lens_complete ?? null,
      realityLensScore:
        (profile as { reality_lens_score?: number | null }).reality_lens_score ?? null,
      enrichedAt: (profile as { enriched_at?: string | null }).enriched_at ?? null,
      enrichmentSource:
        (profile as { enrichment_source?: string | null }).enrichment_source ?? null,
      createdAt: (profile as { created_at?: string | null }).created_at ?? null,
    };

    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Profile Snapshot] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile snapshot" },
      { status: 500 },
    );
  }
}
