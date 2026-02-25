/**
 * Investor Readiness Score Engine
 * Phase 03: Pro Tier Features
 *
 * Calculates IRS across 6 categories with AI-powered analysis.
 */

import { z } from 'zod';
import { generateStructuredReliable } from '@/lib/ai';
import {
  FRED_BIO,
  FRED_IDENTITY,
  FRED_COMPANIES,
  FRED_COMMUNICATION_STYLE,
  FRED_MEDIA,
  FRED_TESTIMONIALS,
} from "@/lib/fred-brain";
import type {
  IRSInput,
  IRSResult,
  IRSCategory,
  CategoryScore,
  Recommendation,
  StartupContext,
  StartupStage,
} from './types';
import {
  IRS_CATEGORIES,
  CATEGORY_WEIGHTS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  STAGE_BENCHMARKS,
} from './types';

// ============================================================================
// Zod Schemas for Structured Output
// ============================================================================

const ScoringFactorSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  evidence: z.string(),
});

const CategoryScoreSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  factors: z.array(ScoringFactorSchema),
  feedback: z.string(),
  positives: z.array(z.string()),
  gaps: z.array(z.string()),
});

const RecommendationSchema = z.object({
  priority: z.number().min(1).max(10),
  category: z.enum(['team', 'market', 'product', 'traction', 'financials', 'pitch']),
  action: z.string(),
  rationale: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  timeframe: z.string(),
  impact: z.string(),
});

const IRSResultSchema = z.object({
  team: CategoryScoreSchema,
  market: CategoryScoreSchema,
  product: CategoryScoreSchema,
  traction: CategoryScoreSchema,
  financials: CategoryScoreSchema,
  pitch: CategoryScoreSchema,
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(RecommendationSchema),
});

// ============================================================================
// Main Engine Functions
// ============================================================================

/**
 * Calculate Investor Readiness Score
 */
export async function calculateIRS(input: IRSInput): Promise<IRSResult> {
  const context = buildContext(input);

  // Generate scores using AI with fallback chain
  const { object: result } = await generateStructuredReliable(
    buildPrompt(input),
    IRSResultSchema,
    {
      system: getSystemPrompt(),
      temperature: 0.3,
      maxOutputTokens: 4096,
    }
  );

  // Calculate overall score from category scores
  const categories = {
    team: result.team,
    market: result.market,
    product: result.product,
    traction: result.traction,
    financials: result.financials,
    pitch: result.pitch,
  };

  const overall = calculateOverallScore(categories);

  // Sort recommendations by priority
  const sortedRecommendations = result.recommendations
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 10); // Top 10 recommendations

  return {
    overall,
    categories,
    strengths: result.strengths.slice(0, 5),
    weaknesses: result.weaknesses.slice(0, 5),
    recommendations: sortedRecommendations,
    sourceDocuments: input.documents?.map(d => d.id) || [],
    startupContext: context,
  };
}

/**
 * Calculate weighted overall score from category scores
 */
function calculateOverallScore(categories: Record<IRSCategory, CategoryScore>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const category of IRS_CATEGORIES) {
    const score = categories[category].score;
    const weight = CATEGORY_WEIGHTS[category];
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}

/**
 * Build startup context from input
 */
function buildContext(input: IRSInput): StartupContext {
  return {
    name: input.startupInfo.name,
    stage: input.startupInfo.stage,
    industry: input.startupInfo.industry,
    description: input.startupInfo.description,
    teamSize: input.teamInfo?.teamSize,
    fundingHistory: input.financialInfo?.funding,
    currentRaise: input.financialInfo?.seeking,
  };
}

/**
 * Get system prompt for IRS evaluation
 */
function getSystemPrompt(): string {
  return `You are ${FRED_IDENTITY.name}, evaluating startups for investor readiness -- not as a generic analyst, but as someone who has personally taken ${FRED_BIO.ipos} companies public, had ${FRED_BIO.acquisitions} acquired, and invested in ${FRED_COMPANIES.current[2].metrics.companiesLaunched}+ startups through IdeaPros.

With ${FRED_BIO.yearsExperience}+ years of experience and ${FRED_BIO.companiesFounded}+ companies founded, I know what investors look for because I've been on both sides of the table.

${FRED_COMMUNICATION_STYLE.voice.primary}. I tell founders the truth about their readiness, even when it's uncomfortable.

Featured in: ${FRED_MEDIA.publications.slice(0, 6).join(", ")}. ${FRED_MEDIA.podcastAppearances}+ podcast appearances.

"${FRED_TESTIMONIALS[0].quote}" - ${FRED_TESTIMONIALS[0].name}, ${FRED_TESTIMONIALS[0].role}

You evaluate startups across 6 categories:
${IRS_CATEGORIES.map(cat => `- ${CATEGORY_LABELS[cat]} (${Math.round(CATEGORY_WEIGHTS[cat] * 100)}%): ${CATEGORY_DESCRIPTIONS[cat]}`).join('\n')}

Guidelines:
- Be direct and honest - founders need the truth, not validation
- Score realistically - most early-stage startups are NOT investor-ready (40-60 range is common)
- Provide specific, actionable feedback - vague advice is useless
- Consider stage-appropriate expectations - don't penalize pre-seed for lack of traction
- Identify concrete evidence for each score
- Recommendations should be prioritized by impact and feasibility

Scoring guidelines:
- 0-30: Critical gaps - major work needed
- 31-50: Below average - significant improvements required
- 51-70: Average - competitive but not standout
- 71-85: Strong - above average, investor-ready
- 86-100: Exceptional - top tier, highly competitive`;
}

