/**
 * 30-60-90 Day Plan Template
 * Target: ~1200 words | Tone: action-oriented, specific
 */

import type { StrategyTemplate } from '../types';

export const plan306090Template: StrategyTemplate = {
  type: '30_60_90_plan',
  name: '30-60-90 Day Plan',
  description:
    'Prioritized action roadmap for team alignment and execution',
  totalWordTarget: 1200,
  tone: 'Write in an action-oriented, specific tone. Every item should be concrete and measurable. Avoid vague aspirations.',
  sections: [
    {
      title: 'Current State Assessment',
      prompt:
        'Assess the current state of {startupName} at the {stage} stage in {industry}. Identify the starting point: what exists today, what is working, and what needs immediate attention.',
      guidelines:
        'Be brutally honest about where things stand. A good plan starts with reality, not wishful thinking. Identify the top 3 blockers and the top 3 assets.',
      maxWords: 200,
    },
    {
      title: '30-Day Priorities (Quick Wins & Foundation)',
      prompt:
        'Define the top 5-7 priorities for {startupName} in the first 30 days. Focus on quick wins that build momentum and foundational work that enables the next phases.',
      guidelines:
        'The first 30 days should generate visible progress. Include both "show" items (wins you can point to) and "build" items (infrastructure for later). Each item needs a clear owner and deadline.',
      maxWords: 200,
    },
    {
      title: '60-Day Objectives (Build & Validate)',
      prompt:
        'Define the key objectives for {startupName} from days 31-60. This phase should build on the 30-day foundation and focus on validation and iteration.',
      guidelines:
        'By day 60, you should have validated your core assumptions. Include experiments to run, metrics to track, and decision points. "If X, then Y" contingency thinking is valuable here.',
      maxWords: 200,
    },
    {
      title: '90-Day Goals (Scale & Measure)',
      prompt:
        'Define the 90-day goals for {startupName}. This phase should translate validated learnings into scalable processes and measurable outcomes.',
      guidelines:
        'The 90-day mark is the first real checkpoint. What does success look like? Be specific: revenue targets, user counts, feature completeness, team hires. Avoid "continue to grow" language.',
      maxWords: 200,
    },
    {
      title: 'Key Metrics to Track',
      prompt:
        'Define 6-8 key metrics that {startupName} should track across the 90-day period. Include leading indicators (predictive) and lagging indicators (outcome-based).',
      guidelines:
        'Pick metrics that drive behavior, not vanity metrics. Include both quantitative (MRR, DAU, conversion rate) and qualitative (NPS, customer feedback themes). Show baseline and target for each.',
      maxWords: 200,
    },
    {
      title: 'Resource Requirements',
      prompt:
        'Outline the resources {startupName} needs to execute this 90-day plan. Include team, budget, tools, and external support (advisors, contractors, partners).',
      guidelines:
        'Be realistic about what it takes. Underfunded plans fail. Include both must-haves and nice-to-haves with clear prioritization. Show that you understand the true cost of execution.',
      maxWords: 200,
    },
  ],
};
