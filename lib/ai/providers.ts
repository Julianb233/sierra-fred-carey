/**
 * AI Provider Configuration
 *
 * Unified provider configuration using Vercel AI SDK 6.
 * Supports Google Gemini (primary), Anthropic Claude (fallback),
 * with circuit breaker for automatic failover.
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
// Circuit Breaker
// ============================================================================

/** Track failures per provider for circuit breaker pattern */
const providerFailures: Record<string, { count: number; lastFailure: number }> = {};
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_WINDOW = 60000; // 60 seconds

/**
 * Check if a provider is healthy (not circuit-broken).
 * A provider is unhealthy if it has >= CIRCUIT_BREAKER_THRESHOLD failures
 * within the CIRCUIT_BREAKER_WINDOW.
 */
export function isProviderHealthy(provider: string): boolean {
  const failures = providerFailures[provider];
  if (!failures) return true;
  if (Date.now() - failures.lastFailure > CIRCUIT_BREAKER_WINDOW) {
    // Reset after window expires
    delete providerFailures[provider];
    return true;
  }
  return failures.count < CIRCUIT_BREAKER_THRESHOLD;
}

/**
 * Record a failure for a provider. After CIRCUIT_BREAKER_THRESHOLD failures
 * within CIRCUIT_BREAKER_WINDOW, the provider will be marked unhealthy and
 * skipped in the fallback chain.
 */
export function recordFailure(provider: string): void {
  if (!providerFailures[provider]) {
    providerFailures[provider] = { count: 0, lastFailure: 0 };
  }
  providerFailures[provider].count++;
  providerFailures[provider].lastFailure = Date.now();
  console.warn(
    `[AI Circuit Breaker] ${provider} failure #${providerFailures[provider].count} ` +
    `(threshold: ${CIRCUIT_BREAKER_THRESHOLD})`
  );
}

/**
 * Reset the circuit breaker for a provider (e.g., after a successful call).
 */
export function resetFailures(provider: string): void {
  delete providerFailures[provider];
}

/**
 * Get circuit breaker status for monitoring/debugging.
 */
export function getCircuitBreakerStatus(): Record<string, { count: number; lastFailure: number; healthy: boolean }> {
  const status: Record<string, { count: number; lastFailure: number; healthy: boolean }> = {};
  for (const [provider, failures] of Object.entries(providerFailures)) {
    status[provider] = {
      ...failures,
      healthy: isProviderHealthy(provider),
    };
  }
  return status;
}

// ============================================================================
// Provider Availability Check
// ============================================================================