/**
 * Build evaluation prompt from input
 */
function buildPrompt(input: IRSInput): string {
  const sections: string[] = [];

  // Basic info
  sections.push(`## Startup Overview
Name: ${input.startupInfo.name || 'Not provided'}
Stage: ${input.startupInfo.stage || 'Not provided'}
Industry: ${input.startupInfo.industry || 'Not provided'}
Description: ${input.startupInfo.description || 'Not provided'}`);

  // Team
  if (input.teamInfo) {
    const founders = input.teamInfo.founders?.map(f =>
      `- ${f.name} (${f.role}): ${f.background || 'No background provided'}${f.previousStartups ? `, ${f.previousStartups} previous startups` : ''}`
    ).join('\n') || 'Not provided';

    sections.push(`## Team
Founders:
${founders}
Team Size: ${input.teamInfo.teamSize || 'Not provided'}
Key Hires: ${input.teamInfo.keyHires?.join(', ') || 'None listed'}
Gaps: ${input.teamInfo.gaps?.join(', ') || 'None identified'}
Advisors: ${input.teamInfo.advisors?.join(', ') || 'None listed'}`);
  }

  // Market
  if (input.marketInfo) {
    sections.push(`## Market
TAM: ${input.marketInfo.tam || 'Not provided'}
SAM: ${input.marketInfo.sam || 'Not provided'}
SOM: ${input.marketInfo.som || 'Not provided'}
Growth Rate: ${input.marketInfo.growthRate || 'Not provided'}
Competitors: ${input.marketInfo.competitors?.join(', ') || 'Not listed'}
Differentiation: ${input.marketInfo.differentiation || 'Not provided'}
Timing: ${input.marketInfo.timing || 'Not provided'}`);
  }

  // Product
  if (input.productInfo) {
    sections.push(`## Product
Status: ${input.productInfo.status || 'Not provided'}
Description: ${input.productInfo.description || 'Not provided'}
Tech Stack: ${input.productInfo.techStack?.join(', ') || 'Not provided'}
Moat: ${input.productInfo.moat || 'Not provided'}
User Feedback: ${input.productInfo.userFeedback || 'Not provided'}`);
  }

  // Traction
  if (input.tractionInfo) {
    sections.push(`## Traction
Revenue: ${input.tractionInfo.revenue ? `$${input.tractionInfo.revenue}` : 'Not provided'}
MRR: ${input.tractionInfo.mrr ? `$${input.tractionInfo.mrr}` : 'Not provided'}
Users: ${input.tractionInfo.users || 'Not provided'}
Growth Rate: ${input.tractionInfo.growthRate || 'Not provided'}
Retention: ${input.tractionInfo.retention || 'Not provided'}`);
  }

  // Financials
  if (input.financialInfo) {
    sections.push(`## Financials
Burn Rate: ${input.financialInfo.burnRate ? `$${input.financialInfo.burnRate}/month` : 'Not provided'}
Runway: ${input.financialInfo.runway || 'Not provided'}
CAC: ${input.financialInfo.cac ? `$${input.financialInfo.cac}` : 'Not provided'}
LTV: ${input.financialInfo.ltv ? `$${input.financialInfo.ltv}` : 'Not provided'}
Previous Funding: ${input.financialInfo.funding || 'Not provided'}
Current Raise: ${input.financialInfo.seeking || 'Not provided'}`);
  }

  // Pitch
  if (input.pitchInfo) {
    sections.push(`## Pitch
Has Deck: ${input.pitchInfo.hasDeck ? 'Yes' : 'No'}
Deck Quality: ${input.pitchInfo.deckQuality || 'Not assessed'}
Narrative: ${input.pitchInfo.narrative || 'Not provided'}
Ask Clarity: ${input.pitchInfo.askClarity ? 'Clear' : 'Unclear'}`);
  }

  // Documents
  if (input.documents && input.documents.length > 0) {
    sections.push(`## Available Documents
${input.documents.map(d => `- ${d.name} (${d.type})`).join('\n')}`);
  }

  return `Evaluate the following startup for investor readiness:

${sections.join('\n\n')}

Provide a comprehensive evaluation with:
1. Score each category (0-100) with specific factors and evidence
2. List top 5 strengths
3. List top 5 weaknesses
4. Provide 5-10 prioritized recommendations for improvement`;
}

