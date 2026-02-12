/**
 * Command Center API
 *
 * GET /api/dashboard/command-center
 * Returns all data needed for the Founder Command Center dashboard home.
 * Single endpoint that aggregates founder snapshot, current step, process
 * progress, funding readiness, weekly momentum, and display rules.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCommandCenterData } from "@/lib/dashboard/command-center";

export async function GET() {
  try {
    const userId = await requireAuth();
    const data = await getCommandCenterData(userId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Command Center] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch command center data" },
      { status: 500 }
    );
  }
}
