import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviders } from "@/lib/db/marketplace";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const stage = searchParams.get("stage") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const providers = await getProviders({ category, stage, search });
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("[marketplace] getProviders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
