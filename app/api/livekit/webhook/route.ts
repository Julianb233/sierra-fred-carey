import { WebhookReceiver } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

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

    switch (event.event) {
      case 'room_started':
        console.log(`[LiveKit] Room started: ${event.room?.name}`);
        break;

      case 'room_finished':
        console.log(`[LiveKit] Room finished: ${event.room?.name}`);
        break;

      case 'participant_joined':
        console.log(
          `[LiveKit] Participant joined: ${event.participant?.identity} in room ${event.room?.name}`,
        );
        break;

      case 'participant_left':
        console.log(
          `[LiveKit] Participant left: ${event.participant?.identity} from room ${event.room?.name}`,
        );
        break;

      default:
        console.log(`[LiveKit] Unhandled event: ${event.event}`);
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
