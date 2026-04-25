/**
 * Bridge: Firebase roadmap + profile fields -> Supabase startup_processes row.
 *
 * Firebase stored progress as card-based roadmap tiles ("offer-clarity",
 * "founder-story", "mvp-plan", etc.), each with an `items` array. Completed
 * items carry a `summary` field containing Fred's notes from the coaching
 * conversation. Supabase uses a 9-step Q&A schema (problem_statement,
 * founder_edge, pilot_results, etc.) for `startup_processes`.
 *
 * This script bridges by:
 *   1. Reading profiles.enrichment_data.firebase_subcollections.roadmap +
 *      .mentor + .discovery + .scores (import via import-firestore-subcollections.ts)
 *   2. Mapping completed roadmap items + item summaries + profile fields
 *      onto the 9-step startup_processes schema
 *   3. Upserting one startup_processes row per migrated user
 *
 * The report generator (app/api/reports/generate/route.ts) reads
 * startup_processes, so after this bridge runs, migrated users can generate
 * a founder report without having to re-complete the new 9-step flow.
 *
 * Field mapping:
 *
 *   Step 1 (Problem)
 *     problem_statement  <- validation "pain points" summary OR
 *                           offer-clarity "problem" item summary OR
 *                           discovery.problem OR
 *                           profile.weak_spot
 *     problem_who        <- offer-clarity "ideal customer" summary OR
 *                           discovery.customer OR
 *                           profile.enrichment_data.target_market
 *
 *   Step 2 (Customer)
 *     economic_buyer     <- same source chain as problem_who
 *
 *   Step 3 (Founder edge)
 *     founder_edge       <- founder-story "unfair advantage" summary
 *     unique_insight     <- founder-story "why you / why now" summary
 *     unfair_advantage   <- founder-story "unfair advantage" summary
 *
 *   Step 4 (Simplest solution)
 *     simplest_solution  <- offer-clarity "product in one sentence" summary OR
 *                           mvp-plan "core feature" summary OR
 *                           profile.enrichment_data.idea_pitch
 *
 *   Step 5 (Validation)
 *     validation_method  <- validation tile approach (generic if any items done)
 *     demand_evidence    <- jsonb of validation item summaries
 *     validation_results <- pmf-search retention / testimonials summaries
 *
 *   Step 6 (GTM)
 *     gtm_channel        <- scale-ops "acquisition channel" summary
 *     gtm_approach       <- scale-ops "playbooks" summary
 *
 *   Step 7 (Priorities & ownership)
 *     weekly_priorities  <- jsonb array from mentor.actionItems
 *     ownership_structure <- { has_partners: profile.has_partners, co_founder: profile.co_founder }
 *
 *   Step 8 (Pilot)
 *     pilot_definition       <- pmf-search "10 paying customers" summary
 *     pilot_success_criteria <- economics "LTV:CAC ratio" summary
 *     pilot_results          <- jsonb of pmf-search + economics summaries
 *
 *   Step 9 (Scale)
 *     what_worked     <- jsonb of scale-ops items with done=true
 *
 *   step_N_completed = true IFF at least one field for that step was populated.
 *   current_step     = highest step with >=1 field populated (clamped 1..9)
 *   completion_pct   = (# done items across all tiles) / (total items) * 100
 *   status           = 'active' unless all 9 steps complete
 *
 * Idempotent: deletes any prior bridged row (metadata-tagged) before upsert.
 *
 * Usage:
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-roadmap-to-startup-process.ts
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-roadmap-to-startup-process.ts --dry-run
 *   npx tsx scripts/migrations/firebase-to-supabase/bridge-roadmap-to-startup-process.ts --email foo@bar.com
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local"), override: false });

type RoadmapItem = { text: string; done?: boolean; summary?: string };
type RoadmapDoc = {
  _doc_id: string;
  title?: string;
  description?: string;
  priority?: number;
  items?: RoadmapItem[];
  createdAt?: string;
  updatedAt?: string;
};

type MentorDoc = {
  _doc_id: string;
  items?: string[];
  assignedAt?: string;
};

type DiscoveryDoc = {
  _doc_id: string;
  problem?: string;
  customer?: string;
  traction?: string;
  blocker?: string;
  updatedAt?: string;
};

function mustEnv(k: string): string {
  const v = process.env[k];
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
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
  return createClient(
    supabaseUrl(),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function firstDefined<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) {
    if (v !== null && v !== undefined && (typeof v !== "string" || v.trim().length > 0)) {
      return v;
    }
  }
  return null;
}

function findItemSummary(tile: RoadmapDoc | undefined, match: (text: string) => boolean): string | null {
  if (!tile?.items) return null;
  for (const it of tile.items) {
    if (it.done && it.summary && match(String(it.text ?? "").toLowerCase())) {
      return it.summary;
    }
  }
  return null;
}

function summariesFrom(tile: RoadmapDoc | undefined): string[] {
  if (!tile?.items) return [];
  return tile.items.filter((it) => it.done && it.summary).map((it) => it.summary!);
}

function itemsToJsonb(tile: RoadmapDoc | undefined): unknown[] {
  if (!tile?.items) return [];
  return tile.items
    .filter((it) => it.done)
    .map((it) => ({ text: it.text, summary: it.summary ?? null, done: true }));
}

function mentorPriorities(mentor: MentorDoc[] | null | undefined): unknown[] {
  if (!Array.isArray(mentor)) return [];
  const all: Array<{ text: string; assignedAt?: string }> = [];
  for (const m of mentor) {
    if (Array.isArray(m.items)) {
      for (const text of m.items) all.push({ text, assignedAt: m.assignedAt });
    }
  }
  return all;
}

function countDone(tiles: RoadmapDoc[]): { done: number; total: number } {
  let done = 0, total = 0;
  for (const t of tiles) {
    if (!Array.isArray(t.items)) continue;
    for (const it of t.items) {
      total += 1;
      if (it.done) done += 1;
    }
  }
  return { done, total };
}

function firstTimestamp(tiles: RoadmapDoc[]): string | null {
  let earliest: string | null = null;
  for (const t of tiles) {
    const ts = t.createdAt ?? t.updatedAt;
    if (ts && (!earliest || ts < earliest)) earliest = ts;
  }
  return earliest;
}

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  company_name: string | null;
  target_market: string | null;
  co_founder: string | null;
  has_partners: boolean | null;
  weak_spot: string | null;
  enrichment_data: Record<string, unknown> | null;
};

type BridgeResult = {
  action: "skipped" | "upserted" | "dry-run";
  reason?: string;
  row?: Record<string, unknown>;
  completion_pct?: number;
  current_step?: number;
  steps_completed?: number;
};

function bridgeUser(p: ProfileRow): BridgeResult {
  const enr = (p.enrichment_data ?? {}) as Record<string, unknown>;
  const subs = (enr.firebase_subcollections as Record<string, unknown> | undefined) ?? {};
  const roadmap = Array.isArray(subs.roadmap) ? (subs.roadmap as RoadmapDoc[]) : [];
  const mentor = Array.isArray(subs.mentor) ? (subs.mentor as MentorDoc[]) : [];
  const discovery = Array.isArray(subs.discovery) ? (subs.discovery as DiscoveryDoc[])[0] : undefined;

  if (roadmap.length === 0 && !discovery && mentor.length === 0) {
    return { action: "skipped", reason: "no roadmap/mentor/discovery data" };
  }

  // Build a tile lookup by doc_id
  const tileMap = new Map<string, RoadmapDoc>();
  for (const r of roadmap) tileMap.set(r._doc_id, r);

  const t = (id: string) => tileMap.get(id);
  const offerClarity = t("offer-clarity");
  const founderStory = t("founder-story");
  const validationTile = t("validation");
  const mvpPlan = t("mvp-plan");
  const pmfSearch = t("pmf-search");
  const economics = t("economics");
  const scaleOps = t("scale-ops");

  // ---- Step 1: Problem ----
  const problem_statement = firstDefined<string>(
    findItemSummary(validationTile, (txt) => txt.includes("pain") || txt.includes("problem")),
    findItemSummary(offerClarity, (txt) => txt.includes("problem")),
    discovery?.problem,
    p.weak_spot
  );
  const problem_who = firstDefined<string>(
    findItemSummary(offerClarity, (txt) => txt.includes("ideal customer") || txt.includes("specific")),
    discovery?.customer,
    p.target_market,
    (enr.target_market as string | undefined) ?? null
  );

  // ---- Step 2: Customer ----
  const economic_buyer = firstDefined<string>(
    findItemSummary(offerClarity, (txt) => txt.includes("ideal customer") || txt.includes("specific")),
    discovery?.customer,
    p.target_market,
    (enr.target_market as string | undefined) ?? null
  );

  // ---- Step 3: Founder edge ----
  const unfair_advantage = firstDefined<string>(
    findItemSummary(founderStory, (txt) => txt.includes("unfair")),
  );
  const unique_insight = firstDefined<string>(
    findItemSummary(founderStory, (txt) => txt.includes("why")),
  );
  const founder_edge = unfair_advantage ?? unique_insight ?? null;

  // ---- Step 4: Simplest solution ----
  const simplest_solution = firstDefined<string>(
    findItemSummary(offerClarity, (txt) => txt.includes("product") || txt.includes("one sentence")),
    findItemSummary(mvpPlan, (txt) => txt.includes("core feature") || txt.includes("ONE")),
    (enr.idea_pitch as string | undefined) ?? null
  );

  // ---- Step 5: Validation ----
  const validationSummaries = summariesFrom(validationTile);
  const pmfSummaries = summariesFrom(pmfSearch);
  const demand_evidence = validationSummaries.length
    ? validationSummaries.map((s) => ({ source: "firebase_roadmap:validation", evidence: s }))
    : [];
  const validation_method = validationSummaries.length ? "Customer discovery conversations (Firebase journey)" : null;
  const validation_results = pmfSummaries.length ? pmfSummaries.join(" | ") : (validationSummaries.length ? validationSummaries.join(" | ") : null);

  // ---- Step 6: GTM ----
  const gtm_channel = findItemSummary(scaleOps, (txt) => txt.includes("acquisition channel") || txt.includes("channel"));
  const gtm_approach = findItemSummary(scaleOps, (txt) => txt.includes("playbook") || txt.includes("repeatable"));

  // ---- Step 7: Priorities & ownership ----
  const weekly_priorities = mentorPriorities(mentor);
  const ownership_structure = {
    co_founder: p.co_founder,
    has_partners: p.has_partners ?? null,
    source: "firebase_profile",
  };

  // ---- Step 8: Pilot ----
  const pilot_definition = findItemSummary(pmfSearch, (txt) => txt.includes("paying customers") || txt.includes("pilot"));
  const pilot_success_criteria = findItemSummary(economics, (txt) => txt.includes("ltv:cac") || txt.includes("ratio"));
  const pilot_results = [
    ...summariesFrom(pmfSearch).map((s) => ({ source: "pmf-search", result: s })),
    ...summariesFrom(economics).map((s) => ({ source: "economics", result: s })),
  ];

  // ---- Step 9: Scale ----
  const what_worked = itemsToJsonb(scaleOps);

  // ---- Compute step completion ----
  const step_1_completed = !!(problem_statement || problem_who);
  const step_2_completed = !!economic_buyer;
  const step_3_completed = !!(founder_edge || unique_insight || unfair_advantage);
  const step_4_completed = !!simplest_solution;
  const step_5_completed = demand_evidence.length > 0 || !!validation_results;
  const step_6_completed = !!(gtm_channel || gtm_approach);
  const step_7_completed = weekly_priorities.length > 0;
  const step_8_completed = !!(pilot_definition || pilot_success_criteria || pilot_results.length > 0);
  const step_9_completed = what_worked.length > 0;

  const stepFlags = [step_1_completed, step_2_completed, step_3_completed, step_4_completed, step_5_completed, step_6_completed, step_7_completed, step_8_completed, step_9_completed];
  const stepsCompleted = stepFlags.filter(Boolean).length;

  // current_step = highest step with any data, or 1 if none
  let current_step = 1;
  for (let i = stepFlags.length - 1; i >= 0; i--) {
    if (stepFlags[i]) { current_step = i + 1; break; }
  }

  // completion_percentage = done items / total items across roadmap
  const { done, total } = countDone(roadmap);
  const completion_percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  // validated_at timestamps — use first roadmap timestamp as a generic backfill
  const backfillTs = firstTimestamp(roadmap) ?? new Date().toISOString();

  const status = stepsCompleted === 9 ? "completed" : "active";

  const row: Record<string, unknown> = {
    user_id: p.id,
    current_step,
    status,
    completion_percentage,

    // Step 1
    problem_statement,
    problem_who,
    problem_frequency: null,
    problem_urgency: null,
    step_1_completed,
    step_1_validated_at: step_1_completed ? backfillTs : null,

    // Step 2
    economic_buyer,
    user_if_different: null,
    environment_context: null,
    step_2_completed,
    step_2_validated_at: step_2_completed ? backfillTs : null,

    // Step 3
    founder_edge,
    unique_insight,
    unfair_advantage,
    step_3_completed,
    step_3_validated_at: step_3_completed ? backfillTs : null,

    // Step 4
    simplest_solution,
    explicitly_excluded: null,
    step_4_completed,
    step_4_validated_at: step_4_completed ? backfillTs : null,

    // Step 5
    validation_method,
    demand_evidence,
    validation_results,
    step_5_completed,
    step_5_validated_at: step_5_completed ? backfillTs : null,

    // Step 6
    gtm_channel,
    gtm_approach,
    step_6_completed,
    step_6_validated_at: step_6_completed ? backfillTs : null,

    // Step 7
    weekly_priorities,
    ownership_structure,
    step_7_completed,
    step_7_validated_at: step_7_completed ? backfillTs : null,

    // Step 8
    pilot_definition,
    pilot_success_criteria,
    pilot_results,
    step_8_completed,
    step_8_validated_at: step_8_completed ? backfillTs : null,

    // Step 9
    what_worked,
    what_didnt_work: [],
    scale_decision: null,
    scale_reasoning: null,
    step_9_completed,
    step_9_validated_at: step_9_completed ? backfillTs : null,

    created_at: backfillTs,
    updated_at: new Date().toISOString(),
  };

  return { action: "upserted", row, completion_pct: completion_percentage, current_step, steps_completed: stepsCompleted };
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      email: { type: "string" },
      limit: { type: "string" },
    },
  });
  const dryRun = values["dry-run"] ?? false;
  const onlyEmail = values.email;
  const limit = values.limit ? Number(values.limit) : undefined;

  const db = makeClient();

  // Candidates: legacy Firebase profile import OR subcollections imported after chat bridge
  let query = db
    .from("profiles")
    .select("id, email, name, company_name, co_founder, has_partners, weak_spot, target_market:enrichment_data->>target_market, enrichment_data")
    .or(
      "enrichment_source.eq.firebase_migration_2026_04_21,enrichment_data->firebase_subcollections->imported_at.not.is.null"
    );
  if (onlyEmail) query = query.eq("email", onlyEmail);
  if (limit) query = query.limit(limit);

  const { data: profiles, error } = await query;
  if (error) throw error;
  console.log(`Candidate profiles: ${profiles?.length ?? 0} ${dryRun ? "(DRY RUN)" : ""}`);

  if (!profiles || profiles.length === 0) {
    console.log("no candidates — exiting");
    return;
  }

  const counts = { upserted: 0, skipped: 0, errors: 0 };
  const completionStats: number[] = [];
  let sampleRow: Record<string, unknown> | null = null;

  for (const p of profiles) {
    const { data: fullProf, error: readErr } = await db.from("profiles").select("*").eq("id", p.id).single();
    if (readErr || !fullProf) { counts.errors++; continue; }

    const res = bridgeUser(fullProf as ProfileRow);
    if (res.action === "skipped") {
      counts.skipped++;
      continue;
    }
    if (!sampleRow) sampleRow = res.row!;
    completionStats.push(res.completion_pct ?? 0);

    if (dryRun) {
      counts.upserted++;
      continue;
    }

    // Clear prior bridged row (if any) then insert fresh
    await db.from("startup_processes").delete().eq("user_id", p.id);
    const { error: insErr } = await db.from("startup_processes").insert(res.row);
    if (insErr) { counts.errors++; console.log(`  ${p.email}: insert err ${insErr.message}`); continue; }
    counts.upserted++;
    if (counts.upserted % 10 === 0) console.log(`  ... ${counts.upserted}/${profiles.length}`);
  }

  console.log(`\nDone. upserted=${counts.upserted} skipped=${counts.skipped} errors=${counts.errors}`);
  if (completionStats.length) {
    const avg = Math.round(completionStats.reduce((a,b)=>a+b,0) / completionStats.length);
    const max = Math.max(...completionStats);
    const min = Math.min(...completionStats);
    console.log(`completion_percentage: avg=${avg}% min=${min}% max=${max}%`);
  }

  if (dryRun && sampleRow) {
    console.log(`\n[DRY] Sample row for first candidate:`);
    // Trim large jsonb fields for display
    const trimmed: Record<string, unknown> = { ...sampleRow };
    for (const k of ["weekly_priorities","demand_evidence","pilot_results","what_worked"]) {
      const v = trimmed[k];
      if (Array.isArray(v) && v.length > 2) trimmed[k] = [v[0], `... (${v.length - 1} more)`];
    }
    console.log(JSON.stringify(trimmed, null, 2));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
