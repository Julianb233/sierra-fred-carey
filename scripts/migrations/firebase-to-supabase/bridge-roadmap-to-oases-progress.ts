/**
 * Bridge: Firebase roadmap completions -> Supabase oases_progress rows.
 *
 * Why this exists (AI-8658)
 * --------------------------
 * Fred Cary reported: "none of my progress came over where I am in the
 * different steps we have." The earlier migration shipped Firebase roadmap
 * data into `profiles.enrichment_data.firebase_subcollections` and bridged it
 * to the 9-step `startup_processes` schema, but the Journey/Oases UI on
 * /dashboard/journey reads from a SEPARATE table called `oases_progress`
 * (5 stages x 14 high-level steps + 120 detailed steps in journey_steps).
 *
 * Nothing was writing to `oases_progress` at all -- not the migration, not
 * the live app. Result: every user, migrated or not, sees an empty journey
 * progress UI. This script fixes the migrated-user side by mapping each
 * completed Firebase roadmap item onto the closest oases_progress step_id.
 *
 * Mapping table (Firebase tile/item -> oases_progress.{stage, step_id})
 * --------------------------------------------------------------------
 * The Firebase product had 12 distinct roadmap tiles. Each tile maps to one
 * Oases stage. Each completed item inside a tile maps to at most one
 * step_id. If multiple Firebase items would land on the same step_id we
 * upsert (no duplicates due to UNIQUE(user_id, stage, step_id)).
 *
 * Mapping (only items with `done: true` flow through):
 *   founder-story:
 *     "Write your personal 'why'..."         -> clarity / c_define_why
 *     "Define your unfair advantage..."      -> clarity / c_unfair_advantages
 *     "Craft your 30-second elevator pitch"  -> clarity / c_one_sentence
 *
 *   offer-clarity:
 *     "Articulate the problem..."            -> clarity / c_problem_statement
 *     "Identify your ideal customer..."      -> clarity / c_who_has_problem
 *     "Define your product/service in one sentence" -> clarity / c_one_sentence
 *     "Define how much you charge and why"   -> validation / v_revenue_model
 *
 *   passion-discovery (any item done)         -> clarity / c_strengths
 *   opportunity-hunting (any item done)       -> clarity / c_problem_statement
 *   emotional-prep (any item done)            -> clarity / c_mindset_check
 *   emotional-prep-pre (any item done)        -> clarity / c_mindset_check
 *
 *   validation:
 *     "Talk to 10 strangers..."              -> validation / v_discovery_calls
 *     "Document the top 3 pain points..."    -> validation / v_top_pain_points
 *     "Find competitors..."                  -> validation / v_direct_competitors
 *     "Determine: would they pay..."         -> validation / v_willingness_pay
 *
 *   mvp-plan:
 *     "Identify the ONE core feature..."     -> validation / v_simplest_solution
 *     "Set a 2-week deadline to ship v0.1"   -> build / b_build_mvp
 *     "Get 5 people to use it..."            -> validation / v_prototype_test
 *     "Decide: pivot, persist, or kill?"     -> validation / v_stage_review
 *
 *   pmf-search:
 *     "Get 10 paying customers..."           -> launch / l_launch_v1 (we mark first-cohort)
 *     "Calculate: cost to acquire..."        -> validation / v_unit_economics
 *     "Measure 30-day retention..."          -> grow / g_retention_target
 *     "Collect 5 testimonials..."            -> launch / l_first_customers
 *
 *   economics: any item done                  -> validation / v_unit_economics
 *
 *   scale-ops: any item done                  -> grow / g_repeatable_acquisition (when known)
 *
 *   fundraising-prep: any item done           -> launch / l_pitch_deck_v1
 *
 * Step ids that don't exist in stage-config are silently dropped so the
 * UNIQUE constraint never trips. We log dropped mappings for follow-up.
 *
 * Idempotent: re-running upserts the same rows. Skips users with zero
 * roadmap data. Uses `score=null, metadata={source:'firebase_migration_AI-8658'}`
 * for traceability.
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-roadmap-to-oases-progress.ts --dry-run
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-roadmap-to-oases-progress.ts
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-roadmap-to-oases-progress.ts --email cary.fred@gmail.com
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local"), override: false });

// ============================================================================
// Types
// ============================================================================

type RoadmapItem = { text?: string; done?: boolean; summary?: string };
type RoadmapDoc = { _doc_id?: string; items?: RoadmapItem[] };
type OasesStage = "clarity" | "validation" | "build" | "launch" | "grow";
type Mapping = { stage: OasesStage; stepId: string };

// ============================================================================
// Mapping
// ============================================================================

/**
 * Item-level mapping by tile + lowercased text substring match.
 * Returns undefined when the item doesn't match a known step.
 */
