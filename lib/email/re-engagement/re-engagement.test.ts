/**
 * Re-engagement reminder unit tests
 * AI-3525: Automated email + text reminders for user engagement
 *
 * Covers the pure helpers added for the text/SMS channel: tier resolution and
 * the SMS body builder (single-segment + opt-out guarantees).
 */

import { describe, it, expect } from 'vitest';
import { tierForInactiveDays } from './detector';
import { getReEngagementSmsBody } from './messages';
import { RE_ENGAGEMENT_MESSAGES } from './types';
import type { ReEngagementTier } from './types';

const TIERS: ReEngagementTier[] = ['day7', 'day14', 'day30'];

describe('tierForInactiveDays', () => {
  it('returns null for active users (< 7 days inactive)', () => {
    expect(tierForInactiveDays(0)).toBeNull();
    expect(tierForInactiveDays(6)).toBeNull();
  });

  it('maps 7-13 days inactive to day7', () => {
    expect(tierForInactiveDays(7)).toBe('day7');
    expect(tierForInactiveDays(13)).toBe('day7');
  });

  it('maps 14-29 days inactive to day14', () => {
    expect(tierForInactiveDays(14)).toBe('day14');
    expect(tierForInactiveDays(29)).toBe('day14');
  });

  it('maps 30+ days inactive to day30 (the terminal tier)', () => {
    expect(tierForInactiveDays(30)).toBe('day30');
    expect(tierForInactiveDays(999)).toBe('day30');
  });
});

describe('RE_ENGAGEMENT_MESSAGES', () => {
  it('has complete email copy for every tier', () => {
    for (const tier of TIERS) {
      const copy = RE_ENGAGEMENT_MESSAGES[tier];
      expect(copy).toBeDefined();
      expect(copy.subject.length).toBeGreaterThan(0);
      expect(copy.fredMessage.length).toBeGreaterThan(0);
      expect(copy.featureHighlight.length).toBeGreaterThan(0);
    }
  });
});

describe('getReEngagementSmsBody', () => {
  it('includes the founder name when it fits in a single segment', () => {
    const body = getReEngagementSmsBody('Sam', 'day7');
    expect(body).toContain('Sam');
    expect(body).toContain('STOP');
  });

  it('keeps the SMS body within one 160-char segment for every tier', () => {
    for (const tier of TIERS) {
      const body = getReEngagementSmsBody('Sam', tier);
      expect(body.length).toBeLessThanOrEqual(160);
    }
  });

  it('falls back to a name-less variant when a long name would overflow', () => {
    const longName = 'A'.repeat(200);
    for (const tier of TIERS) {
      const body = getReEngagementSmsBody(longName, tier);
      expect(body.length).toBeLessThanOrEqual(160);
      expect(body).not.toContain(longName);
    }
  });

  it('always includes the STOP opt-out instruction', () => {
    for (const tier of TIERS) {
      expect(getReEngagementSmsBody('Sam', tier)).toContain('STOP');
    }
  });
});
