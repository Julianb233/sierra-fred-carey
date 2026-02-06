/**
 * SMS Types
 * Phase 04: Studio Tier Features - Plan 05
 *
 * Type definitions for SMS check-in system.
 */

export type SMSDirection = 'outbound' | 'inbound';

export type SMSStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'received';

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
}

export interface UserSMSPreferences {
  userId: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  checkinEnabled: boolean;
  checkinDay: number;
  checkinHour: number;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyCheckinResult {
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
}
