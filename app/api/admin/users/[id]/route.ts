import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: profile, error: pErr }, { data: authUser }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.auth.admin.getUserById(id),
  ]);

  if (pErr && pErr.code !== "PGRST116") {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const [
    { count: chatCount },
    { count: journeyCount },
    { count: stepCount },
    { data: recentChat },
    { data: recentJourney },
  ] = await Promise.all([
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("journey_events").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("fred_step_progress").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("chat_messages").select("id, role, content, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("journey_events").select("event_type, metadata, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
  ]);

  return NextResponse.json({
    profile,
    auth: authUser?.user
      ? {
          id: authUser.user.id,
          email: authUser.user.email,
          last_sign_in_at: authUser.user.last_sign_in_at,
          recovery_sent_at: authUser.user.recovery_sent_at,
          email_confirmed_at: authUser.user.email_confirmed_at,
          created_at: authUser.user.created_at,
          user_metadata: authUser.user.user_metadata,
        }
      : null,
    stats: {
      chat_messages: chatCount || 0,
      journey_events: journeyCount || 0,
      fred_steps: stepCount || 0,
    },
    recent: {
      chat: recentChat || [],
      journey: recentJourney || [],
    },
  });
}
