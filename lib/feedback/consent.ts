import { RETENTION_DAYS } from './constants'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Calculate expiry date for feedback data (90-day GDPR retention).
 */
export function calculateExpiryDate(fromDate: Date = new Date()): string {
  const expiry = new Date(fromDate)
  expiry.setDate(expiry.getDate() + RETENTION_DAYS)
  return expiry.toISOString()
}

/**
 * Validate that consent was given before storing feedback.
 * Returns the signal data with consent fields populated.
 */
export function applyConsent<T extends { consent_given?: boolean; expires_at?: string | null }>(
  signal: T,
  hasConsent: boolean
): T {
  if (!hasConsent) {
    throw new Error('Feedback cannot be stored without explicit user consent')
  }
  return {
    ...signal,
    consent_given: true,
    expires_at: calculateExpiryDate(),
  }
}

/**
 * Minimize feedback data before AI analysis.
 * Strips PII and keeps only the analytical fields.
 */
export function minimizeForAnalysis(signal: {
  signal_type: string
  rating: number | null
  category: string | null
  comment: string | null
  sentiment_score: number | null
  channel: string
  user_tier: string
}): {
  signal_type: string
  rating: number | null
  category: string | null
  comment_length: number
  sentiment_score: number | null
  channel: string
  user_tier: string
} {
  return {
    signal_type: signal.signal_type,
    rating: signal.rating,
    category: signal.category,
    comment_length: signal.comment?.length ?? 0,
    sentiment_score: signal.sentiment_score,
    channel: signal.channel,
    user_tier: signal.user_tier,
  }
}

/**
 * Check if user has given feedback consent.
 * Reads from user's profile metadata.
 */
export async function getUserConsentStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('metadata')
    .eq('id', userId)
    .single()
  return data?.metadata?.feedback_consent === true
}

/**
 * Set user's feedback consent status.
 */
export async function setUserConsent(
  supabase: SupabaseClient,
  userId: string,
  consent: boolean
): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('metadata')
    .eq('id', userId)
    .single()
  const metadata = {
    ...(existing?.metadata || {}),
    feedback_consent: consent,
    feedback_consent_at: consent ? new Date().toISOString() : null,
  }
  const { error } = await supabase
    .from('profiles')
    .update({ metadata })
    .eq('id', userId)
  if (error) throw error
}
