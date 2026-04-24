import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);

  const supabase = createServiceClient();

  interface ProfileRow {
    id: string;
    email: string | null;
    name: string | null;
    company_name: string | null;
    oases_stage: string | null;
    stage: string | null;
    industry: string | null;
    tier: number | null;
    product_positioning: string | null;
    reality_lens_complete: boolean | null;
    reality_lens_score: number | null;
    enrichment_source: string | null;
    primary_constraint: string | null;
    ninety_day_goal: string | null;
    traction: string | null;
    product_status: string | null;
    revenue_range: string | null;
    team_size: number | null;
    funding_history: unknown;
    co_founder: string | null;
    created_at: string | null;
    updated_at: string | null;
  }

  const { data: rawProfiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let profiles = (rawProfiles || []) as unknown as ProfileRow[];

  if (q) {
    profiles = profiles.filter((p) => {
      const hay = `${p.email || ""} ${p.name || ""} ${p.company_name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const authByEmail = new Map<string, {
    last_sign_in_at: string | null;
    recovery_sent_at: string | null;
    email_confirmed_at: string | null;
    imported_from: string | null;
    firebase_uid: string | null;
    provider: string;
  }>();
  for (const u of authList?.users || []) {
    if (!u.email) continue;
    const md = (u.user_metadata as Record<string, unknown>) || {};
    authByEmail.set(u.email.toLowerCase(), {
      last_sign_in_at: u.last_sign_in_at || null,
      recovery_sent_at: u.recovery_sent_at || null,
      email_confirmed_at: u.email_confirmed_at || null,
      imported_from: (md.imported_from as string) || null,
      firebase_uid: (md.firebase_uid as string) || null,
      provider: (u.app_metadata?.provider as string) || "email",
    });
  }

  const merged = profiles.map((p) => ({
    ...p,
    auth: p.email ? authByEmail.get(p.email.toLowerCase()) || null : null,
  }));

  return NextResponse.json({
    total: merged.length,
    users: merged,
  });
}
