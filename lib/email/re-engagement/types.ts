/**
 * Re-engagement Email Types
 * Phase 31-02: Email Engagement
 */

export type ReEngagementTier = 'day7' | 'day14' | 'day30';

export interface ReEngagementCandidate {
  userId: string;
  email: string;
  name: string;
  inactiveDays: number;
  tier: ReEngagementTier;
}

export interface ReEngagementEmailData {
  founderName: string;
  tier: ReEngagementTier;
  inactiveDays: number;
  fredMessage: string;
  featureHighlight: string;
  appUrl: string;
  unsubscribeUrl: string;
}

export const RE_ENGAGEMENT_MESSAGES: Record<
  ReEngagementTier,
  { subject: string; fredMessage: string; featureHighlight: string }
> = {
  day7: {
    subject: 'FRED misses you',
    fredMessage:
      "It's been a week since we last connected. Progress isn't always linear, but consistency is what separates the builders from the dreamers. I'm here whenever you're ready to pick up where we left off.",
    featureHighlight:
      "Since you've been away, we've been working on new features to help you move faster. Come check out what's new on your dashboard.",
  },
  day14: {
    subject: 'Your startup journey is waiting',
    fredMessage:
      "Two weeks is a long time in startup-land. The founders who make it aren't the ones who never take breaks — they're the ones who come back. Your progress is still saved, your milestones are still tracked, and I still remember where we left off.",
    featureHighlight:
      "Have you tried our Reality Lens analysis yet? It gives you honest, data-driven feedback on your startup's position — the kind of feedback most founders pay thousands for.",
  },
  day30: {
    subject: 'One more thing before you go',
    fredMessage:
      "It's been a month, and I want you to know — no pressure at all. Building a startup is hard, and sometimes you need to step back to see the bigger picture. If you ever want to pick things up again, everything is exactly where you left it.",
    featureHighlight:
      "Your founder community is growing. Other founders on Sahara are sharing insights and pushing forward. Your journey is still here when you're ready.",
  },
};
