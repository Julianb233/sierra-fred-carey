import { describe, it, expect } from 'vitest'
import { calculateExpiryDate, applyConsent, minimizeForAnalysis } from '../consent'
import { RETENTION_DAYS } from '../constants'

describe('calculateExpiryDate', () => {
  it('returns a date RETENTION_DAYS in the future', () => {
    const from = new Date('2026-01-01T00:00:00Z')
    const result = calculateExpiryDate(from)
    const expected = new Date('2026-01-01T00:00:00Z')
    expected.setDate(expected.getDate() + RETENTION_DAYS)
    expect(result).toBe(expected.toISOString())
  })

  it('defaults to now when no date provided', () => {
    const before = new Date()
    const result = calculateExpiryDate()
    const parsed = new Date(result)
    // Should be approximately RETENTION_DAYS from now (within 1 second)
    const diffDays = (parsed.getTime() - before.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(RETENTION_DAYS, 0)
  })
})

describe('applyConsent', () => {
  it('adds consent fields when consent is true', () => {
    const signal = { signal_type: 'thumbs_up' as const }
    const result = applyConsent(signal, true)
    expect(result.consent_given).toBe(true)
    expect(result.expires_at).toBeDefined()
    expect(typeof result.expires_at).toBe('string')
  })

  it('throws when consent is false', () => {
    const signal = { signal_type: 'thumbs_up' as const }
    expect(() => applyConsent(signal, false)).toThrow(
      'Feedback cannot be stored without explicit user consent'
    )
  })

  it('preserves existing signal fields', () => {
    const signal = {
      signal_type: 'sentiment' as const,
      rating: 1 as const,
      category: 'helpful' as const,
    }
    const result = applyConsent(signal, true)
    expect(result.signal_type).toBe('sentiment')
    expect(result.rating).toBe(1)
    expect(result.category).toBe('helpful')
  })
})

describe('minimizeForAnalysis', () => {
  it('strips comment text and keeps only length', () => {
    const signal = {
      signal_type: 'thumbs_down',
      rating: -1 as const,
      category: 'too_long' as const,
      comment: 'This response was way too verbose and not helpful',
      sentiment_score: -0.5,
      channel: 'chat',
      user_tier: 'pro',
    }
    const result = minimizeForAnalysis(signal)
    expect(result).not.toHaveProperty('comment')
    expect(result.comment_length).toBe(signal.comment.length)
    expect(result.signal_type).toBe('thumbs_down')
    expect(result.rating).toBe(-1)
    expect(result.category).toBe('too_long')
    expect(result.sentiment_score).toBe(-0.5)
    expect(result.channel).toBe('chat')
    expect(result.user_tier).toBe('pro')
  })

  it('handles null comment', () => {
    const signal = {
      signal_type: 'implicit',
      rating: null,
      category: null,
      comment: null,
      sentiment_score: null,
      channel: 'voice',
      user_tier: 'free',
    }
    const result = minimizeForAnalysis(signal)
    expect(result.comment_length).toBe(0)
  })
})
