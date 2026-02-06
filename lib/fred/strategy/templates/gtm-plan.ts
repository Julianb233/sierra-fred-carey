/**
 * Go-to-Market Plan Template
 * Target: ~1500 words | Tone: tactical, execution-focused
 */

import type { StrategyTemplate } from '../types';

export const gtmPlanTemplate: StrategyTemplate = {
  type: 'gtm_plan',
  name: 'Go-to-Market Plan',
  description:
    'Go-to-market strategy with channels, pricing, and launch plan',
  totalWordTarget: 1500,
  tone: 'Write in a tactical, execution-focused tone. Be specific about actions, timelines, and expected outcomes. No hand-waving.',
  sections: [
    {
      title: 'Target Customer Profile (ICP)',
      prompt:
        'Define the Ideal Customer Profile for {startupName} in the {industry} space. Include firmographics (company size, industry, geography), demographics (decision maker role, seniority), and psychographics (pain points, goals, buying behavior).',
      guidelines:
        'The more specific the ICP, the more focused the go-to-market can be. "Everyone" is not a customer segment. Define who you are targeting in the first 12 months -- you can expand later.',
      maxWords: 250,
    },
    {
      title: 'Value Proposition',
      prompt:
        'Articulate the core value proposition for {startupName}. Use the Value Proposition Canvas framework: what customer jobs are you helping with, what pains are you relieving, what gains are you creating?',
      guidelines:
        'A great value proposition is specific, differentiated, and testable. Avoid generic claims like "save time and money." Instead: "Reduce customer onboarding time from 2 weeks to 2 hours."',
      maxWords: 250,
    },
    {
      title: 'Channel Strategy',
      prompt:
        'Recommend the top 3-5 customer acquisition channels for {startupName} at the {stage} stage. For each channel: explain why it fits, estimated CAC, expected timeline to results, and key tactics.',
      guidelines:
        'Start with channels that give fast feedback loops. Content marketing takes 6+ months; founder-led sales gives feedback in days. Match channel choice to stage and budget. Include both paid and organic.',
      maxWords: 250,
    },
    {
      title: 'Pricing Strategy',
      prompt:
        'Recommend a pricing strategy for {startupName}. Cover: pricing model (subscription, usage-based, freemium, etc.), price points, packaging/tiers, and competitive pricing context.',
      guidelines:
        'Price is a signal, not just a number. Cheap signals "not serious." Expensive signals "enterprise." Match pricing to your ICP and positioning. Include rationale for the chosen model.',
      maxWords: 250,
    },
    {
      title: 'Launch Plan & Timeline',
      prompt:
        'Create a phased launch plan for {startupName}. Cover: pre-launch (building anticipation), launch (first customers), and post-launch (iteration and expansion). Include specific milestones and timelines.',
      guidelines:
        'A good launch plan has clear phases with specific deliverables. Include both marketing activities and operational readiness. What needs to be true before launch? Build backward from the launch date.',
      maxWords: 250,
    },
    {
      title: 'Success Metrics & KPIs',
      prompt:
        'Define the key metrics and KPIs for measuring go-to-market success for {startupName}. Include acquisition metrics, activation metrics, revenue metrics, and efficiency metrics.',
      guidelines:
        'Pick 5-7 metrics that matter most. Include targets for 30, 60, and 90 days post-launch. Every metric should drive a specific decision: "If CAC exceeds $X, we will switch from Channel A to Channel B."',
      maxWords: 250,
    },
  ],
};
