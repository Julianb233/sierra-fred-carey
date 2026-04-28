/**
 * Admin Migration Audit API
 *
 * GET /api/admin/migration-audit
 *
 * Diagnoses Firebase->Supabase migration gaps for the 65-user cohort
 * imported on 2026-04-21. For each migrated user, checks:
 *   - Profile parity: phone / location / target_market / etc. populated
 *   - oases_progress rows: at least one row, distribution across stages
 *   - startup_processes row: present (required for report generation)
 *   - Firebase subcollections present in enrichment_data (sanity check)
 *
 * Returns a structured report. William Hood verifies via admin panel
 * (AI-8888).
 *
 * Optional filter:
 *   ?email=cary.fred@gmail.com  -> single-user view
 *   ?gaps=only                  -> only return users with at least one gap
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FIREBASE_PARITY_FIELDS = [
  "phone",
  "location",
  "target_market",
  "stage_category",
  "weak_spot",
  "weak_spot_category",
  "idea_status",
  "passions",
  "has_partners",
] as const;

type AuditEntry = {
  user_id: string;
  email: string | null;
  enrichment_source: string | null;
  has_firebase_subcollections: boolean;
  has_startup_process: boolean;
  oases_progress_count: number;
  oases_progress_by_stage: Record<string, number>;
  profile_parity_missing: string[];
  has_completed_onboarding: boolean;
  gaps: string[];
};

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  try {
    const params = request.nextUrl.searchParams;
    const emailFilter = params.get("email");
    const gapsOnly = params.get("gaps") === "only";

    const supabase = createServiceClient();

    let q = supabase
      .from("profiles")
      .select(
        "id, email, enrichment_source, enrichment_data, " +
          FIREBASE_PARITY_FIELDS.join(", ") +
          ", oases_stage, name, company_name"
      )
      .eq("enrichment_source", "firebase_migration_2026_04_21");
    if (emailFilter) q = q.eq("email", emailFilter.toLowerCase());

    const { data: profiles, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries: AuditEntry[] = [];

    for (const profileRow of (profiles ?? []) as unknown as Array<Record<string, unknown>>) {
      const p = profileRow;
      const userId = p.id as string;
      const email = (p.email as string | null) ?? null;
      const enrichmentData =
        (p.enrichment_data as Record<string, unknown> | null) ?? {};
      const subs = enrichmentData.firebase_subcollections;
      const hasSubcollections =
        !!subs && typeof subs === "object" && Object.keys(subs).length > 0;

      // oases_progress count + per-stage breakdown
      const { data: progressRows } = await supabase
        .from("oases_progress")
        .select("stage")
        .eq("user_id", userId);
      const byStage: Record<string, number> = {};
      for (const row of progressRows ?? []) {
        const s = (row as { stage: string }).stage;
        byStage[s] = (byStage[s] ?? 0) + 1;
      }

      // startup_processes presence
      const { count: spCount } = await supabase
        .from("startup_processes")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", userId);

      // Profile parity check
      const missing: string[] = [];
      for (const field of FIREBASE_PARITY_FIELDS) {
        const v = p[field];
        if (v === null || v === undefined || v === "") {
          missing.push(field);
        }
      }

      // Completed onboarding heuristic: name + company_name + oases_stage set
      const completedOnboarding =
        !!p.name && !!p.company_name && !!p.oases_stage;

      const gaps: string[] = [];
      if (!hasSubcollections) gaps.push("missing_firebase_subcollections");
      if ((spCount ?? 0) === 0) gaps.push("no_startup_process_for_report_generation");
      if ((progressRows?.length ?? 0) === 0) gaps.push("empty_oases_progress");
      if (missing.length > 0)
        gaps.push(`profile_parity_missing:${missing.length}_fields`);

      entries.push({
        user_id: userId,
        email,
        enrichment_source: (p.enrichment_source as string | null) ?? null,
        has_firebase_subcollections: hasSubcollections,
        has_startup_process: (spCount ?? 0) > 0,
        oases_progress_count: progressRows?.length ?? 0,
        oases_progress_by_stage: byStage,
        profile_parity_missing: missing,
        has_completed_onboarding: completedOnboarding,
        gaps,
      });
    }

    const filtered = gapsOnly
      ? entries.filter((e) => e.gaps.length > 0)
      : entries;

    const summary = {
      total_migrated_users: entries.length,
      users_with_gaps: entries.filter((e) => e.gaps.length > 0).length,
      users_missing_oases_progress: entries.filter(
        (e) => e.oases_progress_count === 0
      ).length,
      users_missing_startup_process: entries.filter(
        (e) => !e.has_startup_process
      ).length,
      users_missing_firebase_subcollections: entries.filter(
        (e) => !e.has_firebase_subcollections
      ).length,
      users_with_profile_parity_gaps: entries.filter(
        (e) => e.profile_parity_missing.length > 0
      ).length,
      users_completed_onboarding: entries.filter(
        (e) => e.has_completed_onboarding
      ).length,
    };

    return NextResponse.json({
      summary,
      users: filtered,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[admin/migration-audit] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 }
    );
  }
}
