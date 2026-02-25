/**
 * Inbound SMS Webhook Handler
 * Phase 04: Studio Tier Features - Plan 05
 * Phase 42: Enhanced with FRED conversation routing
 *
 * Processes inbound SMS messages from Twilio webhook.
 * Handles STOP/START keywords for compliance, stores inbound check-in responses,
 * and routes conversational messages through FRED for mentor responses.
 */

import { logger } from "@/lib/logger";
import { getISOWeek, getISOWeekYear } from 'date-fns';
import {
  findUserByPhoneNumber,
  createCheckin,
  getCheckinByMessageSid,
  updateSMSPreferences,
  getCheckinHistory,
} from '@/lib/db/sms';
import { createServiceClient } from '@/lib/supabase/server';
import { processFredSMS } from '@/lib/sms/fred-sms-handler';

/**
 * Normalize a phone number to E.164 format.
 * Ensures the number starts with '+' and contains only digits after that.
 */
function normalizePhoneNumber(phone: string): string {
  // Remove any non-digit characters except leading '+'
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If it doesn't start with '+', assume US number and add '+1'
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Process an inbound SMS message.
 *
 * 1. Normalize phone number
 * 2. Look up user by phone
 * 3. Handle STOP/START keywords
 * 4. Store inbound check-in response linked to outbound check-in
 *
 * @param from - Sender phone number (from Twilio)
 * @param body - Message body text
 */
export async function processInboundSMS(
  from: string,
  body: string,
  messageSid?: string
): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(from);
  const trimmedBody = body.trim();
  const upperBody = trimmedBody.toUpperCase();

  // Create service client at the top level for all DB operations
  const supabase = createServiceClient();

  // Look up user by phone number
  const user = await findUserByPhoneNumber(supabase, normalizedPhone);
  if (!user) {
    logger.log(
      `[SMS Webhook] Ignoring message from unknown number: ${normalizedPhone}`
    );
    return;
  }

  // Handle STOP keyword - unsubscribe from check-ins
  if (upperBody === 'STOP') {
    logger.log(
      `[SMS Webhook] STOP received from user ${user.userId}, disabling check-ins`
    );
    await updateSMSPreferences(supabase, user.userId, { checkinEnabled: false });
    return;
  }

  // Handle START keyword - re-subscribe to check-ins
  if (upperBody === 'START') {
    logger.log(
      `[SMS Webhook] START received from user ${user.userId}, enabling check-ins`
    );
    await updateSMSPreferences(supabase, user.userId, { checkinEnabled: true });
    return;
  }

  // Get current ISO week for linking to outbound check-in
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = getISOWeekYear(now);

  // Find the most recent outbound check-in for this user this week (to link as parent)
  const recentCheckins = await getCheckinHistory(supabase, user.userId, {
    weekNumber,
    year,
    limit: 1,
  });
  const outboundCheckin = recentCheckins.find((c) => c.direction === 'outbound');

  // Idempotency: if we have a MessageSid, check for duplicate delivery
  if (messageSid) {
    const existing = await getCheckinByMessageSid(supabase, messageSid);
    if (existing) {
      logger.log(
        `[SMS Webhook] Duplicate webhook delivery ignored (MessageSid: ${messageSid})`
      );
      return;
    }
  }

  // Create inbound check-in record
  await createCheckin(supabase, {
    userId: user.userId,
    phoneNumber: normalizedPhone,
    messageSid,
    direction: 'inbound',
    body: trimmedBody,
    status: 'received',
    weekNumber,
    year,
    parentCheckinId: outboundCheckin?.id,
    receivedAt: now,
  });

  logger.log(
    `[SMS Webhook] Stored inbound check-in response from user ${user.userId} (week ${weekNumber}/${year})`
  );

  // Phase 42: Route conversational messages through FRED for mentor response.
  // Messages that look like check-in responses to a recent outbound prompt
  // are handled by the existing check-in flow above. All other messages
  // are treated as FRED conversations and get a mentor response via SMS.
  const isConversational = !outboundCheckin || trimmedBody.length > 50;
  if (isConversational) {
    // Fire-and-forget: process FRED response asynchronously
    processFredSMS(user.userId, normalizedPhone, trimmedBody).catch((err) => {
      logger.log(`[SMS Webhook] FRED SMS processing failed (non-blocking): ${err}`);
    });
  }
}
