/**
 * Investor Readiness Score Types
 * Phase 03: Pro Tier Features
 *
 * Types for the 6-category IRS evaluation system.
 */

// ============================================================================
// Category Types
// ============================================================================

export type IRSCategory = 'team' | 'market' | 'product' | 'traction' | 'financials' | 'pitch';

export const IRS_CATEGORIES: IRSCategory[] = [
  'team',
  'market',
  'product',
  'traction',
  'financials',
  'pitch',
];

// Category weights (must sum to 1)
export const CATEGORY_WEIGHTS: Record<IRSCategory, number> = {
  team: 0.25,
  market: 0.20,
  product: 0.20,
  traction: 0.15,
  financials: 0.10,
  pitch: 0.10,
};

export const CATEGORY_LABELS: Record<IRSCategory, string> = {
  team: 'Team',
  market: 'Market',
  product: 'Product',
  traction: 'Traction',
  financials: 'Financials',
  pitch: 'Pitch',
};

export const CATEGORY_DESCRIPTIONS: Record<IRSCategory, string> = {
  team: 'Founder experience, team completeness, and relevant expertise',
  market: 'TAM/SAM/SOM clarity, market timing, and competitive landscape',
  product: 'MVP status, differentiation, and technical feasibility',
  traction: 'Revenue, users, growth rate, and key metrics',
  financials: 'Burn rate, runway, unit economics, and funding history',
  pitch: 'Narrative clarity, deck quality, and objection handling',
};

// ============================================================================
// Score Types
// ============================================================================

export interface ScoringFactor {
  name: string;
  score: number;
  weight: number;
  evidence: string;
}

export interface CategoryScore {
  score: number;
  confidence: number;
  factors: ScoringFactor[];
  feedback: string;
  positives: string[];
  gaps: string[];
}

export interface Recommendation {
  priority: number;
  category: IRSCategory;
  action: string;
  rationale: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  impact: string;
}

// ============================================================================
// IRS Result Types
// ============================================================================

export interface IRSResult {
  id?: string;
  userId?: string;
  overall: number;
  categories: Record<IRSCategory, CategoryScore>;
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  sourceDocuments: string[];
  startupContext: StartupContext;
  createdAt?: Date;
}

export interface StartupContext {
  name?: string;
  stage?: string;
  industry?: string;
  description?: string;
  teamSize?: number;
  founded?: string;
  location?: string;
  fundingHistory?: string;
  currentRaise?: string;
  [key: string]: unknown;
}

// ============================================================================
// Input Types
// ============================================================================

export interface IRSInput {
  startupInfo: StartupContext;
  teamInfo?: TeamInfo;
  marketInfo?: MarketInfo;
  productInfo?: ProductInfo;
  tractionInfo?: TractionInfo;
  financialInfo?: FinancialInfo;
  pitchInfo?: PitchInfo;
  documents?: DocumentReference[];
}

export interface TeamInfo {
  founders?: Founder[];
  teamSize?: number;
  keyHires?: string[];
  gaps?: string[];
  advisors?: string[];
}

export interface Founder {
  name: string;
  role: string;
  background?: string;
  relevantExperience?: boolean;
  previousStartups?: number;
}

export interface MarketInfo {
  tam?: string;
  sam?: string;
  som?: string;
  growthRate?: string;
  competitors?: string[];
  differentiation?: string;
  timing?: string;
}

export interface ProductInfo {
  status?: 'idea' | 'prototype' | 'mvp' | 'launched' | 'scaling';
  description?: string;
  techStack?: string[];
  moat?: string;
  userFeedback?: string;
}

export interface TractionInfo {
  revenue?: number;
  mrr?: number;
  users?: number;
  growthRate?: string;
  retention?: string;
  keyMetrics?: Record<string, string | number>;
}

export interface FinancialInfo {
  burnRate?: number;
  runway?: string;
  cac?: number;
  ltv?: number;
  funding?: string;
  seeking?: string;
}

export interface PitchInfo {
  hasDeck?: boolean;
  deckQuality?: string;
  narrative?: string;
  askClarity?: boolean;
}

export interface DocumentReference {
  id: string;
  type: string;
  name: string;
}

// ============================================================================
// Historical Types
// ============================================================================

export interface IRSHistory {
  scores: IRSResult[];
  trend: 'improving' | 'stable' | 'declining';
  improvementAreas: IRSCategory[];
}

export interface IRSComparison {
  current: IRSResult;
  previous?: IRSResult;
  changes: CategoryChange[];
  overallChange: number;
}

export interface CategoryChange {
  category: IRSCategory;
  previous: number;
  current: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// Stage Benchmarks
// ============================================================================

export type StartupStage = 'idea' | 'pre-seed' | 'seed' | 'series-a' | 'series-b+';

export const STAGE_BENCHMARKS: Record<StartupStage, Record<IRSCategory, number>> = {
  idea: {
    team: 50,
    market: 40,
    product: 30,
    traction: 20,
    financials: 30,
    pitch: 40,
  },
  'pre-seed': {
    team: 60,
    market: 50,
    product: 45,
    traction: 35,
    financials: 40,
    pitch: 50,
  },
  seed: {
    team: 70,
    market: 60,
    product: 60,
    traction: 50,
    financials: 50,
    pitch: 60,
  },
  'series-a': {
    team: 80,
    market: 70,
    product: 75,
    traction: 70,
    financials: 65,
    pitch: 70,
  },
  'series-b+': {
    team: 85,
    market: 75,
    product: 85,
    traction: 80,
    financials: 75,
    pitch: 75,
  },
};

// ============================================================================
// Pure utility helpers (no server deps — safe to import in client components)
// ============================================================================

export function normalizeStage(stage: string): StartupStage {
  const lower = stage.toLowerCase();
  if (lower.includes('idea')) return 'idea';
  if (lower.includes('pre-seed') || lower.includes('preseed')) return 'pre-seed';
  if (lower.includes('seed') && !lower.includes('pre')) return 'seed';
  if (lower.includes('series a') || lower.includes('series-a')) return 'series-a';
  return 'seed';
}

export function getReadinessLevel(score: number): {
  level: 'not-ready' | 'early' | 'developing' | 'ready' | 'strong';
  label: string;
  description: string;
} {
  if (score < 30) return { level: 'not-ready', label: 'Not Ready', description: 'Significant work needed before approaching investors' };
  if (score < 50) return { level: 'early', label: 'Early Stage', description: 'Building blocks in place but gaps remain' };
  if (score < 70) return { level: 'developing', label: 'Developing', description: 'Competitive but room for improvement' };
  if (score < 85) return { level: 'ready', label: 'Investor Ready', description: 'Strong position for fundraising' };
  return { level: 'strong', label: 'Highly Ready', description: 'Exceptional position, top-tier opportunity' };
}

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
