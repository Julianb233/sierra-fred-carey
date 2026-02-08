/**
 * Resend Email Client Singleton
 * Phase 31: Email Engagement
 *
 * Lazy-initialized Resend client following the project's existing
 * singleton pattern (see lib/push/preferences.ts, lib/supabase/server.ts).
 *
 * Returns null when RESEND_API_KEY is not configured, allowing callers
 * to gracefully degrade in environments without email credentials.
 */

import { Resend } from 'resend';

let _client: Resend | null = null;

/**
 * Get the shared Resend client instance.
 * Returns null if RESEND_API_KEY is not set.
 */
export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (_client) return _client;
  _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}
