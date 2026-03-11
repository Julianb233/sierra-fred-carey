/**
 * AI Provider Configuration
 *
 * Unified provider configuration using Vercel AI SDK 6.
 * Supports xAI (Grok), OpenAI, Anthropic, and Google with automatic fallback.
 *
 * Provider priority (when XAI_API_KEY is set):
 *   primary   -> Grok 3 Fast (xAI) -- lowest latency, streaming-optimized
 *   fallback1 -> GPT-4o (OpenAI)
 *   fallback2 -> Claude Sonnet (Anthropic)
 *   fallback3 -> Gemini 2.0 Flash (Google)
 *   fast      -> Grok 3 Mini Fast (xAI)
 *   reasoning -> o3 (OpenAI)
 */

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import type { LanguageModel, EmbeddingModel } from "ai";

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderKey =
  | "primary"
  | "fallback1"
  | "fallback2"
  | "fallback3"
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

export function hasXai(): boolean {
  return !!process.env.XAI_API_KEY;
}

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
 * Get primary model -- Grok 3 Fast (xAI) for lowest latency streaming.
 * Falls back to GPT-4o if XAI_API_KEY is not set.
 */
export function getPrimaryModel(): LanguageModel | null {
  if (hasXai()) return xai("grok-3-fast");
  if (hasOpenAI()) return openai("gpt-4o");
  return null;
}

/**
 * Get fallback model 1 (GPT-4o)
 */
export function getFallback1Model(): LanguageModel | null {
  if (!hasOpenAI()) return null;
  return openai("gpt-4o");
}

/**
 * Get fallback model 2 (Claude Sonnet 4.5)
 */
export function getFallback2Model(): LanguageModel | null {
  if (!hasAnthropic()) return null;
  return anthropic("claude-sonnet-4-5-20250929");
}

/**
 * Get fallback model 3 (Gemini 2.0 Flash)
 */
export function getFallback3Model(): LanguageModel | null {
  if (!hasGoogle()) return null;
  return google("gemini-2.0-flash");
}

/**
 * Get fast model -- Grok 3 Mini Fast for quick, low-cost operations.
 * Falls back to GPT-4o-mini if XAI_API_KEY is not set.
 */
export function getFastModel(): LanguageModel | null {
  if (hasXai()) return xai("grok-3-mini-fast");
  if (hasOpenAI()) return openai("gpt-4o-mini");
  return null;
}

/**
 * Get reasoning model for complex analysis (o3)
 */
export function getReasoningModel(): LanguageModel | null {
  if (!hasOpenAI()) return null;
  return openai("o3");
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
    fallback3: getFallback3Model,
    fast: getFastModel,
    reasoning: getReasoningModel,
  };

  const model = modelFns[key]();
  if (model) return model;

  const fallbackOrder: ProviderKey[] = [
    "primary",
    "fallback1",
    "fallback2",
    "fallback3",
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
    "No AI providers configured. Set XAI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY."
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

  if (hasXai()) {
    available.push("primary", "fast");
  }
  if (hasOpenAI()) {
    if (!hasXai()) available.push("primary", "fast");
    available.push("fallback1", "reasoning");
  }
  if (hasAnthropic()) {
    available.push("fallback2");
  }
  if (hasGoogle()) {
    available.push("fallback3");
  }

  return available;
}

/**
 * Check if any provider is available
 */
export function hasAnyProvider(): boolean {
  return hasXai() || hasOpenAI() || hasAnthropic() || hasGoogle();
}

// ============================================================================
// Provider Metadata
// ============================================================================

export const PROVIDER_METADATA: Record<ProviderKey, Omit<ProviderConfig, "model">> = {
  primary: {
    name: "Grok 3 Fast",
    costPerMillionTokens: { input: 5, output: 25 },
  },
  fallback1: {
    name: "GPT-4o",
    costPerMillionTokens: { input: 2.5, output: 10 },
  },
  fallback2: {
    name: "Claude Sonnet 4.5",
    costPerMillionTokens: { input: 3, output: 15 },
  },
  fallback3: {
    name: "Gemini 2.0 Flash",
    costPerMillionTokens: { input: 1.25, output: 5 },
  },
  fast: {
    name: "Grok 3 Mini Fast",
    costPerMillionTokens: { input: 0.3, output: 0.5 },
  },
  reasoning: {
    name: "o3",
    costPerMillionTokens: { input: 10, output: 40 },
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
