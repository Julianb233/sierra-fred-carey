import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  CUSTOMERIO_EVENTS,
  LIFECYCLE_CONSENT,
  trackLifecycleEvent,
} from "@/lib/customerio";

export async function POST() {
  try {
    const userId = await requireAuth();
    const cohortDate = new Date().toISOString().slice(0, 10);

    const result = await trackLifecycleEvent(
      userId,
      CUSTOMERIO_EVENTS.PRICING_VIEWED,
      {
        source: "pricing_page",
        correlationId: cohortDate,
        consent: LIFECYCLE_CONSENT.UNKNOWN,
      },
      { cohort_date: cohortDate },
      `pricing_viewed:${userId}:${cohortDate}`,
    );

    return NextResponse.json({
      success: result.success || result.skipped,
      tracked: result.success,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { success: false, error: "Unable to register pricing view" },
      { status: 500 },
    );
  }
}
