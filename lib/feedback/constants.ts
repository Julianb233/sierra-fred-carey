export const FEEDBACK_CATEGORIES = ['irrelevant', 'incorrect', 'too_vague', 'too_long', 'wrong_tone', 'coaching_discomfort', 'helpful', 'other'] as const
export const FEEDBACK_CHANNELS = ['chat', 'voice', 'sms', 'whatsapp'] as const
export const SIGNAL_TYPES = ['thumbs_up', 'thumbs_down', 'sentiment', 'implicit'] as const
export const INSIGHT_STATUSES = ['new', 'reviewed', 'actioned', 'resolved', 'communicated'] as const
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export const TIER_WEIGHTS = { free: 1.0, builder: 2.0, pro: 3.0, studio: 5.0 } as const
export const RETENTION_DAYS = 90
export const MIN_MESSAGES_FOR_FEEDBACK = 5
export const MAX_DETAILED_FEEDBACK_PER_WEEK = 1
export const MAX_COMMENT_LENGTH = 500
export const FEEDBACK_API_ENDPOINT = '/api/feedback'

export const FEEDBACK_EVENTS = {
  THUMBS_UP: 'feedback_thumbs_up',
  THUMBS_DOWN: 'feedback_thumbs_down',
  COMMENT_OPENED: 'feedback_comment_opened',
  COMMENT_SUBMITTED: 'feedback_comment_submitted',
  SIGNAL_CHANGED: 'feedback_signal_changed',
  SIGNAL_SUBMITTED: 'feedback_signal_submitted',
} as const

export const FEEDBACK_TOASTS = {
  SUCCESS: 'Thanks for your feedback!',
  ERROR: 'Failed to submit feedback. Please try again.',
  ALREADY_SUBMITTED: 'You already submitted feedback for this message.',
} as const

export const COMMENT_PLACEHOLDERS = [
  'What could FRED have done better?',
  'Tell us more about your experience...',
  'How can we improve this response?',
] as const