function mapRoadmapItem(tile: string, itemText: string): Mapping | undefined {
  const t = (itemText || "").toLowerCase();
  switch (tile) {
    case "founder-story":
      if (t.includes("personal") && t.includes("why")) return { stage: "clarity", stepId: "c_define_why" };
      if (t.includes("unfair advantage")) return { stage: "clarity", stepId: "c_unfair_advantages" };
      if (t.includes("elevator pitch") || t.includes("30-second")) return { stage: "clarity", stepId: "c_one_sentence" };
      return undefined;

    case "offer-clarity":
      if (t.includes("problem") && (t.includes("articulate") || t.includes("their words")))
        return { stage: "clarity", stepId: "c_problem_statement" };
      if (t.includes("ideal customer") || t.includes("painfully specific"))
        return { stage: "clarity", stepId: "c_who_has_problem" };
      if (t.includes("one sentence")) return { stage: "clarity", stepId: "c_one_sentence" };
      if (t.includes("how much you charge")) return { stage: "validation", stepId: "v_revenue_model" };
      return undefined;

    case "passion-discovery":
      // Any completed item indicates founder did the strengths/passion exercise
      return { stage: "clarity", stepId: "c_strengths" };

    case "opportunity-hunting":
      return { stage: "clarity", stepId: "c_problem_statement" };

    case "emotional-prep":
    case "emotional-prep-pre":
      return { stage: "clarity", stepId: "c_mindset_check" };

    case "validation":
      if (t.includes("10 strangers") || t.includes("talk to")) return { stage: "validation", stepId: "v_discovery_calls" };
      if (t.includes("top 3 pain")) return { stage: "validation", stepId: "v_top_pain_points" };
      if (t.includes("competitors")) return { stage: "validation", stepId: "v_direct_competitors" };
      if (t.includes("would they pay") || t.includes("how much")) return { stage: "validation", stepId: "v_willingness_pay" };
      return undefined;

    case "mvp-plan":
      if (t.includes("one core feature") || t.includes("core feature")) return { stage: "validation", stepId: "v_simplest_solution" };
      if (t.includes("ship v0.1") || t.includes("2-week deadline")) return { stage: "build", stepId: "b_build_mvp" };
      if (t.includes("5 people to use")) return { stage: "validation", stepId: "v_prototype_test" };
      if (t.includes("pivot")) return { stage: "validation", stepId: "v_stage_review" };
      return undefined;

    case "pmf-search":
      if (t.includes("paying customers")) return { stage: "launch", stepId: "l_first_customers" };
      if (t.includes("cost to acquire") || t.includes("cac")) return { stage: "validation", stepId: "v_unit_economics" };
      if (t.includes("retention")) return { stage: "grow", stepId: "g_retention_target" };
      if (t.includes("testimonials")) return { stage: "launch", stepId: "l_first_customers" };
      return undefined;

    case "economics":
      // Any completed economics item -> unit economics step
      return { stage: "validation", stepId: "v_unit_economics" };

    case "scale-ops":
      if (t.includes("acquisition channel")) return { stage: "grow", stepId: "g_repeatable_acquisition" };
      if (t.includes("playbooks")) return { stage: "grow", stepId: "g_playbooks" };
      if (t.includes("bottleneck") || t.includes("breaks at scale")) return { stage: "grow", stepId: "g_scale_systems" };
      return undefined;

    case "fundraising-prep":
      if (t.includes("pitch document") || t.includes("pitch deck") || t.includes("one-page"))
        return { stage: "launch", stepId: "l_pitch_deck_v1" };
      if (t.includes("research") && t.includes("investor")) return { stage: "launch", stepId: "l_investor_targets" };
      return undefined;

    default:
      return undefined;
  }
}

// ============================================================================
// Supabase helpers
// ============================================================================

function mustEnv(k: string): string {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
  return v;
}

function supabaseUrl(): string {
  const v = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) {
    console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }
  return v;
}

