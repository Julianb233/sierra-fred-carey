/**
 * Slide Analyzers
 * Phase 03: Pro Tier Features
 *
 * Per-slide-type analysis with type-specific criteria prompts.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import {
  FRED_BIO,
  FRED_IDENTITY,
  FRED_COMMUNICATION_STYLE,
} from "@/lib/fred-brain";
import type { SlideType, SlideAnalysis } from '../types';
import { SLIDE_LABELS, SLIDE_DESCRIPTIONS } from '../types';

// ============================================================================
// Type-Specific Criteria
// ============================================================================

const SLIDE_CRITERIA: Record<SlideType, string[]> = {
  title: [
    'Company name is clear and memorable?',
    'Tagline conveys value proposition?',
    'Professional design and branding?',
    'Contact information present?',
  ],
  problem: [
    'Is the problem clearly stated?',
    'Is it relatable and emotional?',
    'Supporting statistics present?',
    'Urgency conveyed?',
  ],
  solution: [
    'Solution clearly explained?',
    'Directly addresses stated problem?',
    'Differentiated from alternatives?',
    'Believable and feasible?',
  ],
  market: [
    'TAM/SAM/SOM defined?',
    'Sources credible?',
    'Math reasonable?',
    'Clear market wedge identified?',
  ],
  product: [
    'Product demo or screenshots shown?',
    'Key features highlighted?',
    'User experience conveyed?',
    'Technology advantage clear?',
  ],
  business_model: [
    'Revenue model clearly stated?',
    'Pricing strategy explained?',
    'Unit economics provided?',
    'Scalability addressed?',
  ],
  traction: [
    'Key metrics clearly presented?',
    'Growth rate highlighted?',
    'Milestones notable?',
    'Data recent and verifiable?',
  ],
  competition: [
    'Competitive landscape mapped?',
    'Positioning clear?',
    'Differentiation compelling?',
    'Honest about competitive threats?',
  ],
  team: [
    'Key members shown with photos?',
    'Relevant experience highlighted?',
    'Notable credentials or exits?',
    'Team complete for current stage?',
  ],
  financials: [
    'Revenue projections reasonable?',
    'Key assumptions stated?',
    'Burn rate and runway shown?',
    'Path to profitability clear?',
  ],
  ask: [
    'Funding amount clearly stated?',
    'Use of funds specified?',
    'Runway explained?',
    'Milestones tied to funding?',
  ],
  appendix: [
    'Supporting data relevant?',
    'Additional context useful?',
    'References credible?',
    'Organized and accessible?',
  ],
  unknown: [
    'Content serves a clear purpose?',
    'Information adds value to the pitch?',
    'Well-organized and readable?',
    'Could be merged with another slide?',
  ],
};

// ============================================================================
// Zod Schema
// ============================================================================

const SlideAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  strengths: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// ============================================================================
// Analysis Function
// ============================================================================

/**
 * Analyze a single slide with type-specific criteria
 */
export async function analyzeSlide(
  content: string,
  type: SlideType,
  pageNumber: number
): Promise<SlideAnalysis> {
  const criteria = SLIDE_CRITERIA[type] || SLIDE_CRITERIA.unknown;
  const label = SLIDE_LABELS[type] || 'Unknown';
  const description = SLIDE_DESCRIPTIONS[type] || '';

  const { object: result } = await generateObject({
    model: openai('gpt-4o'),
    schema: SlideAnalysisSchema,
    system: `You are ${FRED_IDENTITY.name}, a direct, no-BS startup advisor with ${FRED_BIO.yearsExperience}+ years of experience. I've taken ${FRED_BIO.ipos} companies public and personally review pitch decks as both an advisor and investor. ${FRED_COMMUNICATION_STYLE.voice.primary}.
You evaluate pitch deck slides with honesty and actionable feedback.

You are analyzing a "${label}" slide.
Purpose: ${description}

Evaluate against these criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Scoring guidelines:
- 0-30: Critical issues, slide needs complete rework
- 31-50: Below average, significant improvements needed
- 51-70: Acceptable but not compelling
- 71-85: Strong, above average
- 86-100: Exceptional, investor-ready

Be specific in your feedback. Generic advice is useless.
Limit strengths to 2-3 items. Limit suggestions to 2-3 items.`,
    prompt: `Analyze this "${label}" slide (page ${pageNumber}):

${content}`,
    temperature: 0.3,
  });

  return {
    pageNumber,
    type,
    typeConfidence: 1, // Confidence is set by the classifier, not the analyzer
    score: result.score,
    feedback: result.feedback,
    strengths: result.strengths.slice(0, 3),
    suggestions: result.suggestions.slice(0, 3),
  };
}
