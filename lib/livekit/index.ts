// LiveKit configuration and utilities

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

export interface TokenResponse {
  token: string;
  url: string;
}

export interface JoinRoomParams {
  roomName: string;
  participantName: string;
  participantIdentity?: string;
}

/**
 * Get a LiveKit access token for joining a room
 */
export async function getToken(params: JoinRoomParams): Promise<TokenResponse> {
  const response = await fetch('/api/livekit/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get token');
  }

  return response.json();
}

/**
 * Generate a random room name
 */
export function generateRoomName(prefix = 'room'): string {
  const randomId = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${randomId}-${timestamp}`;
}

/**
 * Parse room name from URL or generate new one
 */
export function getRoomFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}
