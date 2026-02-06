/**
 * Slide Classifier
 * Phase 03: Pro Tier Features
 *
 * AI-powered slide type classification using generateObject + Zod.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { SlideClassification, DeckStructure, SlideType } from './types';
import { SLIDE_TYPES, SLIDE_LABELS, SLIDE_DESCRIPTIONS } from './types';

// ============================================================================
// Zod Schemas
// ============================================================================

const SlideTypeEnum = z.enum([
  'title', 'problem', 'solution', 'market', 'product',
  'business_model', 'traction', 'competition', 'team',
  'financials', 'ask', 'appendix', 'unknown',
]);

const SingleClassificationSchema = z.object({
  pageNumber: z.number(),
  type: SlideTypeEnum,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const DeckClassificationSchema = z.object({
  classifications: z.array(SingleClassificationSchema),
});

const SingleSlideClassSchema = z.object({
  type: SlideTypeEnum,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// ============================================================================
// System Prompt
// ============================================================================

function getClassifierPrompt(): string {
  const typeDescriptions = SLIDE_TYPES.map(
    (type) => `- ${type}: ${SLIDE_LABELS[type]} - ${SLIDE_DESCRIPTIONS[type]}`
  ).join('\n');

  return `You are an expert pitch deck analyst. Your job is to classify pitch deck slides into their correct type.

Known slide types:
${typeDescriptions}

Classification hints:
- Page 1 is almost always a "title" slide
- The last 1-2 pages are often "ask" or "appendix"
- "problem" usually comes before "solution"
- "market" often follows "solution"
- "traction" and "financials" appear in the second half
- "team" typically appears near the end before "ask"
- If a slide doesn't clearly match any type, use "unknown"

Be precise. Assign confidence 0.8+ only when you are quite sure. For ambiguous slides, assign confidence 0.4-0.7 and explain your reasoning.`;
}

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify a single slide by its text content
 */
export async function classifySlide(
  content: string,
  pageNumber: number,
  totalPages: number
): Promise<SlideClassification> {
  const { object: result } = await generateObject({
    model: openai('gpt-4o'),
    schema: SingleSlideClassSchema,
    system: getClassifierPrompt(),
    prompt: `Classify this pitch deck slide (page ${pageNumber} of ${totalPages}):

${content}`,
    temperature: 0.2,
  });

  return {
    type: result.type as SlideType,
    confidence: result.confidence,
    reasoning: result.reasoning,
  };
}

/**
 * Batch classify ALL pages in a single AI call for efficiency
 */
export async function classifyDeck(
  pages: Array<{ pageNumber: number; content: string }>
): Promise<DeckStructure> {
  const pagesText = pages
    .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.content}`)
    .join('\n\n');

  const { object: result } = await generateObject({
    model: openai('gpt-4o'),
    schema: DeckClassificationSchema,
    system: getClassifierPrompt(),
    prompt: `Classify each slide in this pitch deck (${pages.length} slides total):

${pagesText}

Return a classification for each page number.`,
    temperature: 0.2,
  });

  const classifications: SlideClassification[] = result.classifications.map((c) => ({
    type: c.type as SlideType,
    confidence: c.confidence,
    reasoning: c.reasoning,
  }));

  // Derive identified types (unique, excluding 'unknown')
  const identifiedTypes = Array.from(
    new Set(classifications.map((c) => c.type).filter((t) => t !== 'unknown'))
  ) as SlideType[];

  return {
    slides: classifications,
    totalSlides: pages.length,
    identifiedTypes,
  };
}
