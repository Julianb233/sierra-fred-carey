/**
 * Competitive Analysis Template
 * Target: ~1200 words | Tone: strategic, objective
 */

import type { StrategyTemplate } from '../types';

export const competitiveAnalysisTemplate: StrategyTemplate = {
  type: 'competitive_analysis',
  name: 'Competitive Analysis',
  description:
    'Competitive landscape analysis and positioning strategy',
  totalWordTarget: 1200,
  tone: 'Write in a strategic, objective tone. Acknowledge competitor strengths honestly while identifying genuine opportunities for differentiation.',
  sections: [
    {
      title: 'Competitor Overview',
      prompt:
        'Identify and describe the top 3-5 competitors for {startupName} in the {industry} space. Include direct competitors (same solution, same customer), indirect competitors (different solution, same problem), and potential future entrants.',
      guidelines:
        'Do not dismiss competitors. Investors know who they are. Show that you understand the landscape deeply. Include both startups and incumbents where relevant.',
      maxWords: 240,
    },
    {
      title: 'Feature Comparison Matrix',
      prompt:
        'Compare {startupName} against top competitors across key product dimensions. Cover: core features, pricing approach, target customer, technology advantage, integrations, and support/service level.',
      guidelines:
        'Present this as a structured comparison. Be honest about where competitors are stronger -- credibility comes from honesty, not cheerleading. Highlight areas where {startupName} has a genuine edge.',
      maxWords: 240,
    },
    {
      title: 'Positioning Analysis',
      prompt:
        'Analyze how {startupName} is positioned relative to competitors. Use a 2x2 framework (e.g., price vs. sophistication, SMB vs. enterprise, horizontal vs. vertical) to map the competitive landscape.',
      guidelines:
        'Good positioning is about choosing where NOT to compete. Identify the white space on the map and explain why it is defensible and valuable. Avoid positioning that requires being "better at everything."',
      maxWords: 240,
    },
    {
      title: 'Strengths & Weaknesses',
      prompt:
        'Provide an honest SWOT-style analysis of {startupName} relative to the competitive landscape. Cover: competitive strengths (genuine advantages), weaknesses (honest gaps), opportunities (market openings), threats (competitive risks).',
      guidelines:
        'This is where honesty matters most. Founders who understand their weaknesses can address them. Founders who deny them get blindsided. Be direct and constructive.',
      maxWords: 240,
    },
    {
      title: 'Differentiation Strategy',
      prompt:
        'Recommend a differentiation strategy for {startupName} that is sustainable and defensible. Cover: unique value proposition, competitive moat (network effects, data, switching costs, brand), and strategic responses to competitive moves.',
      guidelines:
        'Differentiation must be real, not aspirational. "Better UX" is not a moat. Data advantages, network effects, and deep domain expertise are. Recommend specific actions to build and defend the competitive position.',
      maxWords: 240,
    },
  ],
};
