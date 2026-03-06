/**
 * Feedback System Types
 *
 * Core type definitions for the feedback signal collection and
 * analysis pipeline. Used across collection, admin dashboard,
 * sentiment analysis, and reporting modules.
 */

export type FeedbackChannel = "chat" | "voice" | "sms" | "whatsapp";

export type FeedbackSignalType = "thumbs" | "detailed" | "sentiment" | "nps";

export type FeedbackCategory =
  | "irrelevant"
  | "incorrect"
  | "too_vague"
  | "too_long"
  | "wrong_tone"
  | "coaching_discomfort"
  | "helpful"
  | "other";

export type SentimentLabel = "positive" | "neutral" | "negative" | "frustrated";

export type UserTier = "free" | "pro" | "studio";

export interface FeedbackSignal {
  id: string;
  user_id: string;
  session_id: string | null;
  message_id: string | null;
  channel: FeedbackChannel;
  signal_type: FeedbackSignalType;
  rating: number | null; // 1 = positive, -1 = negative
  category: FeedbackCategory | null;
  comment: string | null;
  sentiment_score: number | null; // -1 to 1
  sentiment_confidence: number | null; // 0 to 1
  user_tier: UserTier;
  weight: number;
  consent_given: boolean;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSignalInsert {
  user_id: string;
  session_id?: string | null;
  message_id?: string | null;
  channel: FeedbackChannel;
  signal_type: FeedbackSignalType;
  rating?: number | null;
  category?: FeedbackCategory | null;
  comment?: string | null;
  sentiment_score?: number | null;
  sentiment_confidence?: number | null;
  user_tier: UserTier;
  weight?: number;
  consent_given: boolean;
  expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FeedbackSession {
  id: string;
  session_id: string;
  user_id: string;
  channel: FeedbackChannel;
  signal_count: number;
  avg_sentiment: number | null;
  trend: "improving" | "stable" | "degrading" | "spike_negative" | null;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}
