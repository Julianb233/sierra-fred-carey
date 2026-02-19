/**
 * SMS Types
 * Phase 04: Studio Tier Features - Plan 05
 * Phase 61: Twilio SMS Activation - Plan 01
 *
 * Type definitions for SMS check-in system.
 */

export type SMSDirection = 'outbound' | 'inbound';

export type SMSStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'received';

/**
 * Twilio message delivery statuses.
 * @see https://www.twilio.com/docs/messaging/api/message-resource#message-status-values
 */
export type TwilioMessageStatus =
  | 'accepted'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed';

/**
 * Aggregated delivery statistics for reporting.
 */
export interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

export interface CheckinRecord {
  id: string;
  userId: string;
  phoneNumber: string;
  messageSid?: string;
  direction: SMSDirection;
  body: string;
  status: SMSStatus;
  weekNumber: number;
  year: number;
  parentCheckinId?: string;
  accountabilityScore?: Record<string, unknown>;
  sentAt?: Date;
  receivedAt?: Date;
  createdAt: Date;
  deliveryStatus?: string;
  deliveryErrorCode?: string;
  deliveryErrorMessage?: string;
  deliveredAt?: Date;
  statusUpdatedAt?: Date;
}

export interface UserSMSPreferences {
  userId: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  checkinEnabled: boolean;
  checkinDay: number;
  checkinHour: number;
  timezone: string;
  consentedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyCheckinResult {
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
}
