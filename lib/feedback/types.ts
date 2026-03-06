/**
 * Feedback Collection Types
 *
 * Phase 72-01: Core type definitions for the FRED chat feedback system.
 * Thumbs up/down on assistant messages with optional free-text comments.
 */

// ---------------------------------------------------------------------------
// Feedback signal
// ---------------------------------------------------------------------------

/** The binary feedback signal a user can submit */
export type FeedbackSignal = "thumbs_up" | "thumbs_down"

/** Where the feedback was collected from */
export type FeedbackSource = "chat" | "voice" | "inline"

// ---------------------------------------------------------------------------
// Feedback record (matches future Supabase table shape)
// ---------------------------------------------------------------------------

export interface FeedbackRecord {
  /** Unique feedback ID (UUID) */
  id: string
  /** User who submitted the feedback */
  user_id: string
  /** The FRED message ID being rated */
  message_id: string
  /** Chat session ID for context grouping */
  session_id: string
  /** The binary signal */
  signal: FeedbackSignal
  /** Optional free-text comment (max 500 chars) */
  comment?: string
  /** Source of the feedback interaction */
  source: FeedbackSource
  /** ISO timestamp when feedback was submitted */
  created_at: string
}

// ---------------------------------------------------------------------------
// API request / response
// ---------------------------------------------------------------------------

export interface SubmitFeedbackRequest {
  message_id: string
  session_id: string
  signal: FeedbackSignal
  comment?: string
  source?: FeedbackSource
}

export interface SubmitFeedbackResponse {
  success: boolean
  id?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Client-side feedback state per message
// ---------------------------------------------------------------------------

export interface MessageFeedbackState {
  /** Current signal (null = no feedback yet) */
  signal: FeedbackSignal | null
  /** Whether the comment form is open */
  isCommentOpen: boolean
  /** The comment text being drafted */
  comment: string
  /** Whether a submission is in flight */
  isSubmitting: boolean
  /** Whether feedback has been successfully submitted */
  isSubmitted: boolean
}
