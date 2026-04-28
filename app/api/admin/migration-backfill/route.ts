/**
 * Admin Migration Backfill API
 *
 * POST /api/admin/migration-backfill
 * body: { email: string, dryRun?: boolean }
 *
 * Runs the Firebase->oases_progress bridge for a single migrated user.
 * Mirrors the offline script at
 * scripts/migrations/firebase-to-supabase/bridge-roadmap-to-oases-progress.ts
 * but as an API call so William Hood can trigger from the admin panel
 * without SSH access (AI-8888).
 *
 * Idempotent: upserts on (user_id, stage, step_id) so re-runs are safe.
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RoadmapItem = { text?: string; done?: boolean; summary?: string };
type RoadmapDoc = { _doc_id?: string; items?: RoadmapItem[] };
type OasesStage = "clarity" | "validation" | "build" | "launch" | "grow";
type Mapping = { stage: OasesStage; stepId: string };

const ALLOWED_STEP_IDS = new Set([
  "profile_basics",
  "reality_lens",
  "first_chat",
  "deep_conversations",
  "positioning_defined",
  "competitor_awareness",
  "strategy_doc",
  "pitch_deck_started",
  "readiness_baseline",
  "investor_ready",
  "pitch_refined",
  "investor_targets",
  "journey_complete",
  "fund_matching_ready",
  "c_profile_basics",
  "c_define_why",
  "c_strengths",
  "c_weaknesses",
  "c_mindset_check",
  "c_problem_statement",
  "c_who_has_problem",
  "c_one_sentence",
  "c_unfair_advantages",
  "v_discovery_calls",
  "v_top_pain_points",
  "v_willingness_pay",
  "v_direct_competitors",
  "v_simplest_solution",
  "v_prototype_test",
  "v_stage_review",
  "v_unit_economics",
  "v_revenue_model",
  "b_build_mvp",
  "l_first_customers",
  "l_pitch_deck_v1",
  "l_investor_targets",
  "g_retention_target",
  "g_repeatable_acquisition",
  "g_playbooks",
  "g_scale_systems",
]);

function mapRoadmapItem(tile: string, itemText: string): Mapping | undefined {
  const t = (itemText || "").toLowerCase();
  switch (tile) {
    case "founder-story":
      if (t.includes("personal") && t.includes("why"))
        return { stage: "clarity", stepId: "c_define_why" };
      if (t.includes("unfair advantage"))
        return { stage: "clarity", stepId: "c_unfair_advantages" };
      if (t.includes("elevator pitch") || t.includes("30-second"))
        return { stage: "clarity", stepId: "c_one_sentence" };
      return undefined;
    case "offer-clarity":
      if (
        t.includes("problem") &&
        (t.includes("articulate") || t.includes("their words"))
      )
        return { stage: "clarity", stepId: "c_problem_statement" };
      if (t.includes("ideal customer") || t.includes("painfully specific"))
        return { stage: "clarity", stepId: "c_who_has_problem" };
      if (t.includes("one sentence"))
        return { stage: "clarity", stepId: "c_one_sentence" };
      if (t.includes("how much you charge"))
        return { stage: "validation", stepId: "v_revenue_model" };
      return undefined;
    case "passion-discovery":
      return { stage: "clarity", stepId: "c_strengths" };
    case "opportunity-hunting":
      return { stage: "clarity", stepId: "c_problem_statement" };
    case "emotional-prep":
    case "emotional-prep-pre":
      return { stage: "clarity", stepId: "c_mindset_check" };
    case "validation":
      if (t.includes("10 strangers") || t.includes("talk to"))
        return { stage: "validation", stepId: "v_discovery_calls" };
      if (t.includes("top 3 pain"))
        return { stage: "validation", stepId: "v_top_pain_points" };
      if (t.includes("competitors"))
        return { stage: "validation", stepId: "v_direct_competitors" };
      if (t.includes("would they pay") || t.includes("how much"))
        return { stage: "validation", stepId: "v_willingness_pay" };
      return undefined;
    case "mvp-plan":
      if (t.includes("one core feature") || t.includes("core feature"))
        return { stage: "validation", stepId: "v_simplest_solution" };
      if (t.includes("ship v0.1") || t.includes("2-week deadline"))
        return { stage: "build", stepId: "b_build_mvp" };
      if (t.includes("5 people to use"))
        return { stage: "validation", stepId: "v_prototype_test" };
      if (t.includes("pivot"))
        return { stage: "validation", stepId: "v_stage_review" };
      return undefined;
    case "pmf-search":
      if (t.includes("paying customers"))
        return { stage: "launch", stepId: "l_first_customers" };
      if (t.includes("cost to acquire") || t.includes("cac"))
        return { stage: "validation", stepId: "v_unit_economics" };
      if (t.includes("retention"))
        return { stage: "grow", stepId: "g_retention_target" };
      if (t.includes("testimonials"))
        return { stage: "launch", stepId: "l_first_customers" };
      return undefined;
    case "economics":
      return { stage: "validation", stepId: "v_unit_economics" };
    case "scale-ops":
      if (t.includes("acquisition channel"))
        return { stage: "grow", stepId: "g_repeatable_acquisition" };
      if (t.includes("playbooks"))
        return { stage: "grow", stepId: "g_playbooks" };
      if (t.includes("bottleneck") || t.includes("breaks at scale"))
        return { stage: "grow", stepId: "g_scale_systems" };
      return undefined;
    case "fundraising-prep":
      if (
        t.includes("pitch document") ||
        t.includes("pitch deck") ||
        t.includes("one-page")
      )
        return { stage: "launch", stepId: "l_pitch_deck_v1" };
      if (t.includes("research") && t.includes("investor"))
        return { stage: "launch", stepId: "l_investor_targets" };
      return undefined;
    default:
      return undefined;
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const email = (body.email || "").toString().trim().toLowerCase();
    const dryRun = body.dryRun === true;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, oases_stage, enrichment_data, enrichment_source")
      .eq("email", email)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json(
        { error: profileErr.message },
        { status: 500 }
      );
    }
    if (!profile) {
      return NextResponse.json(
        { error: "user not found", email },
        { status: 404 }
      );
    }

    const enr = (profile.enrichment_data ?? {}) as Record<string, unknown>;
    const subs =
      (enr.firebase_subcollections as Record<string, unknown> | undefined) ??
      {};
    const roadmap = Array.isArray(subs.roadmap)
      ? (subs.roadmap as RoadmapDoc[])
      : [];

    if (roadmap.length === 0) {
      return NextResponse.json({
        success: true,
        email,
        message: "no firebase roadmap data — nothing to bridge",
        rows_inserted: 0,
        dryRun,
      });
    }

    const targets = new Map<
      string,
      { stage: OasesStage; step_id: string }
    >();
    const dropped: Array<{ tile: string; text: string }> = [];
    for (const tile of roadmap) {
      const tileId = tile._doc_id ?? "";
      const items = Array.isArray(tile.items) ? tile.items : [];
      for (const item of items) {
        if (!item.done) continue;
        const m = mapRoadmapItem(tileId, item.text ?? "");
        if (!m) {
          dropped.push({ tile: tileId, text: item.text ?? "" });
          continue;
        }
        if (!ALLOWED_STEP_IDS.has(m.stepId)) {
          dropped.push({ tile: tileId, text: item.text ?? "" });
          continue;
        }
        targets.set(`${m.stage}:${m.stepId}`, {
          stage: m.stage,
          step_id: m.stepId,
        });
      }
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        email,
        dryRun: true,
        targets: [...targets.values()],
        dropped_samples: dropped.slice(0, 20),
        rows_would_insert: targets.size,
      });
    }

    const rows = [...targets.values()].map((t) => ({
      user_id: profile.id,
      stage: t.stage,
      step_id: t.step_id,
      score: null,
      metadata: { source: "firebase_migration_AI-8888_admin_backfill" },
    }));

    const { error: upErr } = await supabase
      .from("oases_progress")
      .upsert(rows, {
        onConflict: "user_id,stage,step_id",
        ignoreDuplicates: false,
      });

    if (upErr) {
      return NextResponse.json(
        { error: upErr.message, rows_attempted: rows.length },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
      rows_inserted: rows.length,
      targets: [...targets.values()],
      dropped_count: dropped.length,
    });
  } catch (err) {
    console.error("[admin/migration-backfill] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backfill failed" },
      { status: 500 }
    );
  }
}
