/**
 * Strategy Document Types
 * Phase 03: Pro Tier Features
 *
 * Types for the strategy document generation system.
 */

// ============================================================================
// Document Type Definitions
// ============================================================================

export type StrategyDocType =
  | 'executive_summary'
  | 'market_analysis'
  | '30_60_90_plan'
  | 'competitive_analysis'
  | 'gtm_plan';

export const STRATEGY_DOC_TYPES: StrategyDocType[] = [
  'executive_summary',
  'market_analysis',
  '30_60_90_plan',
  'competitive_analysis',
  'gtm_plan',
];

export const DOC_TYPE_LABELS: Record<StrategyDocType, string> = {
  executive_summary: 'Executive Summary',
  market_analysis: 'Market Analysis',
  '30_60_90_plan': '30-60-90 Day Plan',
  competitive_analysis: 'Competitive Analysis',
  gtm_plan: 'Go-to-Market Plan',
};

export const DOC_TYPE_DESCRIPTIONS: Record<StrategyDocType, string> = {
  executive_summary:
    'One-page company overview for investor intros and partnerships',
  market_analysis:
    'Deep dive on market opportunity, size, trends, and entry strategy',
  '30_60_90_plan':
    'Prioritized action roadmap for team alignment and execution',
  competitive_analysis:
    'Competitive landscape analysis and positioning strategy',
  gtm_plan:
    'Go-to-market strategy with channels, pricing, and launch plan',
};

// ============================================================================
// Template Types
// ============================================================================

export interface TemplateSection {
  title: string;
  prompt: string;
  guidelines: string;
  maxWords: number;
}

export interface StrategyTemplate {
  type: StrategyDocType;
  name: string;
  description: string;
  sections: TemplateSection[];
  totalWordTarget: number;
  tone: string;
}

// ============================================================================
// Generated Document Types
// ============================================================================

export interface GeneratedSection {
  title: string;
  content: string;
  wordCount: number;
}

export interface GeneratedDocument {
  id?: string;
  userId?: string;
  type: StrategyDocType;
  title: string;
  content: string;
  sections: GeneratedSection[];
  metadata: {
    wordCount: number;
    generatedAt: Date;
    sectionCount: number;
  };
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// Input Types
// ============================================================================

export interface StrategyInput {
  type: StrategyDocType;
  startupName: string;
  industry?: string;
  stage?: string;
  description?: string;
  additionalContext?: string;
}
