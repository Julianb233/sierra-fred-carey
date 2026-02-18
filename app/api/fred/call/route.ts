/**
 * FRED Call API Endpoint
 * Phase 42: Multi-Channel FRED Access
 *
 * POST /api/fred/call
 * Creates a LiveKit room for a voice call with FRED.
 * Dispatches the fred-cary-voice agent to join the room.
 * Generates a participant token for the authenticated user.
 * Requires Pro+ tier.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  AccessToken,
  AgentDispatchClient,
  RoomServiceClient,
} from "livekit-server-sdk";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { UserTier } from "@/lib/constants";
import { getUserTier, createTierErrorResponse } from "@/lib/api/tier-middleware";
import { withLogging } from "@/lib/api/with-logging";

/** Agent name must match the agentName in workers/voice-agent/index.ts */
const FRED_AGENT_NAME = "fred-cary-voice";

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

/** Convert wss:// LiveKit URL to https:// for server SDK clients */
function getLivekitHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
}

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
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("[Fred Call] LiveKit credentials not configured");
      return NextResponse.json(
        { error: "Voice calling is not configured" },
        { status: 500 }
      );
    }

    // Create a unique room name scoped to this user and call
    // userId must come first — the webhook's extractUserIdFromRoom() splits on the first underscore
    const roomName = `${userId}_fred-call_${Date.now()}`;
    const httpUrl = getLivekitHttpUrl(livekitUrl);

    // 1. Create the room on LiveKit server so it exists before the client connects
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const emptyTimeout = callType === "on-demand" ? 300 : 600; // seconds
    await roomService.createRoom({
      name: roomName,
      emptyTimeout,
      maxParticipants: 2, // founder + agent
    });
    console.log(`[Fred Call] Room created: ${roomName}`);

    // 2. Explicitly dispatch the voice agent to join this room
    const dispatchClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
    const dispatch = await dispatchClient.createDispatch(
      roomName,
      FRED_AGENT_NAME,
      { metadata: JSON.stringify({ userId, callType }) },
    );
    console.log(`[Fred Call] Agent dispatched: ${dispatch.id} -> ${roomName}`);

    // 3. Generate access token for the user
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
      url: livekitUrl,
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
