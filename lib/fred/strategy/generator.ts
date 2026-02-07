/**
 * Strategy Document Generator
 * Phase 03: Pro Tier Features
 *
 * Generates multi-section strategy documents using FRED's voice
 * via sequential generateText calls for coherent prose output.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type {
  StrategyInput,
  GeneratedDocument,
  GeneratedSection,
  TemplateSection,
} from './types';
import { DOC_TYPE_LABELS } from './types';
import { getTemplate } from './templates';

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate a complete strategy document from input and template.
 * Sections are generated sequentially so later sections can reference
 * earlier context for coherence.
 */
export async function generateDocument(
  input: StrategyInput
): Promise<GeneratedDocument> {
  const template = getTemplate(input.type);

  const systemPrompt = buildSystemPrompt(template, input);

  const sections: GeneratedSection[] = [];

  // Generate sections sequentially for coherence
  for (const sectionTemplate of template.sections) {
    const section = await generateSection(
      sectionTemplate,
      input,
      systemPrompt,
      sections
    );
    sections.push(section);
  }

  // Assemble full markdown content
  const content = sections
    .map((s) => `## ${s.title}\n\n${s.content}`)
    .join('\n\n');

  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);

  const title = `${DOC_TYPE_LABELS[input.type]}: ${input.startupName}`;

  return {
    type: input.type,
    title,
    content,
    sections,
    metadata: {
      wordCount: totalWordCount,
      generatedAt: new Date(),
      sectionCount: sections.length,
    },
    version: 1,
  };
}

// ============================================================================
// Section Generator
// ============================================================================

/**
 * Generate a single section of a strategy document.
 * Uses previous sections for context to maintain coherence.
 */
export async function generateSection(
  section: TemplateSection,
  input: StrategyInput,
  systemPrompt: string,
  previousSections: GeneratedSection[]
): Promise<GeneratedSection> {
  // Replace placeholders in section prompt
  const sectionPrompt = replacePlaceholders(section.prompt, input);
  const sectionGuidelines = replacePlaceholders(section.guidelines, input);

  // Build user prompt with context
  let userPrompt = `Write the "${section.title}" section.\n\n`;
  userPrompt += `Instructions: ${sectionPrompt}\n\n`;
  userPrompt += `Guidelines: ${sectionGuidelines}\n\n`;
  userPrompt += `Target length: approximately ${section.maxWords} words.\n\n`;

  // Add startup context
  userPrompt += buildStartupContext(input);

  // Add previous section summaries for coherence
  if (previousSections.length > 0) {
    userPrompt += '\n\nPrevious sections (for coherence and to avoid repetition):\n';
    for (const prev of previousSections) {
      // Include first ~100 chars as summary to keep context manageable
      const summary = prev.content.substring(0, 200).trim();
      userPrompt += `- "${prev.title}": ${summary}...\n`;
    }
  }

  userPrompt += '\n\nWrite only the section content. Do not include the section heading -- it will be added automatically. Write in flowing prose, not bullet points (unless bullet points genuinely serve the content better).';

  // Try primary model, then retry once with fallback
  let lastError: unknown;
  const models = [openai('gpt-4o'), openai('gpt-4o-mini')];

  for (const model of models) {
    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.6,
        maxOutputTokens: section.maxWords * 2,
      });

      return {
        title: section.title,
        content: result.text.trim(),
        wordCount: countWords(result.text),
      };
    } catch (err) {
      lastError = err;
      console.warn(`[Strategy Generator] Model failed for section "${section.title}", trying fallback:`, err);
    }
  }

  throw lastError;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build the system prompt that defines FRED's persona for document generation.
 */
function buildSystemPrompt(
  template: { name: string; tone: string },
  input: StrategyInput
): string {
  return `You are Fred Cary, serial entrepreneur and startup advisor with 50+ years of experience building and scaling companies. You have personally founded, funded, and exited multiple businesses. You speak directly, avoid corporate jargon, and give specific actionable advice based on real-world experience.

${template.tone}

You are writing a ${template.name} for ${input.startupName}.${input.industry ? ` The company operates in the ${input.industry} space.` : ''}${input.stage ? ` They are at the ${input.stage} stage.` : ''}

Write with authority and warmth. You are not a consultant generating templates -- you are a seasoned operator sharing hard-won wisdom. Be specific, be honest, and be useful.`;
}

/**
 * Replace template placeholders with actual values from input.
 */
function replacePlaceholders(text: string, input: StrategyInput): string {
  return text
    .replace(/\{startupName\}/g, input.startupName)
    .replace(/\{industry\}/g, input.industry || 'their industry')
    .replace(/\{stage\}/g, input.stage || 'current');
}

/**
 * Build startup context string from input for section prompts.
 */
function buildStartupContext(input: StrategyInput): string {
  const parts: string[] = [];

  parts.push(`Startup: ${input.startupName}`);
  if (input.industry) parts.push(`Industry: ${input.industry}`);
  if (input.stage) parts.push(`Stage: ${input.stage}`);
  if (input.description) parts.push(`Description: ${input.description}`);
  if (input.additionalContext)
    parts.push(`Additional context: ${input.additionalContext}`);

  return `Startup context:\n${parts.join('\n')}`;
}

/**
 * Count words in a text string.
 */
function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
