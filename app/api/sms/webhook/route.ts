/**
 * Twilio SMS Webhook Endpoint
 * Phase 04: Studio Tier Features - Plan 05
 *
 * Receives inbound SMS messages from Twilio.
 * Validates webhook signature to prevent spoofing.
 * Returns empty TwiML response.
 *
 * POST /api/sms/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateWebhook } from '@/lib/sms/client';
import { processInboundSMS } from '@/lib/sms/webhook-handler';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.error('[SMS Webhook] TWILIO_AUTH_TOKEN not configured');
      return NextResponse.json(
        {
          error: 'Service unavailable',
          code: 'SERVICE_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    // Parse form data (Twilio sends application/x-www-form-urlencoded)
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate Twilio signature
    const signature = request.headers.get('x-twilio-signature');
    if (!signature) {
      console.warn('[SMS Webhook] Missing x-twilio-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 403 }
      );
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`;
    const isValid = validateWebhook(signature, webhookUrl, params);

    if (!isValid) {
      console.warn('[SMS Webhook] Invalid Twilio signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Validate message age to prevent replay attacks (10-minute window)
    const messageTimestamp = params.DateCreated || params.DateSent;
    if (messageTimestamp) {
      const messageAge = Date.now() - new Date(messageTimestamp).getTime();
      if (messageAge > 600_000) {
        console.warn(`[SMS Webhook] Stale message rejected (${Math.round(messageAge / 1000)}s old)`);
        return new NextResponse(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { status: 200, headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    // Extract message details
    const from = params.From;
    const body = params.Body;

    if (!from || !body) {
      console.warn('[SMS Webhook] Missing From or Body in request');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process the inbound SMS
    await processInboundSMS(from, body);

    // Return empty TwiML response (Twilio expects XML)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('[SMS Webhook] Error processing inbound SMS:', error);
    // Still return TwiML to prevent Twilio from retrying
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}
