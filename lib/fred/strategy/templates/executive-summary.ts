/**
 * Executive Summary Template
 * Target: ~500 words | Tone: professional, concise, compelling
 */

import type { StrategyTemplate } from '../types';

export const executiveSummaryTemplate: StrategyTemplate = {
  type: 'executive_summary',
  name: 'Executive Summary',
  description:
    'One-page company overview for investor intros and partnerships',
  totalWordTarget: 500,
  tone: 'Write in a professional, concise, and compelling tone. Every sentence must earn its place.',
  sections: [
    {
      title: 'Company Overview',
      prompt:
        'Write a 2-3 sentence company overview for {startupName}. Lead with the value proposition, not the company history. If industry is {industry}, weave it into the positioning.',
      guidelines:
        'Keep this tight -- investors read hundreds of these. Every sentence must earn its place. No fluff, no "revolutionizing" language.',
      maxWords: 75,
    },
    {
      title: 'Problem & Solution',
      prompt:
        'Describe the core problem {startupName} solves and the solution approach. Make the problem feel urgent and the solution feel inevitable.',
      guidelines:
        'Start with the problem, not the solution. The reader should feel the pain before seeing the remedy. Use concrete examples over abstract descriptions.',
      maxWords: 75,
    },
    {
      title: 'Market Opportunity',
      prompt:
        'Outline the market opportunity for {startupName} in the {industry} space. Include realistic market sizing language (TAM/SAM/SOM framework) even if exact numbers need research.',
      guidelines:
        'Be honest about market size. Better to understate and overdeliver. Reference market trends that create tailwinds for the business.',
      maxWords: 75,
    },
    {
      title: 'Business Model',
      prompt:
        'Describe how {startupName} makes money. Be specific about pricing, revenue streams, and unit economics if available.',
      guidelines:
        'Investors want to understand the revenue engine. If the model is subscription-based, say so. If freemium, explain the conversion thesis.',
      maxWords: 60,
    },
    {
      title: 'Traction & Milestones',
      prompt:
        'Highlight key traction metrics and milestones for {startupName}. If early stage ({stage}), focus on validation milestones rather than revenue.',
      guidelines:
        'Numbers talk. If you have users, revenue, or growth metrics, lead with those. If pre-revenue, focus on validation: waitlist, LOIs, pilot customers, partnerships.',
      maxWords: 75,
    },
    {
      title: 'Team',
      prompt:
        'Summarize the founding team behind {startupName}. Highlight relevant experience and why this team is uniquely positioned to win.',
      guidelines:
        'Focus on founder-market fit. What makes this team the right one? Previous exits, domain expertise, and relevant networks matter most.',
      maxWords: 65,
    },
    {
      title: 'Funding & Use of Proceeds',
      prompt:
        'Describe the current funding status and how {startupName} would use additional capital. Be specific about milestones the funding would enable.',
      guidelines:
        'Be direct about the ask. Show that you have a clear plan for deploying capital efficiently. Tie each dollar to a milestone.',
      maxWords: 75,
    },
  ],
};
