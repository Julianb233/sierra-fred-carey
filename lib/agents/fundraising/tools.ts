/**
 * Fundraising Agent Tools
 * Phase 04: Studio Tier Features
 *
 * Domain-specific tools for the Fundraising specialist agent:
 * 1. investorResearch - Find relevant investors by criteria
 * 2. outreachDraft - Draft investor outreach emails
 * 3. pipelineAnalysis - Analyze and prioritize fundraising pipeline
 * 4. meetingPrep - Prepare for investor meetings
 *
 * All tools use generateStructuredReliable for AI-powered structured output.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateStructuredReliable } from '@/lib/ai/fred-client';

// ============================================================================
// Parameter Schemas (extracted for explicit typing)
// ============================================================================

const investorResearchParams = z.object({
  stage: z.enum(['pre-seed', 'seed', 'series-a', 'series-b']).describe('Funding stage the founder is raising for'),
  sector: z.string().describe('Industry sector or vertical (e.g., "fintech", "healthtech", "B2B SaaS")'),
  checkSizeMin: z.number().describe('Minimum check size in USD'),
  checkSizeMax: z.number().describe('Maximum check size in USD'),
  geographicFocus: z.string().optional().describe('Geographic focus for investors (e.g., "US", "Bay Area", "NYC")'),
});

const outreachDraftParams = z.object({
  investorName: z.string().describe('Name of the target investor'),
  investorFirm: z.string().describe('Firm or fund name'),
  investorThesis: z.string().describe('What the investor typically invests in'),
  founderBackground: z.string().describe('Brief founder background and relevant experience'),
  companyOneLiner: z.string().describe('One-sentence company description'),
  traction: z.string().describe('Key traction metrics (ARR, users, growth rate, etc.)'),
  askAmount: z.string().optional().describe('Amount being raised (e.g., "$2M seed round")'),
  isWarmIntro: z.boolean().describe('Whether this is a warm introduction (true) or cold outreach (false)'),
  introContext: z.string().optional().describe('Context for warm intro (who is introducing, how they know the investor)'),
});

const pipelineAnalysisParams = z.object({
  pipeline: z.array(
    z.object({
      investorName: z.string().describe('Investor name'),
      stage: z.enum(['identified', 'outreach_sent', 'meeting_scheduled', 'term_sheet', 'passed']).describe('Current stage in fundraising pipeline'),
      lastContact: z.string().optional().describe('Date of last contact (ISO format)'),
      notes: z.string().optional().describe('Any notes about the conversation or status'),
    })
  ).describe('Current fundraising pipeline'),
});

const meetingPrepParams = z.object({
  investorName: z.string().describe('Name of the investor'),
  investorFirm: z.string().describe('Firm or fund name'),
  meetingType: z.enum(['first-call', 'partner-meeting', 'follow-up', 'due-diligence']).describe('Type of investor meeting'),
  companyMetrics: z.record(z.string(), z.unknown()).describe('Key company metrics (ARR, MRR, growth, burn, runway, etc.)'),
  previousInteractions: z.string().optional().describe('Summary of any previous conversations with this investor'),
});

// ============================================================================
// Tool 1: Investor Research
// ============================================================================

const investorResearch = tool({
  description:
    'Research and identify relevant investors based on stage, sector, check size, and geographic focus. Returns a list of matching investors with thesis fit analysis and intro strategies.',
  inputSchema: investorResearchParams,
  execute: async (input: z.infer<typeof investorResearchParams>) => {
    const { stage, sector, checkSizeMin, checkSizeMax, geographicFocus } = input;

    const prompt = `You are an expert startup fundraising advisor. Research and identify investors that match the following criteria:

Stage: ${stage}
Sector: ${sector}
Check size range: $${checkSizeMin.toLocaleString()} - $${checkSizeMax.toLocaleString()}
${geographicFocus ? `Geographic focus: ${geographicFocus}` : ''}

For each investor, provide:
1. Name and firm
2. Their investment thesis and why they would be interested
3. Recent relevant deals they have done
4. Why they are a good fit for this specific raise
5. Best strategy for getting an introduction

Be specific and actionable. Explain the reasoning behind each recommendation.`;

    const schema = z.object({
      investors: z.array(
        z.object({
          name: z.string().describe('Investor name'),
          firm: z.string().describe('Firm or fund name'),
          thesis: z.string().describe('Investment thesis summary'),
          recentDeals: z.array(z.string()).describe('Recent relevant investments'),
          whyFit: z.string().describe('Why this investor is a good fit'),
          introStrategy: z.string().describe('Best approach to get an introduction'),
        })
      ).describe('Matching investors with analysis'),
      searchStrategy: z.string().describe('Overall search strategy and prioritization advice'),
    });

    const result = await generateStructuredReliable(prompt, schema, {
      temperature: 0.6,
    });

    return result.object;
  },
});

// ============================================================================
// Tool 2: Outreach Draft
// ============================================================================

const outreachDraft = tool({
  description:
    'Draft a personalized investor outreach email (cold or warm intro) with follow-up scheduling. Produces a ready-to-send email with subject line, body, and follow-up plan.',
  inputSchema: outreachDraftParams,
  execute: async (input: z.infer<typeof outreachDraftParams>) => {
    const {
      investorName,
      investorFirm,
      investorThesis,
      founderBackground,
      companyOneLiner,
      traction,
      askAmount,
      isWarmIntro,
      introContext,
    } = input;

    const introType = isWarmIntro ? 'warm introduction' : 'cold outreach';
    const prompt = `You are an expert startup fundraising advisor drafting a ${introType} email to an investor.

Target Investor: ${investorName} at ${investorFirm}
Investor Thesis: ${investorThesis}
${isWarmIntro && introContext ? `Intro Context: ${introContext}` : ''}

Founder Background: ${founderBackground}
Company: ${companyOneLiner}
Traction: ${traction}
${askAmount ? `Ask: ${askAmount}` : ''}

Draft a compelling ${introType} email that:
1. ${isWarmIntro ? 'References the mutual connection naturally' : 'Opens with a hook that demonstrates founder-market fit'}
2. Shows clear alignment with the investor's thesis in the first 2 sentences
3. Includes specific traction metrics that demonstrate momentum
4. Has a clear, low-friction call to action
5. Is concise (under 150 words for the body)

Also provide:
- A follow-up schedule (what to do if no response)
- Things to explicitly NOT mention in this initial outreach`;

    const schema = z.object({
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Full email body text'),
      followUpSchedule: z.array(
        z.object({
          day: z.number().describe('Days after initial send'),
          action: z.string().describe('What to do (e.g., "Send follow-up #1 with new data point")'),
        })
      ).describe('Follow-up sequence if no response'),
      doNotMention: z.array(z.string()).describe('Topics to avoid in initial outreach'),
    });

    const result = await generateStructuredReliable(prompt, schema, {
      temperature: 0.7,
    });

    return result.object;
  },
});

// ============================================================================
// Tool 3: Pipeline Analysis
// ============================================================================

const pipelineAnalysis = tool({
  description:
    'Analyze a fundraising pipeline and provide prioritized next steps, identify stale leads, assess pipeline health, and recommend improvements.',
  inputSchema: pipelineAnalysisParams,
  execute: async (input: z.infer<typeof pipelineAnalysisParams>) => {
    const { pipeline } = input;

    const pipelineDescription = pipeline
      .map(
        (p: z.infer<typeof pipelineAnalysisParams>['pipeline'][number]) =>
          `- ${p.investorName}: ${p.stage}${p.lastContact ? ` (last contact: ${p.lastContact})` : ''}${p.notes ? ` -- ${p.notes}` : ''}`
      )
      .join('\n');

    const prompt = `You are an expert startup fundraising advisor analyzing a founder's investor pipeline.

Current Pipeline (${pipeline.length} investors):
${pipelineDescription}

Analyze this pipeline and provide:
1. A summary of pipeline health and coverage
2. Priority actions for each investor, ranked by urgency
3. Identify stale leads (no contact in 2+ weeks or stuck in a stage)
4. Overall pipeline health assessment
5. Strategic recommendations to improve conversion

Be specific about WHAT to do, WHEN to do it, and WHY it matters. Fundraising is time-sensitive.`;

    const schema = z.object({
      summary: z.string().describe('Overall pipeline summary and assessment'),
      priorityActions: z.array(
        z.object({
          investor: z.string().describe('Investor name'),
          action: z.string().describe('Specific next action to take'),
          urgency: z.enum(['high', 'medium', 'low']).describe('Action urgency level'),
          reasoning: z.string().describe('Why this action matters now'),
        })
      ).describe('Prioritized actions sorted by urgency'),
      staleLeads: z.array(z.string()).describe('Investor names with stale or stuck conversations'),
      pipelineHealth: z.enum(['strong', 'adequate', 'weak']).describe('Overall pipeline health rating'),
      recommendations: z.array(z.string()).describe('Strategic recommendations to improve the pipeline'),
    });

    const result = await generateStructuredReliable(prompt, schema, {
      temperature: 0.5,
    });

    return result.object;
  },
});

// ============================================================================
// Tool 4: Meeting Prep
// ============================================================================

const meetingPrep = tool({
  description:
    'Prepare for an investor meeting with talking points, anticipated questions with suggested answers, key metrics to highlight, closing ask, and potential red flags.',
  inputSchema: meetingPrepParams,
  execute: async (input: z.infer<typeof meetingPrepParams>) => {
    const {
      investorName,
      investorFirm,
      meetingType,
      companyMetrics,
      previousInteractions,
    } = input;

    const metricsStr = Object.entries(companyMetrics)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const prompt = `You are an expert startup fundraising advisor preparing a founder for a ${meetingType} with ${investorName} at ${investorFirm}.

Meeting Type: ${meetingType}
${previousInteractions ? `Previous Interactions: ${previousInteractions}` : 'This is the first meeting.'}

Company Metrics:
${metricsStr}

Prepare the founder with:
1. Key talking points tailored to this specific meeting type and investor
2. Anticipated questions the investor will ask, with strong suggested answers
3. Which metrics to highlight and the narrative around each
4. A clear closing ask appropriate for this meeting stage
5. Potential red flags the investor might raise and how to address them

For a ${meetingType}:
${meetingType === 'first-call' ? '- Focus on the big picture vision and market opportunity. Keep it high-level.' : ''}
${meetingType === 'partner-meeting' ? '- This is the decision-making meeting. Be prepared for tough questions from multiple partners.' : ''}
${meetingType === 'follow-up' ? '- Reference previous conversations. Show progress since last meeting.' : ''}
${meetingType === 'due-diligence' ? '- Be prepared for deep dives into financials, technology, and team. Transparency is key.' : ''}`;

    const schema = z.object({
      talkingPoints: z.array(z.string()).describe('Key talking points for the meeting'),
      anticipatedQuestions: z.array(
        z.object({
          question: z.string().describe('Question the investor is likely to ask'),
          suggestedAnswer: z.string().describe('Suggested response with key points to hit'),
        })
      ).describe('Anticipated questions with strong answers'),
      metricsToHighlight: z.array(
        z.object({
          metric: z.string().describe('Metric name'),
          value: z.string().describe('Current metric value'),
          narrative: z.string().describe('Story to tell around this metric'),
        })
      ).describe('Key metrics to highlight with narratives'),
      closingAsk: z.string().describe('Clear closing ask appropriate for meeting stage'),
      redFlags: z.array(z.string()).describe('Potential red flags and how to address them'),
    });

    const result = await generateStructuredReliable(prompt, schema, {
      temperature: 0.5,
    });

    return result.object;
  },
});

// ============================================================================
// Export All Tools
// ============================================================================

export const fundraisingTools = {
  investorResearch,
  outreachDraft,
  pipelineAnalysis,
  meetingPrep,
};
