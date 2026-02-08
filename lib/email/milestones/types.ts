/**
 * Milestone Email Types
 * Phase 31-02: Email Engagement
 */

export type MilestoneType =
  | 'first_chat'
  | 'first_reality_lens'
  | 'first_pitch_review'
  | 'ten_conversations'
  | 'irs_above_70'
  | 'first_strategy_doc'
  | 'milestone_completed';

export interface MilestoneEmailData {
  founderName: string;
  milestoneTitle: string;
  milestoneDescription: string;
  milestoneType: MilestoneType;
  fredQuote: string;
  nextSuggestion: string;
  appUrl: string;
  unsubscribeUrl: string;
}

export const MILESTONE_MESSAGES: Record<
  MilestoneType,
  { title: string; description: string; nextSuggestion: string }
> = {
  first_chat: {
    title: 'Your First FRED Conversation!',
    description:
      "You've taken the first step on your founder journey by chatting with FRED. Great conversations lead to great companies.",
    nextSuggestion: 'Try a Reality Lens analysis to get honest feedback on your idea.',
  },
  first_reality_lens: {
    title: 'Reality Check Complete!',
    description:
      "You've run your first Reality Lens analysis. Knowing where you stand is the foundation of progress.",
    nextSuggestion: 'Review your red flags dashboard to address any risks.',
  },
  first_pitch_review: {
    title: 'Pitch Deck Reviewed!',
    description:
      "You've put your pitch through FRED's review. Every revision brings you closer to the deck that closes the round.",
    nextSuggestion: 'Check your Investor Readiness Score to see where you stand.',
  },
  ten_conversations: {
    title: '10 Conversations with FRED!',
    description:
      "You've had 10 meaningful conversations with FRED. That's the kind of consistency that builds great companies.",
    nextSuggestion: 'Check your Investor Readiness Score to see your progress.',
  },
  irs_above_70: {
    title: 'Investor Readiness Score Above 70!',
    description:
      "Your IRS is above 70 — you're in strong territory. Keep pushing to optimize your position.",
    nextSuggestion: 'Explore the Strategy Document Builder to formalize your approach.',
  },
  first_strategy_doc: {
    title: 'First Strategy Document Created!',
    description:
      "You've created your first strategy document. Having a written strategy separates dreamers from builders.",
    nextSuggestion: 'Share it with your co-founder or advisor for feedback.',
  },
  milestone_completed: {
    title: 'Milestone Achieved!',
    description:
      "You've completed a milestone on your journey. Every milestone is proof that you're making progress.",
    nextSuggestion: 'Set your next milestone on the Journey Dashboard.',
  },
};
