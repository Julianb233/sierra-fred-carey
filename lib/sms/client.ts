/**
 * Twilio Client Wrapper
 * Phase 04: Studio Tier Features - Plan 05
 *
 * Lazy-initialized Twilio client for SMS sending and webhook validation.
 * Follows the pattern from lib/stripe/server.ts.
 */

import Twilio from 'twilio';

// Lazy-load Twilio client to avoid build-time errors when env vars aren't set
let twilioClient: Twilio.Twilio | null = null;

function getTwilio(): Twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid) {
      throw new Error(
        'TWILIO_ACCOUNT_SID environment variable is not set. ' +
        'Get it from Twilio Console -> Account Info -> Account SID.'
      );
    }
    if (!authToken) {
      throw new Error(
        'TWILIO_AUTH_TOKEN environment variable is not set. ' +
        'Get it from Twilio Console -> Account Info -> Auth Token.'
      );
    }

    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Send an SMS message via Twilio Messaging Service.
 *
 * When NEXT_PUBLIC_APP_URL is set, automatically includes a statusCallback
 * URL so Twilio posts delivery status updates to /api/sms/status.
 *
 * @param to - Recipient phone number in E.164 format
 * @param body - Message body text
 * @param opts - Optional configuration
 * @param opts.statusCallback - Override the default status callback URL
 * @returns Twilio message SID
 */
export async function sendSMS(
  to: string,
  body: string,
  opts?: { statusCallback?: string }
): Promise<string> {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!messagingServiceSid) {
    throw new Error(
      'TWILIO_MESSAGING_SERVICE_SID environment variable is not set. ' +
      'Create a Messaging Service in Twilio Console -> Messaging -> Services.'
    );
  }

  const client = getTwilio();

  // Determine statusCallback URL
  const statusCallback =
    opts?.statusCallback ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`
      : undefined);

  const message = await client.messages.create({
    to,
    body,
    messagingServiceSid,
    ...(statusCallback ? { statusCallback } : {}),
  });

  return message.sid;
}

/**
 * Validate an incoming Twilio webhook request signature.
 *
 * @param signature - Value of the X-Twilio-Signature header
 * @param url - The full webhook URL configured in Twilio
 * @param params - The POST parameters from the request body
 * @returns true if the request is authentic
 */
export function validateWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not set - cannot validate webhook signature');
    return false;
  }

  return Twilio.validateRequest(authToken, signature, url, params);
}
