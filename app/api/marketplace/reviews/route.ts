import { NextRequest, NextResponse } from "next/server";
import { DISABLED_FEATURES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createReview, updateProviderRating } from "@/lib/db/marketplace";

// AI-8891: Marketplace disabled until ready
export async function POST(req: NextRequest) {
  if (DISABLED_FEATURES.has("marketplace")) {
    return NextResponse.json(
      { error: "Marketplace is coming soon. Reviews are not available yet." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  if (typeof input.providerId !== "string") {
    return NextResponse.json(
      { error: "providerId is required" },
      { status: 400 }
    );
  }

  if (typeof input.rating !== "number" || input.rating < 1 || input.rating > 5) {
    return NextResponse.json(
      { error: "rating must be a number between 1 and 5" },
      { status: 400 }
    );
  }

  try {
    const review = await createReview(user.id, {
      providerId: input.providerId as string,
      bookingId:
        typeof input.bookingId === "string" ? input.bookingId : undefined,
      rating: input.rating as number,
      reviewText:
        typeof input.reviewText === "string" ? input.reviewText : undefined,
    });

    await updateProviderRating(input.providerId as string);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit review";
    console.error("[marketplace/reviews] createReview error:", error);
    const status = message.includes("not found") || message.includes("only review")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
