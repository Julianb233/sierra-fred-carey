/**
 * SMS Preferences API
 * Phase 04: Studio Tier Features - Plan 07
 *
 * GET /api/sms/preferences - Returns SMS preferences for authenticated user
 * POST /api/sms/preferences - Updates SMS preferences for authenticated user
 *
 * Phase 11-06: Uses createClient (user-scoped) instead of createServiceClient
 * to reduce blast radius of service role key for user-initiated requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import {
  getUserSMSPreferences,
  updateSMSPreferences,
  getCheckinHistory,
} from "@/lib/db/sms";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ============================================================================
// GET - Read SMS preferences
// ============================================================================

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

    const url = new URL(request.url);
    const includeHistory = url.searchParams.get("include") === "history";

    // User-scoped client for user-initiated request (Phase 11-06)
    const supabase = await createClient();
    const preferences = await getUserSMSPreferences(supabase, userId);

    const responseData: Record<string, unknown> = {
      preferences: preferences || {
        userId,
        phoneNumber: null,
        phoneVerified: false,
        checkinEnabled: false,
        checkinDay: 1,
        checkinHour: 9,
        timezone: "America/New_York",
        createdAt: null,
        updatedAt: null,
      },
    };

    // Include check-in history if requested
    if (includeHistory) {
      try {
        const checkins = await getCheckinHistory(supabase, userId, { limit: 50 });
        responseData.checkins = checkins;
      } catch (historyError) {
        console.error("[SMS Preferences GET] Error fetching history:", historyError);
        responseData.checkins = [];
      }
    }

    return NextResponse.json(responseData);
  } catch (error) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[SMS Preferences GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMS preferences" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Update SMS preferences
// ============================================================================

const UpdatePreferencesSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +15551234567)")
    .optional(),
  checkinEnabled: z.boolean().optional(),
  checkinDay: z.number().int().min(0).max(6).optional(),
  checkinHour: z.number().int().min(0).max(23).optional(),
  timezone: z
    .string()
    .min(1)
    .max(50)
    .optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = UpdatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // User-scoped client for user-initiated request (Phase 11-06)
    const supabase = await createClient();

    // If a phone number is being set, verify it has been confirmed
    if (updates.phoneNumber) {
      const { data: verification } = await supabase
        .from("phone_verifications")
        .select("verified")
        .eq("user_id", userId)
        .eq("phone_number", updates.phoneNumber)
        .eq("verified", true)
        .single();

      if (!verification) {
        return NextResponse.json(
          {
            error: "Phone number must be verified before saving. Send a verification code via POST /api/sms/verify first.",
            code: "PHONE_NOT_VERIFIED",
          },
          { status: 400 }
        );
      }
    }

    const preferences = await updateSMSPreferences(supabase, userId, {
      phoneNumber: updates.phoneNumber,
      phoneVerified: updates.phoneNumber ? true : undefined,
      checkinEnabled: updates.checkinEnabled,
      checkinDay: updates.checkinDay,
      checkinHour: updates.checkinHour,
      timezone: updates.timezone,
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[SMS Preferences POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to update SMS preferences" },
      { status: 500 }
    );
  }
}