function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function hasGoogle(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

// ============================================================================
// Model Configurations
// ============================================================================

/**
 * Get primary model (Gemini 3 Flash Preview, or OpenAI GPT-4o as last resort)
 */
export function getPrimaryModel(): LanguageModel | null {
  if (hasGoogle()) return google("gemini-3-flash-preview");
  if (hasOpenAI()) return openai("gpt-4o");
  return null;
}

/**
 * Get fallback model 1 (Anthropic Claude Sonnet 4.5)
 */
export function getFallback1Model(): LanguageModel | null {
  if (!hasAnthropic()) return null;
  return anthropic("claude-sonnet-4-5-20250929");
}

/**
 * Get fallback model 2 (Gemini 2.0 Flash — retry with different Gemini model)
 */
export function getFallback2Model(): LanguageModel | null {
  if (!hasGoogle()) return null;
  return google("gemini-2.0-flash");
}

/**
 * Get fast model for quick operations (Gemini 2.0 Flash)
 */
export function getFastModel(): LanguageModel | null {
  if (hasGoogle()) return google("gemini-2.0-flash");
  if (hasOpenAI()) return openai("gpt-4o-mini");
  return null;
}

/**
 * Get reasoning model for complex analysis
 * Prefers Anthropic Claude for reasoning tasks, falls back to Gemini/OpenAI
 */
export function getReasoningModel(): LanguageModel | null {
  if (hasAnthropic() && isProviderHealthy("anthropic")) {
    return anthropic("claude-sonnet-4-5-20250929");
  }
  if (hasGoogle()) return google("gemini-3-flash-preview");
  if (hasOpenAI()) return openai("gpt-4o");
  return null;
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
// Provider Selection with Circuit Breaker
// ============================================================================

/** Map provider keys to their underlying provider name for circuit breaker tracking */
function getProviderName(key: ProviderKey): string {
  switch (key) {
    case "primary":
      return hasGoogle() ? "google" : "openai";
    case "fallback2":
      return "google";
    case "fast":
      return hasGoogle() ? "google" : "openai";
    case "fallback1":
      return "anthropic";
    case "reasoning":
      if (hasAnthropic()) return "anthropic";
      if (hasGoogle()) return "google";
      return "openai";
  }
}

/**
 * Get a model by provider key with fallback support and circuit breaker.
 *
 * The circuit breaker tracks failures per provider. If a provider has
 * >= 3 failures within 60 seconds, it is skipped in favor of the next
 * healthy provider in the fallback chain.
 *
 * Fallback chain:
 *   1. Primary (Gemini 3 Flash Preview)
 *   2. Fallback 1 (Anthropic Claude)
 *   3. Fallback 2 (Gemini 2.0 Flash)
 *   4. Fast (Gemini 2.0 Flash)
 *
 * Callers should use recordFailure() when a provider call fails and
 * resetFailures() on success to maintain circuit breaker state.
 */
export function getModel(key: ProviderKey): LanguageModel {
  const modelFns: Record<ProviderKey, () => LanguageModel | null> = {
    primary: getPrimaryModel,
    fallback1: getFallback1Model,
    fallback2: getFallback2Model,
    fast: getFastModel,
    reasoning: getReasoningModel,
  };

  // Try the requested provider if it's healthy
  const providerName = getProviderName(key);
  if (isProviderHealthy(providerName)) {
    const model = modelFns[key]();
    if (model) return model;
  } else {
    console.warn(
      `[AI Providers] ${key} (${providerName}) circuit-broken, trying fallbacks`
    );
  }

  // Fallback chain: try other providers in order, skipping unhealthy ones
  const fallbackOrder: ProviderKey[] = [
    "primary",
    "fallback1",
    "fallback2",
    "fast",
  ];

  for (const fallbackKey of fallbackOrder) {
    if (fallbackKey === key) continue;
    const fallbackProviderName = getProviderName(fallbackKey);
    if (!isProviderHealthy(fallbackProviderName)) {
      continue; // Skip circuit-broken providers
    }
    const fallbackModel = modelFns[fallbackKey]();
    if (fallbackModel) {
      console.warn(
        `[AI Providers] ${key} not available, falling back to ${fallbackKey} (${fallbackProviderName})`
      );
      return fallbackModel;
    }
  }

  // Last resort: try ALL providers regardless of circuit breaker state
  // (better to try a flaky provider than return nothing)
  for (const fallbackKey of fallbackOrder) {
    const fallbackModel = modelFns[fallbackKey]();
    if (fallbackModel) {
      console.warn(
        `[AI Providers] All healthy providers exhausted, forcing ${fallbackKey} despite circuit breaker`
      );
      return fallbackModel;
    }
  }

  throw new Error(
    "No AI providers configured. Set GOOGLE_API_KEY or ANTHROPIC_API_KEY."
  );
}

/**
 * Get an embedding model by key.
 * Returns null instead of throwing if no embedding provider is available,
 * allowing callers to handle gracefully.
 */
export function getEmbeddingOrNull(
  key: EmbeddingProviderKey = "embedding"
): EmbeddingModel | null {
  return key === "embeddingLarge" ? getLargeEmbeddingModel() : getEmbeddingModel();
}

/**
 * Get an embedding model by key (throws if unavailable)
 */
export function getEmbedding(
  key: EmbeddingProviderKey = "embedding"
): EmbeddingModel {
  const model = getEmbeddingOrNull(key);

  if (!model) {
    throw new Error(
      "Embedding model not available. Set OPENAI_API_KEY for embeddings."
    );
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
  if (hasGoogle()) {
    if (!hasOpenAI()) {
      available.push("primary", "fast", "reasoning");
    }
    available.push("fallback2");
  }
  if (hasAnthropic()) {
    available.push("fallback1");
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
    name: "Gemini 3 Flash Preview",
    costPerMillionTokens: { input: 0.5, output: 3 },
  },
  fallback1: {
    name: "Claude Sonnet 4.5",
    costPerMillionTokens: { input: 3, output: 15 },
  },
  fallback2: {
    name: "Gemini 2.0 Flash",
    costPerMillionTokens: { input: 1.25, output: 5 },
  },
  fast: {
    name: "Gemini 2.0 Flash",
    costPerMillionTokens: { input: 0.1, output: 0.4 },
  },
  reasoning: {
    name: "Claude Sonnet 4.5 / Gemini 3 Flash",
    costPerMillionTokens: { input: 3, output: 15 },
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
