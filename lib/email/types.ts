/**
 * Email Engagement Types
 * Phase 31: Email Engagement
 *
 * Shared type definitions for the email engagement system.
 */

/** Email categories used across the engagement system */
export type EmailCategory = 'weekly_digest' | 'milestone' | 're_engagement';

/** Result of an email send operation */
export interface EmailSendResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

/** Weekly digest data passed to the digest email template */
export interface DigestData {
  founderName: string;
  weekOf: string;
  stats: DigestStats;
  highlights: DigestHighlight[];
  activeRedFlags: number;
  appUrl: string;
  unsubscribeUrl: string;
}

/** Aggregate activity stats for the digest period */
export interface DigestStats {
  conversationCount: number;
  completedMilestones: number;
  completedTasks: number;
  newJourneyEvents: number;
}

/** A single highlight item in the digest email */
export interface DigestHighlight {
  title: string;
  description: string;
  type: 'milestone' | 'task' | 'event';
}
