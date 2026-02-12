/**
 * FRED Call API Endpoint
 * Phase 42: Multi-Channel FRED Access
 *
 * POST /api/fred/call
 * Creates a LiveKit room for a voice call with FRED.
 * Generates a participant token for the authenticated user.
 * Requires Pro+ tier.
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { withLogging } from "@/lib/api/with-logging";

const callRequestSchema = z.object({
  /** "on-demand" (5-10 min) or "scheduled" (15-30 min) */
  callType: z.enum(["on-demand", "scheduled"]).default("on-demand"),
  /** Display name for the participant */
  participantName: z.string().min(1).max(100).optional(),
});

const TTL_MAP: Record<string, string> = {
  "on-demand": "15m",
  "scheduled": "45m",
};

async function handlePost(req: NextRequest) {
  try {
    const userId = await requireAuth();

    // Require Pro+ for voice calls
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.PRO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.PRO,
        userId,
      });
    }

    const body = await req.json();
    const parsed = callRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { callType, participantName } = parsed.data;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("[Fred Call] LiveKit credentials not configured");
      return NextResponse.json(
        { error: "Voice calling is not configured" },
        { status: 500 }
      );
    }

    // Create a unique room name scoped to this user and call
    const roomName = `fred-call_${userId}_${Date.now()}`;

    // Generate access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: participantName || "Founder",
      ttl: TTL_MAP[callType] || "15m",
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    } as any);

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      url: process.env.LIVEKIT_URL,
      room: roomName,
      callType,
      maxDuration: callType === "on-demand" ? 600 : 1800, // seconds
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("[Fred Call] Error:", error);
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}

export const POST = withLogging(handlePost as (request: Request, context?: unknown) => Promise<Response>);
