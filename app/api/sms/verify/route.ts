/**
 * SMS Phone Verification API
 * Phase 04: Studio Tier Features
 *
 * POST /api/sms/verify - Send a 6-digit verification code via SMS
 * PUT  /api/sms/verify - Confirm a verification code
 *
 * Verification codes are stored in the phone_verifications table and expire
 * after 10 minutes. A phone number must be verified before it can be saved
 * in SMS preferences.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import {
  getUserTier,
  createTierErrorResponse,
} from "@/lib/api/tier-middleware";
import { sendSMS } from "@/lib/sms/client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ============================================================================
// POST - Send verification code
// ============================================================================

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
    const { phoneNumber } = body;

    // Validate E.164 format
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Must be E.164 (e.g., +15551234567)" },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store verification code in DB (upsert so re-sends overwrite previous codes)
    const supabase = await createClient();
    const { error: upsertError } = await supabase
      .from("phone_verifications")
      .upsert(
        {
          user_id: userId,
          phone_number: phoneNumber,
          code,
          expires_at: expiresAt,
          verified: false,
        },
        { onConflict: "user_id,phone_number" }
      );

    if (upsertError) {
      console.error("[SMS Verify POST] DB upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to store verification code" },
        { status: 500 }
      );
    }

    // Send verification SMS via Twilio
    try {
      await sendSMS(
        phoneNumber,
        `Your Fred verification code is: ${code}. It expires in 10 minutes.`
      );
    } catch (smsError) {
      console.error("[SMS Verify POST] Twilio send error:", smsError);
      return NextResponse.json(
        { error: "Failed to send verification SMS" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent",
    });
  } catch (error) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[SMS Verify POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate phone verification" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Confirm verification code
// ============================================================================

export async function PUT(request: NextRequest) {
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
    const { phoneNumber, code } = body;

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: "Both phoneNumber and code are required" },
        { status: 400 }
      );
    }

    // Look up the verification record
    const supabase = await createClient();
    const { data: verification, error: fetchError } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("phone_number", phoneNumber)
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Mark phone as verified
    const { error: updateError } = await supabase
      .from("phone_verifications")
      .update({ verified: true })
      .eq("user_id", userId)
      .eq("phone_number", phoneNumber);

    if (updateError) {
      console.error("[SMS Verify PUT] DB update error:", updateError);
      return NextResponse.json(
        { error: "Failed to confirm verification" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    // Return auth errors directly
    if (error instanceof Response) return error;

    console.error("[SMS Verify PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify phone number" },
      { status: 500 }
    );
  }
}
