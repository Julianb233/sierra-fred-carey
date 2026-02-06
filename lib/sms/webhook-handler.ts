/**
 * Inbound SMS Webhook Handler
 * Phase 04: Studio Tier Features - Plan 05
 *
 * Processes inbound SMS messages from Twilio webhook.
 * Handles STOP/START keywords for compliance and stores inbound check-in responses.
 */

import { getISOWeek, getISOWeekYear } from 'date-fns';
import {
  findUserByPhoneNumber,
  createCheckin,
  updateSMSPreferences,
  getCheckinHistory,
} from '@/lib/db/sms';

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
  body: string
): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(from);
  const trimmedBody = body.trim();
  const upperBody = trimmedBody.toUpperCase();

  // Look up user by phone number
  const user = await findUserByPhoneNumber(normalizedPhone);
  if (!user) {
    console.log(
      `[SMS Webhook] Ignoring message from unknown number: ${normalizedPhone}`
    );
    return;
  }

  // Handle STOP keyword - unsubscribe from check-ins
  if (upperBody === 'STOP') {
    console.log(
      `[SMS Webhook] STOP received from user ${user.userId}, disabling check-ins`
    );
    await updateSMSPreferences(user.userId, { checkinEnabled: false });
    return;
  }

  // Handle START keyword - re-subscribe to check-ins
  if (upperBody === 'START') {
    console.log(
      `[SMS Webhook] START received from user ${user.userId}, enabling check-ins`
    );
    await updateSMSPreferences(user.userId, { checkinEnabled: true });
    return;
  }

  // Get current ISO week for linking to outbound check-in
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = getISOWeekYear(now);

  // Find the most recent outbound check-in for this user this week (to link as parent)
  const recentCheckins = await getCheckinHistory(user.userId, {
    weekNumber,
    year,
    limit: 1,
  });
  const outboundCheckin = recentCheckins.find((c) => c.direction === 'outbound');

  // Create inbound check-in record
  await createCheckin({
    userId: user.userId,
    phoneNumber: normalizedPhone,
    direction: 'inbound',
    body: trimmedBody,
    status: 'received',
    weekNumber,
    year,
    parentCheckinId: outboundCheckin?.id,
    receivedAt: now,
  });

  console.log(
    `[SMS Webhook] Stored inbound check-in response from user ${user.userId} (week ${weekNumber}/${year})`
  );
}
