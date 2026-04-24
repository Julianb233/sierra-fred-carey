import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: authUser, error: aErr } = await supabase.auth.admin.getUserById(id);
  if (aErr || !authUser?.user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: authUser.user.email,
    options: {
      redirectTo: `${origin}/dashboard`,
    },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate link" },
      { status: 500 },
    );
  }

  console.log(
    `[admin.impersonate] magic link issued for user=${id} email=${authUser.user.email}`,
  );

  return NextResponse.json({
    email: authUser.user.email,
    action_link: data.properties.action_link,
  });
}
