import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '@/lib/auth';
import { UserTier } from '@/lib/constants';
import { getUserTier, createTierErrorResponse } from '@/lib/api/tier-middleware';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Check Studio tier gating
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    const { roomName, participantName } = await request.json();

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing roomName or participantName' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('LiveKit API credentials not configured');
      return NextResponse.json(
        { error: 'LiveKit not configured' },
        { status: 500 }
      );
    }

    // Create access token with userId as identity for security
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: participantName,
      ttl: '30m',
    });

    // Grant permissions for the room
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL,
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Response) return error;

    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const userId = await requireAuth();

    // 2. Check Studio tier gating
    const userTier = await getUserTier(userId);
    if (userTier < UserTier.STUDIO) {
      return createTierErrorResponse({
        allowed: false,
        userTier,
        requiredTier: UserTier.STUDIO,
        userId,
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const roomName = searchParams.get('room');
    const participantName = searchParams.get('name');

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing room or name query parameters' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'LiveKit not configured' },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: participantName,
      ttl: '30m',
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL,
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Response) return error;

    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
