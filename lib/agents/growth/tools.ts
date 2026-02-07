/**
 * Growth Agent Tools
 * Phase 04: Studio Tier Features - Plan 04
 *
 * Four domain tools for the Growth specialist agent:
 * 1. channelAnalysis - Evaluate and rank acquisition channels by ROI
 * 2. experimentDesign - Create A/B test hypotheses with success metrics
 * 3. funnelAnalysis - Identify conversion bottlenecks and optimizations
 * 4. contentStrategy - Growth-oriented content planning tied to acquisition
 *
 * Uses Vercel AI SDK `tool()` with Zod schemas for structured I/O.
 * AI-powered tools use `generateStructuredReliable` from fred-client.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateStructuredReliable } from '@/lib/ai/fred-client';
import { FRED_AGENT_VOICE } from "@/lib/agents/fred-agent-voice";

// ============================================================================
// Zod Schemas for Tool Parameters
// ============================================================================

const channelAnalysisParams = z.object({
  currentChannels: z.array(
    z.object({
      name: z.string().describe('Channel name (e.g., "Google Ads", "LinkedIn Outreach")'),
      spend: z.number().optional().describe('Monthly spend in USD'),
      results: z.string().optional().describe('Current results description'),
    })
  ).describe('Current acquisition channels being used'),
  stage: z.enum(['pre-seed', 'seed', 'series-a']).describe('Startup funding stage'),
  monthlyBudget: z.number().describe('Total monthly growth budget in USD'),
  targetCustomerProfile: z.string().describe('Description of target customer'),
});

const experimentDesignParams = z.object({
  hypothesis: z.string().describe('What you believe will happen'),
  metric: z.string().describe('Primary metric to measure'),
  currentBaseline: z.string().optional().describe('Current value of the metric'),
  channel: z.string().describe('Channel or area for the experiment'),
  budget: z.number().optional().describe('Budget allocated for the experiment in USD'),
});

const funnelAnalysisParams = z.object({
  stages: z.array(
    z.object({
      name: z.string().describe('Funnel stage name'),
      visitors: z.number().describe('Number entering this stage'),
      conversions: z.number().describe('Number converting to next stage'),
    })
  ).describe('Funnel stages with visitor and conversion counts'),
  product: z.string().describe('Product or service being analyzed'),
  pricingModel: z.string().describe('Pricing model (e.g., "freemium", "subscription", "one-time")'),
});

const contentStrategyParams = z.object({
  targetAudience: z.string().describe('Who the content is for'),
  product: z.string().describe('Product or service'),
  currentContent: z.array(z.string()).optional().describe('Current content types being produced'),
  goals: z.array(z.string()).describe('Content marketing goals'),
});

// ============================================================================
// Zod Schemas for Tool Outputs
// ============================================================================

const channelAnalysisOutput = z.object({
  rankedChannels: z.array(
    z.object({
      channel: z.string(),
      score: z.number().min(0).max(100),
      estimatedCAC: z.string(),
      timeToResults: z.string(),
      reasoning: z.string(),
    })
  ),
  newChannelSuggestions: z.array(
    z.object({
      channel: z.string(),
      why: z.string(),
      firstStep: z.string(),
    })
  ),
  budgetAllocation: z.array(
    z.object({
      channel: z.string(),
      percentage: z.number(),
    })
  ),
});

const experimentDesignOutput = z.object({
  experimentName: z.string(),
  hypothesis: z.string(),
  controlGroup: z.string(),
  testGroup: z.string(),
  primaryMetric: z.string(),
  secondaryMetrics: z.array(z.string()),
  sampleSizeNeeded: z.number(),
  durationDays: z.number(),
  successCriteria: z.string(),
  implementationSteps: z.array(z.string()),
});

const funnelAnalysisOutput = z.object({
  overallConversionRate: z.string(),
  biggestDropoff: z.object({
    stage: z.string(),
    dropRate: z.string(),
    likelyCauses: z.array(z.string()),
  }),
  optimizations: z.array(
    z.object({
      stage: z.string(),
      suggestion: z.string(),
      expectedImpact: z.string(),
      effort: z.enum(['low', 'medium', 'high']),
    })
  ),
  benchmarkComparison: z.string(),
});

const contentStrategyOutput = z.object({
  pillars: z.array(
    z.object({
      topic: z.string(),
      why: z.string(),
      formats: z.array(z.string()),
    })
  ),
  calendarSuggestions: z.array(
    z.object({
      week: z.number(),
      title: z.string(),
      format: z.string(),
      distribution: z.array(z.string()),
    })
  ),
  quickWins: z.array(z.string()),
});

// ============================================================================
// Type Aliases for Execute Callbacks
// ============================================================================

type ChannelAnalysisInput = z.infer<typeof channelAnalysisParams>;
type ExperimentDesignInput = z.infer<typeof experimentDesignParams>;
type FunnelAnalysisInput = z.infer<typeof funnelAnalysisParams>;
type ContentStrategyInput = z.infer<typeof contentStrategyParams>;

// ============================================================================
// Tool Definitions
// ============================================================================

export const growthTools = {
  channelAnalysis: tool({
    description:
      'Analyze current acquisition channels, rank them by ROI, suggest new channels, and recommend budget allocation. Use this when founders need help deciding where to spend their growth budget.',
    inputSchema: channelAnalysisParams,
    execute: async (input: ChannelAnalysisInput) => {
      const prompt = `Analyze these growth channels for a ${input.stage} startup with $${input.monthlyBudget}/month budget.

Target customer: ${input.targetCustomerProfile}

Current channels:
${input.currentChannels
  .map(
    (ch: ChannelAnalysisInput['currentChannels'][number]) =>
      `- ${ch.name}${ch.spend ? ` ($${ch.spend}/mo)` : ''}${ch.results ? `: ${ch.results}` : ''}`
  )
  .join('\n')}

Rank existing channels by effectiveness, suggest 2-3 new channels to test, and recommend a budget allocation. Consider the startup stage -- ${input.stage} companies have different channel fit than later-stage companies.`;

      const result = await generateStructuredReliable(prompt, channelAnalysisOutput, {
        system:
          `${FRED_AGENT_VOICE} Provide practical, stage-appropriate channel analysis. Be specific about CAC estimates and timelines.`,
        temperature: 0.4,
      });

      return result.object;
    },
  }),

  experimentDesign: tool({
    description:
      'Design a rigorous A/B test or growth experiment with clear hypothesis, control/test groups, sample size, duration, and success criteria. Use this when founders want to test a growth idea.',
    inputSchema: experimentDesignParams,
    execute: async (input: ExperimentDesignInput) => {
      const prompt = `Design a growth experiment for this hypothesis:

Hypothesis: ${input.hypothesis}
Primary metric: ${input.metric}
${input.currentBaseline ? `Current baseline: ${input.currentBaseline}` : ''}
Channel: ${input.channel}
${input.budget ? `Budget: $${input.budget}` : ''}

Create a rigorous experiment design with control/test groups, required sample size for statistical significance, timeline, and clear success criteria. Include step-by-step implementation instructions.`;

      const result = await generateStructuredReliable(prompt, experimentDesignOutput, {
        system:
          `${FRED_AGENT_VOICE} Design experiments that are statistically valid and practically executable for startups. Always specify sample sizes needed for significance.`,
        temperature: 0.3,
      });

      return result.object;
    },
  }),

  funnelAnalysis: tool({
    description:
      'Analyze a conversion funnel to identify the biggest dropoff points, likely causes, and optimization suggestions ranked by effort and impact. Use this when founders need to improve their conversion rates.',
    inputSchema: funnelAnalysisParams,
    execute: async (input: FunnelAnalysisInput) => {
      const prompt = `Analyze this conversion funnel for a ${input.pricingModel} product (${input.product}):

Funnel stages:
${input.stages
  .map(
    (s: FunnelAnalysisInput['stages'][number]) =>
      `- ${s.name}: ${s.visitors} visitors -> ${s.conversions} conversions (${((s.conversions / s.visitors) * 100).toFixed(1)}%)`
  )
  .join('\n')}

Identify the biggest dropoff, likely causes, and provide actionable optimizations sorted by effort level. Compare to industry benchmarks for ${input.pricingModel} products.`;

      const result = await generateStructuredReliable(prompt, funnelAnalysisOutput, {
        system:
          `${FRED_AGENT_VOICE} Provide specific, data-driven funnel analysis with actionable recommendations. Reference industry benchmarks.`,
        temperature: 0.3,
      });

      return result.object;
    },
  }),

  contentStrategy: tool({
    description:
      'Create a content strategy with content pillars, a 4-week calendar, and quick-win content ideas tied to acquisition goals. Use this when founders need a growth-oriented content plan.',
    inputSchema: contentStrategyParams,
    execute: async (input: ContentStrategyInput) => {
      const prompt = `Create a growth-oriented content strategy:

Product: ${input.product}
Target audience: ${input.targetAudience}
${input.currentContent?.length ? `Current content: ${input.currentContent.join(', ')}` : 'No current content strategy'}
Goals: ${input.goals.join(', ')}

Design content pillars, a 4-week content calendar with distribution channels, and identify quick wins that can drive growth immediately. Focus on content that drives acquisition, not just brand awareness.`;

      const result = await generateStructuredReliable(prompt, contentStrategyOutput, {
        system:
          `${FRED_AGENT_VOICE} Create practical content plans that directly tie to acquisition and conversion goals. Prioritize distribution as much as creation.`,
        temperature: 0.5,
      });

      return result.object;
    },
  }),
};