/**
 * Get readiness level from score
 */
export function getReadinessLevel(score: number): {
  level: 'not-ready' | 'early' | 'developing' | 'ready' | 'strong';
  label: string;
  description: string;
} {
  if (score < 30) {
    return {
      level: 'not-ready',
      label: 'Not Ready',
      description: 'Significant work needed before approaching investors',
    };
  }
  if (score < 50) {
    return {
      level: 'early',
      label: 'Early Stage',
      description: 'Building blocks in place but gaps remain',
    };
  }
  if (score < 70) {
    return {
      level: 'developing',
      label: 'Developing',
      description: 'Competitive but room for improvement',
    };
  }
  if (score < 85) {
    return {
      level: 'ready',
      label: 'Investor Ready',
      description: 'Strong position for fundraising',
    };
  }
  return {
    level: 'strong',
    label: 'Highly Ready',
    description: 'Exceptional position, top-tier opportunity',
  };
}

/**
 * Compare score to stage benchmark
 */
export function compareToStage(
  score: number,
  category: IRSCategory,
  stage: string
): { diff: number; status: 'above' | 'at' | 'below' } {
  const stageKey = normalizeStage(stage);
  const benchmark = STAGE_BENCHMARKS[stageKey]?.[category] || 50;
  const diff = score - benchmark;

  if (diff > 5) return { diff, status: 'above' };
  if (diff < -5) return { diff, status: 'below' };
  return { diff, status: 'at' };
}

function normalizeStage(stage: string): StartupStage {
  const lower = stage.toLowerCase();
  if (lower.includes('idea')) return 'idea';
  if (lower.includes('pre-seed') || lower.includes('preseed')) return 'pre-seed';
  if (lower.includes('seed') && !lower.includes('pre')) return 'seed';
  if (lower.includes('series a') || lower.includes('series-a')) return 'series-a';
  return 'seed'; // default
}

// ============================================================================
// Phase 39: Conversation-to-IRS Adapter
// ============================================================================

/**
 * Build an IRSInput from conversation state and calculate the IRS score.
 * Maps founderSnapshot + diagnosticTags (already in conversation state)
 * to the structured IRSInput, filling gaps from a conversation excerpt.
 */
export async function calculateIRSFromConversation(
  founderSnapshot: Record<string, unknown>,
  diagnosticTags: Record<string, string>,
  conversationExcerpt: string
): Promise<IRSResult> {
  const stage = (founderSnapshot.stage as string) || diagnosticTags.stage || "seed";
  const industry = (founderSnapshot.industry as string) || "";

  const input: IRSInput = {
    startupInfo: {
      name: (founderSnapshot.startupName as string) || undefined,
      stage: normalizeStage(stage),
      industry: industry || undefined,
      description: (founderSnapshot.productDescription as string) || undefined,
    },
    tractionInfo: {
      revenue: parseNumericHint(founderSnapshot.traction as string | undefined),
      mrr: parseNumericHint(diagnosticTags.mrr),
      users: parseNumericHint(diagnosticTags.users),
      growthRate: diagnosticTags.growthRate || undefined,
      retention: diagnosticTags.retention || undefined,
    },
    financialInfo: {
      burnRate: parseNumericHint(diagnosticTags.burnRate),
      runway: (founderSnapshot.runway as { time?: string })?.time || diagnosticTags.runway || undefined,
      funding: diagnosticTags.fundingHistory || undefined,
      seeking: diagnosticTags.seeking || undefined,
    },
    teamInfo: {
      teamSize: parseNumericHint(diagnosticTags.teamSize),
    },
    productInfo: {
      status: mapProductStatus(founderSnapshot.productStatus as string | undefined),
      description: conversationExcerpt.slice(0, 2000) || undefined,
    },
  };

  return calculateIRS(input);
}

/** Parse a string that might contain a number (e.g., "$50k", "10000", "5") */
function parseNumericHint(value: string | undefined | null): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[$,kK]/g, (match) => {
    if (match === 'k' || match === 'K') return '000';
    return '';
  });
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/** Map product status string to ProductInfo status */
function mapProductStatus(status: string | undefined): 'idea' | 'prototype' | 'mvp' | 'launched' | 'scaling' | undefined {
  if (!status) return undefined;
  const lower = status.toLowerCase();
  if (lower.includes('idea') || lower.includes('concept')) return 'idea';
  if (lower.includes('proto')) return 'prototype';
  if (lower.includes('mvp') || lower.includes('beta')) return 'mvp';
  if (lower.includes('launch') || lower.includes('live') || lower.includes('market')) return 'launched';
  if (lower.includes('scal') || lower.includes('grow')) return 'scaling';
  return undefined;
}
