/**
 * Feedback Collection Constants
 *
 * Phase 72-01: Shared constants for the feedback system.
 */

/** Maximum length for feedback comments */
export const MAX_COMMENT_LENGTH = 500

/** Debounce delay (ms) before submitting feedback after signal click */
export const FEEDBACK_SUBMIT_DELAY = 300

/** API endpoint for submitting feedback */
export const FEEDBACK_API_ENDPOINT = "/api/feedback"

/** Comment placeholder prompts based on signal type */
export const COMMENT_PLACEHOLDERS = {
  thumbs_up: "What was helpful about this response? (optional)",
  thumbs_down: "How could this response be improved? (optional)",
} as const

/** Analytics event names for feedback interactions */
export const FEEDBACK_EVENTS = {
  SIGNAL_SUBMITTED: "feedback.signal_submitted",
  COMMENT_SUBMITTED: "feedback.comment_submitted",
  COMMENT_OPENED: "feedback.comment_opened",
  SIGNAL_CHANGED: "feedback.signal_changed",
} as const

/** Toast messages shown after feedback submission */
export const FEEDBACK_TOASTS = {
  SUCCESS: "Thanks for your feedback!",
  ERROR: "Could not save feedback. Please try again.",
  COMMENT_SUCCESS: "Comment added. Thank you!",
} as const
