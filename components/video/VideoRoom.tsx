'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useTracks,
  GridLayout,
  ParticipantTile,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';

interface VideoRoomProps {
  roomName?: string;
  userName?: string;
  sessionId?: string;
  onLeave?: () => void;
}

// ============================================================================
// Participant Tracking Helpers
// ============================================================================

async function recordParticipantJoin(
  sessionId: string,
  name: string
): Promise<string | null> {
  try {
    const res = await fetch('/api/coaching/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.participant?.id ?? null;
  } catch {
    console.error('[VideoRoom] Failed to record participant join');
    return null;
  }
}

async function recordParticipantLeave(participantId: string): Promise<void> {
  try {
    await fetch('/api/coaching/participants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    });
  } catch {
    console.error('[VideoRoom] Failed to record participant leave');
  }
}

// ============================================================================
// VideoRoom Component
// ============================================================================

export function VideoRoom({ roomName: initialRoom, userName: initialName, sessionId, onLeave }: VideoRoomProps) {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [roomName, setRoomName] = useState(initialRoom || '');
  const [userName, setUserName] = useState(initialName || '');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const participantIdRef = useRef<string | null>(null);

  // Clean up participant on unmount (safety net)
  useEffect(() => {
    return () => {
      if (participantIdRef.current) {
        recordParticipantLeave(participantIdRef.current);
        participantIdRef.current = null;
      }
    };
  }, []);

  const joinRoom = useCallback(async () => {
    if (!roomName.trim() || !userName.trim()) {
      setError('Please enter both room name and your name');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomName.trim(),
          participantName: userName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get access token');
      }

      const data = await response.json();
      setToken(data.token);
      setServerUrl(data.url);
      setIsConnected(true);

      // Record participant join if we have a sessionId
      if (sessionId) {
        const pid = await recordParticipantJoin(sessionId, userName.trim());
        if (pid) {
          participantIdRef.current = pid;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  }, [roomName, userName, sessionId]);

  const handleDisconnect = useCallback(async () => {
    // Record participant leave
    if (participantIdRef.current) {
      await recordParticipantLeave(participantIdRef.current);
      participantIdRef.current = null;
    }

    setToken('');
    setServerUrl('');
    setIsConnected(false);
    onLeave?.();
  }, [onLeave]);

  // Join form
  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Join Video Call
          </CardTitle>
          <CardDescription>
            Enter a room name to join or create a new video call
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              placeholder="e.g., team-meeting"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userName">Your Name</Label>
            <Input
              id="userName"
              placeholder="e.g., John Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button
            onClick={joinRoom}
            disabled={isJoining || !roomName.trim() || !userName.trim()}
            className="w-full"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Video room
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleDisconnect}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// Simpler video grid component for custom layouts
export function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 8rem)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

export default VideoRoom;
