import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getNextSteps } from "@/lib/next-steps/next-steps-service";

/**
 * GET /api/next-steps
 * Returns the user's active (not completed, not dismissed) next steps
 * grouped by priority.
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    const grouped = await getNextSteps(userId);

    // Flatten into a single ordered array: critical > important > optional
    const data = [
      ...grouped.critical,
      ...grouped.important,
      ...grouped.optional,
    ];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[GET /api/next-steps]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load next steps" },
      { status: 500 }
    );
  }
}
