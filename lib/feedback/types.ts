export interface FeedbackSignal {
  id: string
  user_id: string
  session_id: string | null
  message_id: string | null
  channel: 'chat' | 'voice' | 'sms' | 'whatsapp'
  signal_type: 'thumbs_up' | 'thumbs_down' | 'sentiment' | 'implicit'
  rating: -1 | 0 | 1 | null
  category: 'irrelevant' | 'incorrect' | 'too_vague' | 'too_long' | 'wrong_tone' | 'coaching_discomfort' | 'helpful' | 'other' | null
  comment: string | null
  sentiment_score: number | null
  sentiment_confidence: number | null
  user_tier: 'free' | 'pro' | 'studio'
  weight: number
  consent_given: boolean
  expires_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface FeedbackSession {
  id: string
  user_id: string
  channel: 'chat' | 'voice' | 'sms' | 'whatsapp'
  started_at: string
  ended_at: string | null
  message_count: number
  sentiment_avg: number | null
  sentiment_trend: 'improving' | 'stable' | 'degrading' | 'spike_negative' | null
  flagged: boolean
  flag_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface FeedbackInsight {
  id: string
  insight_type: 'pattern' | 'cluster' | 'trend' | 'anomaly'
  title: string
  description: string | null
  category: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  signal_count: number
  signal_ids: string[]
  status: 'new' | 'reviewed' | 'actioned' | 'resolved' | 'communicated'
  linear_issue_id: string | null
  actioned_at: string | null
  resolved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Insert types (omit server-generated fields)
export type FeedbackSignalInsert = Omit<FeedbackSignal, 'id' | 'created_at'>
export type FeedbackSessionInsert = Omit<FeedbackSession, 'id' | 'created_at' | 'updated_at'>
export type FeedbackInsightInsert = Omit<FeedbackInsight, 'id' | 'created_at' | 'updated_at'>
