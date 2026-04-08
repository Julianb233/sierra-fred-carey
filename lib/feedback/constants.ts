export const FEEDBACK_CATEGORIES = ['irrelevant', 'incorrect', 'too_vague', 'too_long', 'wrong_tone', 'coaching_discomfort', 'helpful', 'other'] as const
export const FEEDBACK_CHANNELS = ['chat', 'voice', 'sms', 'whatsapp'] as const
export const SIGNAL_TYPES = ['thumbs_up', 'thumbs_down', 'sentiment', 'implicit'] as const
export const INSIGHT_STATUSES = ['new', 'reviewed', 'actioned', 'resolved', 'communicated'] as const
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export const TIER_WEIGHTS = { free: 1.0, pro: 3.0, studio: 5.0 } as const

// Sender role weights — multiplied with tier weight for final signal weight.
// Product owner (Fred Cary) gets 5x priority per AI-4111.
export const SENDER_ROLES = ['user', 'team', 'product_owner'] as const
export type SenderRole = typeof SENDER_ROLES[number]
export const ROLE_WEIGHTS: Record<SenderRole, number> = {
  user: 1.0,
  team: 2.0,
  product_owner: 5.0,
} as const

// Map known email addresses to sender roles.
// Fred Cary is the product owner/CEO — his feedback gets highest priority.
export const KNOWN_SENDER_ROLES: Record<string, SenderRole> = {
  'fred@joinsahara.com': 'product_owner',
  'fred@astartupbiz.com': 'product_owner',
  'fredcary@gmail.com': 'product_owner',
} as const
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
