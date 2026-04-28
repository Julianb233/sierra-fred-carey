import { NextRequest, NextResponse } from "next/server";
import { DISABLED_FEATURES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/db/marketplace";

// AI-8891: Marketplace disabled until ready
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (DISABLED_FEATURES.has("marketplace")) {
    return NextResponse.json(
      { error: "Marketplace is coming soon.", provider: null },
      { status: 404 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const provider = await getProvider(slug);
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    return NextResponse.json({ provider });
  } catch (error) {
    console.error("[marketplace/slug] getProvider error:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider" },
      { status: 500 }
    );
  }
}
