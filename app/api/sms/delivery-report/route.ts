/**
 * SMS Delivery Report API
 * Phase 61: Twilio SMS Activation - Plan 02
 *
 * GET /api/sms/delivery-report - Returns delivery statistics for authenticated Studio user
 *
 * Accepts optional query params:
 *   - startDate: ISO date string for filtering start
 *   - endDate: ISO date string for filtering end
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { getDeliveryStats } from "@/lib/db/sms";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryStats } from "@/lib/sms/types";

export const dynamic = "force-dynamic";

const emptyStats: DeliveryStats = {
  total: 0,
  delivered: 0,
  failed: 0,
  pending: 0,
  deliveryRate: 0,
};

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    // Check Studio tier gating
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    // Parse optional date filters
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Validate dates if provided
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json({ stats: emptyStats });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ stats: emptyStats });
    }

    const supabase = await createClient();
    const stats = await getDeliveryStats(supabase, {
      userId,
      startDate,
      endDate,
    });

    return NextResponse.json({ stats });
  } catch (error) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[SMS Delivery Report GET] Error:", error);
    return NextResponse.json({ stats: emptyStats });
  }
}
