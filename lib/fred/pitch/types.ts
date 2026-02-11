/**
 * Pitch Deck Review Types
 * Phase 03: Pro Tier Features
 *
 * Types for slide-by-slide pitch deck analysis.
 */

// ============================================================================
// Slide Types
// ============================================================================

export type SlideType =
  | 'title'
  | 'problem'
  | 'solution'
  | 'market'
  | 'product'
  | 'business_model'
  | 'traction'
  | 'competition'
  | 'team'
  | 'financials'
  | 'ask'
  | 'appendix'
  | 'unknown';

// All 12 known slide types (excluding 'unknown')
export const SLIDE_TYPES: SlideType[] = [
  'title',
  'problem',
  'solution',
  'market',
  'product',
  'business_model',
  'traction',
  'competition',
  'team',
  'financials',
  'ask',
  'appendix',
];

// Core slides every investor expects -- used for structure scoring
export const REQUIRED_SLIDES: SlideType[] = [
  'title',
  'problem',
  'solution',
  'market',
  'traction',
  'team',
  'ask',
];

// Human-readable labels
export const SLIDE_LABELS: Record<SlideType, string> = {
  title: 'Title Slide',
  problem: 'Problem',
  solution: 'Solution',
  market: 'Market Size',
  product: 'Product',
  business_model: 'Business Model',
  traction: 'Traction',
  competition: 'Competition',
  team: 'Team',
  financials: 'Financials',
  ask: 'The Ask',
  appendix: 'Appendix',
  unknown: 'Unknown',
};

// What each slide should contain
export const SLIDE_DESCRIPTIONS: Record<SlideType, string> = {
  title: 'Company name, tagline, and founding team intro',
  problem: 'The pain point or market gap being addressed',
  solution: 'How the product or service solves the problem',
  market: 'Total addressable market (TAM), serviceable market (SAM/SOM), and growth trends',
  product: 'Product details, features, screenshots, or demo',
  business_model: 'Revenue model, pricing strategy, and unit economics',
  traction: 'Key metrics, growth rate, revenue, users, and milestones',
  competition: 'Competitive landscape, positioning, and differentiation',
  team: 'Founders, key hires, advisors, and relevant experience',
  financials: 'Financial projections, burn rate, runway, and historical performance',
  ask: 'Funding amount, use of funds, milestones tied to raise',
  appendix: 'Supporting data, additional charts, references',
  unknown: 'Slide type could not be determined',
};

// ============================================================================
// Classification Types
// ============================================================================

export interface SlideClassification {
  type: SlideType;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface SlideObjection {
  question: string;
  knockoutAnswer: string;
  severity: "high" | "medium" | "low";
}

export interface SlideAnalysis {
  pageNumber: number;
  type: SlideType;
  typeConfidence: number;
  score: number;
  feedback: string;
  strengths: string[];
  suggestions: string[];
  objections: SlideObjection[];
}

// ============================================================================
// Review Types
// ============================================================================

export interface PitchReview {
  id?: string;
  userId?: string;
  documentId: string;
  overallScore: number;
  structureScore: number;
  contentScore: number;
  slides: SlideAnalysis[];
  missingSections: SlideType[];
  strengths: string[];
  improvements: string[];
  createdAt?: Date;
}

export interface PitchReviewInput {
  documentId: string;
  pages: Array<{ pageNumber: number; content: string }>;
}

// ============================================================================
// Structure Types
// ============================================================================

export interface DeckStructure {
  slides: SlideClassification[];
  totalSlides: number;
  identifiedTypes: SlideType[];
}
