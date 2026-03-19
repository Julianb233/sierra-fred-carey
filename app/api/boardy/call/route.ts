/**
 * Boardy Call Request API Route
 * AI-3587: Boardy.ai warm investor introductions ($249 tier)
 *
 * POST /api/boardy/call - Request a Boardy AI voice call for founder profiling
 *
 * This is the primary handoff: founder provides their phone number,
 * Boardy calls them and conducts a natural conversation to understand
 * their startup, goals, and what kind of connections they need.
 *
 * Studio tier required.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { getBoardyClient } from "@/lib/boardy/client";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Request Validation
// ============================================================================

const callRequestSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number format. Include country code (e.g., +14155551234)"),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

// ============================================================================
// POST /api/boardy/call
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Check Studio tier
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    // 3. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = callRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 4. Enrich with user profile data
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const client = getBoardyClient();

    // 5. Check if real API is available
    if (!client.isLive) {
      return NextResponse.json({
        success: false,
        error: "Boardy calls are coming soon. Currently using AI-generated matches.",
        isDemo: true,
      }, { status: 503 });
    }

    // 6. Request the call
    const result = await client.requestCall({
      phoneNumber: parsed.data.phoneNumber,
      name: parsed.data.name || profile?.full_name || undefined,
      email: parsed.data.email || profile?.email || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      referenceId: result.referenceId,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Boardy Call] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to request Boardy call" },
      { status: 500 }
    );
  }
}
