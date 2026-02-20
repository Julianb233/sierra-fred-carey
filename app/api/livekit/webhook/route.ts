import { WebhookReceiver } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * LiveKit Webhook Handler
 *
 * Receives server events from LiveKit Cloud:
 * - room_started / room_finished
 * - participant_joined / participant_left
 * - track_published / track_unpublished
 *
 * Configure webhook URL in LiveKit Cloud dashboard:
 *   https://your-domain.com/api/livekit/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('[LiveKit Webhook] LIVEKIT_API_KEY or LIVEKIT_API_SECRET not configured');
      return NextResponse.json(
        { error: 'LiveKit webhook not configured' },
        { status: 503 },
      );
    }

    const receiver = new WebhookReceiver(apiKey, apiSecret);

    const body = await req.text();
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const event = await receiver.receive(body, authHeader);

    console.log(`[LiveKit Webhook] ${event.event}`, {
      room: event.room?.name,
      participant: event.participant?.identity,
      timestamp: new Date().toISOString(),
    });

    const supabase = createServiceClient();

    switch (event.event) {
      case 'room_started': {
        const roomName = event.room?.name;
        if (!roomName) break;

        // Extract host user ID from room name (format: ${userId}_room-xxx-xxx)
        const hostUserId = extractUserIdFromRoom(roomName);

        // Upsert into video_rooms — the room may already exist if it was pre-scheduled
        const { error } = await supabase
          .from('video_rooms')
          .upsert(
            {
              room_name: roomName,
              status: 'active',
              started_at: new Date().toISOString(),
              host_user_id: hostUserId,
              metadata: {
                livekit_sid: event.room?.sid,
                max_participants: event.room?.maxParticipants,
              },
            },
            { onConflict: 'room_name' }
          );

        if (error) {
          console.error('[LiveKit Webhook] Failed to upsert video_rooms:', error.message);
        } else {
          console.log(`[LiveKit Webhook] Room started and recorded: ${roomName}`);
        }

        // Also create/update coaching_sessions if this is a fred-call room
        if (roomName.includes('fred-call') && hostUserId) {
          const { error: sessionError } = await supabase
            .from('coaching_sessions')
            .upsert(
              {
                user_id: hostUserId,
                room_name: roomName,
                status: 'in_progress',
                started_at: new Date().toISOString(),
              },
              { onConflict: 'room_name' }
            );

          if (sessionError) {
            console.error('[LiveKit Webhook] Failed to upsert coaching_sessions:', sessionError.message);
          }
        }
        break;
      }

      case 'room_finished': {
        const roomName = event.room?.name;
        if (!roomName) break;

        const now = new Date().toISOString();

        // Fetch the room to calculate duration and preserve existing metadata
        const { data: room } = await supabase
          .from('video_rooms')
          .select('id, started_at, metadata')
          .eq('room_name', roomName)
          .maybeSingle();

        const durationSeconds = room?.started_at
          ? Math.floor((Date.now() - new Date(room.started_at).getTime()) / 1000)
          : null;

        // Merge with existing metadata so room_started fields are preserved
        const mergedMetadata = {
          ...(room?.metadata as Record<string, unknown> || {}),
          livekit_sid: event.room?.sid,
          duration_seconds: durationSeconds,
        };

        // Update video_rooms status
        const { error } = await supabase
          .from('video_rooms')
          .update({
            status: 'ended',
            ended_at: now,
            metadata: mergedMetadata,
          })
          .eq('room_name', roomName);

        if (error) {
          console.error('[LiveKit Webhook] Failed to update video_rooms:', error.message);
        } else {
          console.log(`[LiveKit Webhook] Room finished: ${roomName}, duration: ${durationSeconds}s`);
        }

        // Also close any open participants for this room
        if (room?.id) {
          const { error: partError } = await supabase
            .from('video_participants')
            .update({
              left_at: now,
            })
            .eq('room_id', room.id)
            .is('left_at', null);

          if (partError) {
            console.error('[LiveKit Webhook] Failed to close participants:', partError.message);
          }
        }

        // Finalize coaching_sessions if applicable
        if (roomName.includes('fred-call')) {
          const { error: sessionError } = await supabase
            .from('coaching_sessions')
            .update({
              status: 'completed',
              ended_at: now,
              duration_seconds: durationSeconds,
            })
            .eq('room_name', roomName)
            .eq('status', 'in_progress');

          if (sessionError) {
            console.error('[LiveKit Webhook] Failed to finalize coaching_sessions:', sessionError.message);
          }
        }
        break;
      }

      case 'participant_joined': {
        const roomName = event.room?.name;
        const participant = event.participant;
        if (!roomName || !participant) break;

        // Look up the video_rooms record
        const { data: room } = await supabase
          .from('video_rooms')
          .select('id')
          .eq('room_name', roomName)
          .maybeSingle();

        if (!room) {
          console.warn(`[LiveKit Webhook] Room not found for participant join: ${roomName}`);
          break;
        }

        // Determine user_id from participant identity (identity may be the userId)
        const participantUserId = extractUserIdFromIdentity(participant.identity);

        const { error } = await supabase
          .from('video_participants')
          .insert({
            room_id: room.id,
            user_id: participantUserId,
            participant_name: participant.name || participant.identity,
            participant_identity: participant.identity,
            role: participant.metadata?.includes('"type":"ai_agent"') ? 'co-host' : 'participant',
            joined_at: new Date().toISOString(),
            metadata: {
              livekit_sid: participant.sid,
              region: participant.region || null,
            },
          });

        if (error) {
          console.error('[LiveKit Webhook] Failed to insert participant:', error.message);
        } else {
          console.log(`[LiveKit Webhook] Participant joined: ${participant.identity} in ${roomName}`);
        }
        break;
      }

      case 'participant_left': {
        const roomName = event.room?.name;
        const participant = event.participant;
        if (!roomName || !participant) break;

        // Look up the video_rooms record
        const { data: room } = await supabase
          .from('video_rooms')
          .select('id')
          .eq('room_name', roomName)
          .maybeSingle();

        if (!room) {
          console.warn(`[LiveKit Webhook] Room not found for participant leave: ${roomName}`);
          break;
        }

        const now = new Date().toISOString();

        // Find the participant record and update left_at + duration
        const { data: participantRecord } = await supabase
          .from('video_participants')
          .select('id, joined_at')
          .eq('room_id', room.id)
          .eq('participant_identity', participant.identity)
          .is('left_at', null)
          .maybeSingle();

        if (participantRecord) {
          const durationSeconds = Math.floor(
            (Date.now() - new Date(participantRecord.joined_at).getTime()) / 1000
          );

          const { error } = await supabase
            .from('video_participants')
            .update({
              left_at: now,
              duration_seconds: durationSeconds,
            })
            .eq('id', participantRecord.id);

          if (error) {
            console.error('[LiveKit Webhook] Failed to update participant leave:', error.message);
          } else {
            console.log(
              `[LiveKit Webhook] Participant left: ${participant.identity} from ${roomName}, duration: ${durationSeconds}s`
            );
          }
        }
        break;
      }

      case 'egress_ended': {
        const egressInfo = event.egressInfo;
        if (!egressInfo) {
          console.warn('[LiveKit Webhook] egress_ended: no egressInfo');
          break;
        }

        const egressRoomName = egressInfo.roomName;
        if (!egressRoomName) {
          console.warn('[LiveKit Webhook] egress_ended: no roomName in egressInfo');
          break;
        }

        // Extract file URL from file results
        // fileResults contains completed file upload info
        let recordingUrl: string | null = null;

        if (egressInfo.fileResults && egressInfo.fileResults.length > 0) {
          // location is the download URL; filename is the S3 key
          recordingUrl = egressInfo.fileResults[0].location || egressInfo.fileResults[0].filename || null;
        }

        if (!recordingUrl) {
          // Construct predictable URL from the filepath we set at recording start
          const s3Endpoint = process.env.RECORDING_S3_ENDPOINT;
          const s3Bucket = process.env.RECORDING_S3_BUCKET;
          if (s3Endpoint && s3Bucket) {
            recordingUrl = `${s3Endpoint}/${s3Bucket}/voice-recordings/${egressRoomName}.ogg`;
          }
        }

        if (recordingUrl) {
          const { error } = await supabase
            .from('coaching_sessions')
            .update({ recording_url: recordingUrl })
            .eq('room_name', egressRoomName);

          if (error) {
            console.error('[LiveKit Webhook] Failed to store recording URL:', error.message);
          } else {
            console.log(`[LiveKit Webhook] Recording URL stored for room ${egressRoomName}: ${recordingUrl}`);
          }
        } else {
          console.warn(`[LiveKit Webhook] egress_ended for room ${egressRoomName} but no recording URL found`);
        }

        break;
      }

      default:
        console.log(`[LiveKit Webhook] Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[LiveKit Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Invalid webhook' },
      { status: 400 },
    );
  }
}

/**
 * Extract user ID from room name.
 * Room names follow the pattern: ${userId}_room-xxx-xxx or ${userId}_fred-call-xxx
 */
function extractUserIdFromRoom(roomName: string): string | null {
  const underscoreIndex = roomName.indexOf('_');
  if (underscoreIndex === -1) return null;
  const candidate = roomName.slice(0, underscoreIndex);
  // UUID-like check (at least 32 chars with hyphens)
  if (candidate.length >= 32) return candidate;
  return null;
}

/**
 * Extract user ID from participant identity.
 * Participant identity may be the userId directly, or prefixed/formatted differently.
 * Returns null for AI agent identities.
 */
function extractUserIdFromIdentity(identity: string): string | null {
  if (!identity) return null;
  // AI agents use exact identity 'fred-cary-voice' or prefix 'ai-agent'
  if (identity === 'fred-cary-voice' || identity.startsWith('ai-agent')) return null;
  // If it looks like a UUID, return it
  if (identity.length >= 32) return identity;
  return null;
}
