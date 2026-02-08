import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '@/lib/auth';
import { UserTier } from '@/lib/constants';
import { getUserTier, createTierErrorResponse } from '@/lib/api/tier-middleware';

const ROOM_NAME_MAX_LENGTH = 128;
const ROOM_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Sanitize and validate a room name segment.
 * Only allows alphanumeric characters, hyphens, and underscores.
 */
function sanitizeRoomName(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > ROOM_NAME_MAX_LENGTH) return null;
  if (!ROOM_NAME_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Build a user-scoped room name by prefixing with userId.
 * This prevents users from joining rooms belonging to other users.
 */
function buildScopedRoomName(userId: string, roomName: string): string {
  return `${userId}_${roomName}`;
}

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

    const { roomName, participantName, enableRecording } = await request.json();

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing roomName or participantName' },
        { status: 400 }
      );
    }

    // 3. Sanitize roomName to prevent injection
    const sanitized = sanitizeRoomName(roomName);
    if (!sanitized) {
      return NextResponse.json(
        { error: 'Invalid roomName: must be 1-128 alphanumeric, hyphen, or underscore characters' },
        { status: 400 }
      );
    }

    // 4. Scope room to the authenticated user
    const scopedRoom = buildScopedRoomName(userId, sanitized);

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

    // Grant permissions for the user-scoped room
    const grants: Record<string, unknown> = {
      room: scopedRoom,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    // Phase 29-02: Add recording permission for Studio users
    if (enableRecording) {
      grants.recorder = true;
    }

    at.addGrant(grants as any);

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL,
      room: scopedRoom,
      recording: !!enableRecording,
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

    // 3. Sanitize roomName to prevent injection
    const sanitized = sanitizeRoomName(roomName);
    if (!sanitized) {
      return NextResponse.json(
        { error: 'Invalid room: must be 1-128 alphanumeric, hyphen, or underscore characters' },
        { status: 400 }
      );
    }

    // 4. Scope room to the authenticated user
    const scopedRoom = buildScopedRoomName(userId, sanitized);

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
      room: scopedRoom,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL,
      room: scopedRoom,
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
