/**
 * Investor Pipeline API
 * Phase 20: Investor Targeting (Plan 20-02)
 *
 * GET   /api/investors/pipeline - Retrieve pipeline entries (optionally by stage)
 * POST  /api/investors/pipeline - Add investor to pipeline
 * PATCH /api/investors/pipeline - Update pipeline entry (stage, notes, next action, etc.)
 *
 * Requires Studio tier.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// GET - Retrieve pipeline entries
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Studio tier required for Investor Pipeline" },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;
    const { searchParams } = new URL(request.url);
    const stageFilter = searchParams.get("stage");

    const supabase = createServiceClient();

    let query = supabase
      .from("investor_pipeline")
      .select(`
        id,
        user_id,
        investor_id,
        match_id,
        stage,
        notes,
        next_action,
        next_action_date,
        last_contact_at,
        created_at,
        updated_at,
        investors (
          id,
          name,
          firm,
          email,
          website,
          stage_focus,
          sector_focus,
          location
        ),
        investor_matches (
          overall_score
        )
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (stageFilter) {
      query = query.eq("stage", stageFilter);
    }

    const { data: entries, error: queryError } = await query;

    if (queryError) {
      console.error("[Pipeline] GET query error:", queryError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch pipeline entries" },
        { status: 500 }
      );
    }

    // Transform to clean response with investor details
    const pipeline = (entries || []).map((entry: Record<string, unknown>) => {
      const inv = entry.investors as Record<string, unknown> | null;
      const match = entry.investor_matches as Record<string, unknown> | null;
      return {
        id: entry.id,
        investorId: entry.investor_id,
        matchId: entry.match_id,
        stage: entry.stage,
        notes: entry.notes,
        nextAction: entry.next_action,
        nextActionDate: entry.next_action_date,
        lastContactAt: entry.last_contact_at,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        investor: inv
          ? {
              id: inv.id,
              name: inv.name,
              firm: inv.firm,
              email: inv.email,
              website: inv.website,
              stageFocus: inv.stage_focus,
              sectorFocus: inv.sector_focus,
              location: inv.location,
            }
          : null,
        matchScore: match ? (match.overall_score as number) : null,
      };
    });

    // Group by stage for Kanban view
    const stages = [
      "identified",
      "contacted",
      "meeting",
      "due_diligence",
      "term_sheet",
      "committed",
      "passed",
    ];

    const grouped: Record<string, typeof pipeline> = {};
    for (const stage of stages) {
      grouped[stage] = pipeline.filter(
        (p: { stage: unknown }) => p.stage === stage
      );
    }

    return NextResponse.json({
      success: true,
      pipeline,
      grouped,
      counts: Object.fromEntries(
        stages.map((s) => [s, grouped[s].length])
      ),
      total: pipeline.length,
    });
  } catch (error) {
    console.error("[Pipeline] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pipeline" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Add investor to pipeline
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Studio tier required for Investor Pipeline" },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;
    const body = await request.json();

    const { investorId, stage, notes, nextAction, nextActionDate } = body as {
      investorId?: string;
      stage?: string;
      notes?: string;
      nextAction?: string;
      nextActionDate?: string;
    };

    if (!investorId) {
      return NextResponse.json(
        { success: false, error: "investorId is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify investor exists
    const { data: investor, error: investorError } = await supabase
      .from("investors")
      .select("id")
      .eq("id", investorId)
      .single();

    if (investorError || !investor) {
      return NextResponse.json(
        { success: false, error: "Investor not found" },
        { status: 404 }
      );
    }

    // Check for existing match to link
    const { data: existingMatch } = await supabase
      .from("investor_matches")
      .select("id")
      .eq("user_id", userId)
      .eq("investor_id", investorId)
      .single();

    const now = new Date().toISOString();
    const entryData = {
      user_id: userId,
      investor_id: investorId,
      match_id: existingMatch?.id || null,
      stage: stage || "identified",
      notes: notes || null,
      next_action: nextAction || null,
      next_action_date: nextActionDate || null,
      last_contact_at:
        stage && stage !== "identified" ? now : null,
      created_at: now,
      updated_at: now,
    };

    const { data: entry, error: insertError } = await supabase
      .from("investor_pipeline")
      .upsert(entryData, { onConflict: "user_id,investor_id" })
      .select()
      .single();

    if (insertError) {
      console.error("[Pipeline] POST insert error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to add investor to pipeline" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, entry },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Pipeline] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add to pipeline" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update pipeline entry
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Studio tier required for Investor Pipeline" },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;
    const body = await request.json();

    const { id, stage, notes, nextAction, nextActionDate, lastContactAt } =
      body as {
        id?: string;
        stage?: string;
        notes?: string;
        nextAction?: string;
        nextActionDate?: string;
        lastContactAt?: string;
      };

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Pipeline entry id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Build update fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (stage !== undefined) updates.stage = stage;
    if (notes !== undefined) updates.notes = notes;
    if (nextAction !== undefined) updates.next_action = nextAction;
    if (nextActionDate !== undefined) updates.next_action_date = nextActionDate;
    if (lastContactAt !== undefined) updates.last_contact_at = lastContactAt;

    // Auto-set last_contact_at when moving to contacted or later stages
    if (
      stage &&
      stage !== "identified" &&
      lastContactAt === undefined
    ) {
      updates.last_contact_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("investor_pipeline")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("[Pipeline] PATCH update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update pipeline entry" },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Pipeline entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, entry: updated });
  } catch (error) {
    console.error("[Pipeline] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update pipeline entry" },
      { status: 500 }
    );
  }
}
