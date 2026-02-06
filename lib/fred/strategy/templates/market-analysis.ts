/**
 * Market Analysis Template
 * Target: ~1500 words | Tone: analytical, data-driven
 */

import type { StrategyTemplate } from '../types';

export const marketAnalysisTemplate: StrategyTemplate = {
  type: 'market_analysis',
  name: 'Market Analysis',
  description:
    'Deep dive on market opportunity, size, trends, and entry strategy',
  totalWordTarget: 1500,
  tone: 'Write in an analytical, data-driven tone. Back claims with reasoning and market logic. Be specific and substantive.',
  sections: [
    {
      title: 'Market Definition',
      prompt:
        'Define the market that {startupName} operates in within the {industry} space. Clearly delineate the boundaries: what is included, what is adjacent, and what is out of scope.',
      guidelines:
        'A well-defined market is the foundation of credible analysis. Avoid overly broad definitions ("the global SaaS market") and overly narrow ones. Find the Goldilocks zone.',
      maxWords: 250,
    },
    {
      title: 'Market Size (TAM/SAM/SOM)',
      prompt:
        'Estimate the Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM) for {startupName}. Use bottom-up methodology where possible.',
      guidelines:
        'Investors value bottom-up sizing over top-down. Show your math: number of potential customers x average revenue per customer = market size. Reference credible sources or comparable businesses for validation.',
      maxWords: 250,
    },
    {
      title: 'Market Trends & Drivers',
      prompt:
        'Identify 3-5 key trends driving the market for {startupName}. Include technology shifts, regulatory changes, consumer behavior changes, and macroeconomic factors.',
      guidelines:
        'Focus on trends that create tailwinds for the specific business, not generic "digital transformation" claims. Each trend should have a clear connection to why it benefits the startup.',
      maxWords: 250,
    },
    {
      title: 'Customer Segments',
      prompt:
        'Identify and describe the primary customer segments for {startupName}. Include demographics, psychographics, pain points, and buying behavior for each segment.',
      guidelines:
        'Be specific about who the ideal customer is. "Small businesses" is too vague. "B2B SaaS companies with 10-50 employees who spend $5K+/month on marketing tools" is actionable.',
      maxWords: 250,
    },
    {
      title: 'Competitive Landscape',
      prompt:
        'Map the competitive landscape for {startupName} in {industry}. Include direct competitors, indirect competitors, and potential future entrants. Identify gaps and opportunities.',
      guidelines:
        'Be honest about competition. "We have no competitors" is a red flag, not a strength. Show awareness of the landscape and articulate clear differentiation.',
      maxWords: 250,
    },
    {
      title: 'Market Entry Strategy',
      prompt:
        'Recommend a market entry strategy for {startupName} at the {stage} stage. Include beachhead market selection, go-to-market approach, and expansion path.',
      guidelines:
        'Start small and focused. Pick a beachhead market where you can win decisively, then expand. Reference the Bowling Pin Strategy or similar frameworks for credibility.',
      maxWords: 250,
    },
  ],
};
