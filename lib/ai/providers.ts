/**
 * AI Provider Configuration
 *
 * Unified provider configuration using Vercel AI SDK 6.
 * Supports OpenAI, Anthropic, and Google with automatic fallback.
 */

import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic, anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import type { LanguageModel, EmbeddingModel } from "ai";

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderKey =
  | "primary"
  | "fallback1"
  | "fallback2"
  | "fast"
  | "reasoning";

export type EmbeddingProviderKey = "embedding" | "embeddingLarge";

export interface ProviderConfig {
  model: LanguageModel;
  name: string;
  costPerMillionTokens: {
    input: number;
    output: number;
  };
}

export interface EmbeddingConfig {
  model: EmbeddingModel;
  name: string;
  dimensions: number;
  costPerMillionTokens: number;
}

// ============================================================================
// Provider Availability Check
// ============================================================================

function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function hasGoogle(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

// ============================================================================
// Model Configurations
// ============================================================================

/**
 * Get primary model (GPT-4o)
 */
export function getPrimaryModel(): LanguageModel | null {
  if (!hasOpenAI()) return null;
  return openai("gpt-4o");
}

/**
 * Get fallback model 1 (Claude 3.5 Sonnet)
 */
export function getFallback1Model(): LanguageModel | null {
  if (!hasAnthropic()) return null;
  return anthropic("claude-3-5-sonnet-20241022");
}

/**
 * Get fallback model 2 (Gemini 1.5 Pro)
 */
export function getFallback2Model(): LanguageModel | null {
  if (!hasGoogle()) return null;
  return google("gemini-1.5-pro");
}

/**
 * Get fast model for quick operations (GPT-4o-mini)
 */
export function getFastModel(): LanguageModel | null {
  if (!hasOpenAI()) return null;
  return openai("gpt-4o-mini");
}

/**
 * Get reasoning model for complex analysis (o1)
 */
export function getReasoningModel(): LanguageModel | null {
  if (!hasOpenAI()) return null;
  return openai("o1");
}

/**
 * Get embedding model
 */
export function getEmbeddingModel(): EmbeddingModel | null {
  if (!hasOpenAI()) return null;
  return openai.embedding("text-embedding-3-small");
}

/**
 * Get large embedding model for higher quality embeddings
 */
export function getLargeEmbeddingModel(): EmbeddingModel | null {
  if (!hasOpenAI()) return null;
  return openai.embedding("text-embedding-3-large");
}

// ============================================================================
// Provider Selection
// ============================================================================

/**
 * Get a model by provider key with fallback support
 */
export function getModel(key: ProviderKey): LanguageModel {
  const modelFns: Record<ProviderKey, () => LanguageModel | null> = {
    primary: getPrimaryModel,
    fallback1: getFallback1Model,
    fallback2: getFallback2Model,
    fast: getFastModel,
    reasoning: getReasoningModel,
  };

  const model = modelFns[key]();
  if (model) return model;

  // Fallback chain: try other providers in order
  const fallbackOrder: ProviderKey[] = [
    "primary",
    "fallback1",
    "fallback2",
    "fast",
  ];

  for (const fallbackKey of fallbackOrder) {
    if (fallbackKey === key) continue;
    const fallbackModel = modelFns[fallbackKey]();
    if (fallbackModel) {
      console.warn(
        `[AI Providers] ${key} not available, falling back to ${fallbackKey}`
      );
      return fallbackModel;
    }
  }

  throw new Error(
    "No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY."
  );
}

/**
 * Get an embedding model by key
 */
export function getEmbedding(
  key: EmbeddingProviderKey = "embedding"
): EmbeddingModel {
  const model =
    key === "embeddingLarge" ? getLargeEmbeddingModel() : getEmbeddingModel();

  if (!model) {
    throw new Error("Embedding model not available. Set OPENAI_API_KEY.");
  }

  return model;
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): ProviderKey[] {
  const available: ProviderKey[] = [];

  if (hasOpenAI()) {
    available.push("primary", "fast", "reasoning");
  }
  if (hasAnthropic()) {
    available.push("fallback1");
  }
  if (hasGoogle()) {
    available.push("fallback2");
  }

  return available;
}

/**
 * Check if any provider is available
 */
export function hasAnyProvider(): boolean {
  return hasOpenAI() || hasAnthropic() || hasGoogle();
}

// ============================================================================
// Provider Metadata
// ============================================================================

export const PROVIDER_METADATA: Record<ProviderKey, Omit<ProviderConfig, "model">> = {
  primary: {
    name: "GPT-4o",
    costPerMillionTokens: { input: 2.5, output: 10 },
  },
  fallback1: {
    name: "Claude 3.5 Sonnet",
    costPerMillionTokens: { input: 3, output: 15 },
  },
  fallback2: {
    name: "Gemini 1.5 Pro",
    costPerMillionTokens: { input: 1.25, output: 5 },
  },
  fast: {
    name: "GPT-4o-mini",
    costPerMillionTokens: { input: 0.15, output: 0.6 },
  },
  reasoning: {
    name: "o1",
    costPerMillionTokens: { input: 15, output: 60 },
  },
};

export const EMBEDDING_METADATA: Record<EmbeddingProviderKey, Omit<EmbeddingConfig, "model">> = {
  embedding: {
    name: "text-embedding-3-small",
    dimensions: 1536,
    costPerMillionTokens: 0.02,
  },
  embeddingLarge: {
    name: "text-embedding-3-large",
    dimensions: 3072,
    costPerMillionTokens: 0.13,
  },
};
