/**
 * Pitch Deck Review Engine
 * Phase 03: Pro Tier Features
 *
 * Orchestrates slide classification, analysis, and scoring into a full PitchReview.
 */

import type {
  PitchReviewInput,
  PitchReview,
  DeckStructure,
  SlideType,
  SlideAnalysis,
} from './types';
import { REQUIRED_SLIDES } from './types';
import { classifyDeck } from './slide-classifier';
import { analyzeSlide } from './analyzers';

// ============================================================================
// Main Engine
// ============================================================================

/**
 * Run a full pitch deck review: classify slides, analyze each, compute scores
 */
export async function reviewPitchDeck(input: PitchReviewInput): Promise<PitchReview> {
  // 1. Classify all slides in a single batch call
  const structure = await classifyDeck(input.pages);

  // 2. Analyze each slide in parallel
  const slideAnalyses = await Promise.all(
    input.pages.map((page, index) => {
      const classification = structure.slides[index];
      const type = classification?.type || 'unknown';
      const confidence = classification?.confidence || 0;

      return analyzeSlide(page.content, type, page.pageNumber).then(
        (analysis) => ({
          ...analysis,
          typeConfidence: confidence,
        })
      );
    })
  );

  // 3. Calculate structure score (deterministic, no AI call)
  const structureScore = calculateStructureScore(structure);

  // 4. Calculate content score (average of all slide scores)
  const contentScore =
    slideAnalyses.length > 0
      ? Math.round(
          slideAnalyses.reduce((sum, s) => sum + s.score, 0) / slideAnalyses.length
        )
      : 0;

  // 5. Calculate overall score (40% structure + 60% content)
  const overallScore = Math.round(structureScore * 0.4 + contentScore * 0.6);

  // 6. Identify missing sections
  const missingSections = identifyMissingSections(structure);

  // 7. Compile strengths: top 3 slides by score, take their first strength
  const sortedByScore = [...slideAnalyses].sort((a, b) => b.score - a.score);
  const strengths = sortedByScore
    .slice(0, 3)
    .map((s) => s.strengths[0])
    .filter(Boolean);

  // 8. Compile improvements: bottom 3 slides by score, take their first suggestion
  const bottom = [...slideAnalyses].sort((a, b) => a.score - b.score);
  const improvements = bottom
    .slice(0, 3)
    .map((s) => s.suggestions[0])
    .filter(Boolean);

  return {
    documentId: input.documentId,
    overallScore,
    structureScore,
    contentScore,
    slides: slideAnalyses,
    missingSections,
    strengths,
    improvements,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate structure score deterministically
 *
 * - Start at 100
 * - For each REQUIRED_SLIDE not found: -12 points
 * - If total slides > 20: -10 (too many)
 * - If total slides < 8: -10 (too few)
 * - Clamp to 0-100
 */
function calculateStructureScore(structure: DeckStructure): number {
  let score = 100;

  // Penalize missing required slides
  for (const required of REQUIRED_SLIDES) {
    if (!structure.identifiedTypes.includes(required)) {
      score -= 12;
    }
  }

  // Penalize wrong slide count
  if (structure.totalSlides > 20) {
    score -= 10;
  }
  if (structure.totalSlides < 8) {
    score -= 10;
  }

  // Clamp
  return Math.max(0, Math.min(100, score));
}

/**
 * Identify which required slides are missing from the deck
 */
function identifyMissingSections(structure: DeckStructure): SlideType[] {
  return REQUIRED_SLIDES.filter(
    (type) => !structure.identifiedTypes.includes(type)
  );
}