function makeClient(): SupabaseClient {
  return createClient(supabaseUrl(), mustEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================================
// Validate mapping against allowed step ids in the codebase
// ============================================================================
// We don't import stage-config at runtime (would pull TS path aliases). We
// hardcode the canonical 14-step + extended grow-stage step ids that exist in
// `lib/oases/journey-steps.ts` (and re-use STAGE_CONFIG step ids where they
// diverge). When a mapping target step_id is not in this set, we drop it
// loudly so the UI never gets garbage.

const ALLOWED_STEP_IDS = new Set([
  // STAGE_CONFIG (14-step model) -- highest priority for the journey UI
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
  // 120-step extended model from journey-steps.ts (subset we map onto)
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

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      email: { type: "string" },
      verbose: { type: "boolean", default: false },
    },
  });
  const dryRun = values["dry-run"] ?? false;
  const onlyEmail = values.email;
  const verbose = values.verbose ?? false;

  const db = makeClient();
  console.log(`Supabase: ${supabaseUrl()}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (onlyEmail) console.log(`Filter: email=${onlyEmail}`);
  console.log();

  let query = db
    .from("profiles")
    .select("id, email, oases_stage, enrichment_data")
    .or(
      "enrichment_source.eq.firebase_migration_2026_04_21,enrichment_data->firebase_subcollections->imported_at.not.is.null"
    );
  if (onlyEmail) query = query.eq("email", onlyEmail);

  const { data: profiles, error } = await query;
  if (error) throw error;
  console.log(`Candidate profiles: ${profiles?.length ?? 0}`);

  if (!profiles || profiles.length === 0) {
    console.log("no candidates -- exiting");
    return;
  }

  const counts = { processed: 0, rowsInserted: 0, skippedNoData: 0, droppedUnknownStep: 0, errors: 0 };
  const droppedSamples: Array<{ email: string; tile: string; text: string; mapping?: Mapping }> = [];

  for (const p of profiles) {
    const enr = (p.enrichment_data ?? {}) as Record<string, unknown>;
    const subs = (enr.firebase_subcollections as Record<string, unknown> | undefined) ?? {};
    const roadmap = Array.isArray(subs.roadmap) ? (subs.roadmap as RoadmapDoc[]) : [];

    if (roadmap.length === 0) {
      counts.skippedNoData++;
      continue;
    }

    counts.processed++;

    // Build the set of (stage, step_id) pairs to upsert
    const targets = new Map<string, { stage: OasesStage; step_id: string }>();
    for (const tile of roadmap) {
      const tileId = tile._doc_id ?? "";
      const items = Array.isArray(tile.items) ? tile.items : [];
      for (const item of items) {
        if (!item.done) continue;
        const m = mapRoadmapItem(tileId, item.text ?? "");
        if (!m) {
          if (droppedSamples.length < 20) {
            droppedSamples.push({ email: p.email ?? "?", tile: tileId, text: item.text ?? "" });
          }
          continue;
        }
        if (!ALLOWED_STEP_IDS.has(m.stepId)) {
          counts.droppedUnknownStep++;
          if (droppedSamples.length < 40) {
            droppedSamples.push({ email: p.email ?? "?", tile: tileId, text: item.text ?? "", mapping: m });
          }
          continue;
        }
        targets.set(`${m.stage}:${m.stepId}`, { stage: m.stage, step_id: m.stepId });
      }
    }

    if (targets.size === 0) {
      if (verbose) console.log(`  ${p.email}: no mappable items`);
      continue;
    }

    if (verbose || dryRun) {
      console.log(`  ${p.email}: ${targets.size} target step(s) -> ${[...targets.keys()].join(", ")}`);
    }

    if (dryRun) {
      counts.rowsInserted += targets.size;
      continue;
    }

    // Upsert each target step
    const rows = [...targets.values()].map((t) => ({
      user_id: p.id,
      stage: t.stage,
      step_id: t.step_id,
      score: null,
      metadata: { source: "firebase_migration_AI-8658" },
    }));

    const { error: upErr } = await db
      .from("oases_progress")
      .upsert(rows, { onConflict: "user_id,stage,step_id", ignoreDuplicates: false });

    if (upErr) {
      console.error(`  ${p.email}: upsert error ${upErr.message}`);
      counts.errors++;
      continue;
    }

    counts.rowsInserted += rows.length;
  }

  console.log();
  console.log("=== SUMMARY ===");
  console.log(JSON.stringify({ ...counts, dryRun }, null, 2));

  if (droppedSamples.length > 0 && verbose) {
    console.log("\nDropped item samples (no mapping or unknown step):");
    for (const d of droppedSamples) {
      console.log(`  [${d.email}] ${d.tile}: "${d.text.slice(0, 80)}" ${d.mapping ? `-> ${d.mapping.stage}/${d.mapping.stepId} (DROPPED: not in ALLOWED_STEP_IDS)` : ""}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
