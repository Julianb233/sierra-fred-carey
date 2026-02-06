/**
 * Multi-Provider Fallback Chain
 *
 * Orchestrates failover between AI providers using circuit breaker
 * pattern and retry logic for maximum reliability.
 */

import type { LanguageModel } from "ai";
import { circuitBreaker, CircuitOpenError } from "./circuit-breaker";
import { withRetry, RETRY_PRESETS } from "./retry";
import {
  getPrimaryModel,
  getFallback1Model,
  getFallback2Model,
  getFastModel,
  hasAnyProvider,
} from "./providers";

// ============================================================================
// Types
// ============================================================================

export type ProviderName = "openai" | "anthropic" | "google";

export interface FallbackConfig {
  /** Provider order for fallback (default: openai -> anthropic -> google) */
  providerOrder?: ProviderName[];
  /** Enable retry per provider (default: true) */
  enableRetry?: boolean;
  /** Retry configuration preset (default: standard) */
  retryPreset?: keyof typeof RETRY_PRESETS;
  /** Skip providers with open circuits (default: true) */
  skipOpenCircuits?: boolean;
  /** Callback for provider switches */
  onProviderSwitch?: (from: ProviderName, to: ProviderName, error: Error) => void;
}

export interface FallbackResult<T> {
  result: T;
  provider: ProviderName;
  attempts: number;
  fallbacks: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_FALLBACK_ORDER: ProviderName[] = ["openai", "anthropic", "google"];

const DEFAULT_CONFIG: FallbackConfig = {
  providerOrder: DEFAULT_FALLBACK_ORDER,
  enableRetry: true,
  retryPreset: "standard",
  skipOpenCircuits: true,
};

// ============================================================================
// Provider to Model Mapping
// ============================================================================

function getModelForProvider(provider: ProviderName): LanguageModel | null {
  switch (provider) {
    case "openai":
      return getPrimaryModel() || getFastModel();
    case "anthropic":
      return getFallback1Model();
    case "google":
      return getFallback2Model();
    default:
      return null;
  }
}

function isProviderAvailable(provider: ProviderName): boolean {
  return getModelForProvider(provider) !== null;
}

// ============================================================================
// Fallback Chain Implementation
// ============================================================================

/**
 * Execute an operation with automatic provider fallback
 */
export async function executeWithFallback<T>(
  operation: (provider: ProviderName, model: LanguageModel) => Promise<T>,
  config: FallbackConfig = {}
): Promise<FallbackResult<T>> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { providerOrder, enableRetry, retryPreset, skipOpenCircuits, onProviderSwitch } =
    fullConfig;

  if (!hasAnyProvider()) {
    throw new Error(
      "No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY."
    );
  }

  let lastError: Error | null = null;
  let fallbacks = 0;
  let previousProvider: ProviderName | null = null;

  for (const provider of providerOrder!) {
    // Check if provider is available
    const model = getModelForProvider(provider);
    if (!model) {
      continue;
    }

    // Skip providers with open circuits if configured
    if (skipOpenCircuits && !circuitBreaker.isAvailable(provider)) {
      console.warn(`[Fallback] Skipping ${provider} - circuit is open`);
      continue;
    }

    try {
      // Execute with circuit breaker protection
      const result = await circuitBreaker.execute(
        provider,
        async () => {
          // Apply retry logic if enabled
          if (enableRetry) {
            return withRetry(
              () => operation(provider, model),
              RETRY_PRESETS[retryPreset!]
            );
          }
          return operation(provider, model);
        }
      );

      return {
        result,
        provider,
        attempts: 1, // Simplified - actual attempts tracked by retry
        fallbacks,
      };
    } catch (error) {
      lastError = error as Error;
      fallbacks++;

      // Notify of provider switch
      if (previousProvider && onProviderSwitch) {
        onProviderSwitch(previousProvider, provider, lastError);
      }
      previousProvider = provider;

      // Log the failure
      if (error instanceof CircuitOpenError) {
        console.warn(
          `[Fallback] ${provider} circuit is open, trying next provider...`
        );
      } else {
        console.warn(
          `[Fallback] ${provider} failed: ${lastError.message}, trying next provider...`
        );
      }
    }
  }

  // All providers failed
  throw new AllProvidersFailedError(
    providerOrder!,
    lastError!
  );
}

/**
 * Execute a simple operation (text generation) with fallback
 */
export async function generateWithFallback(
  operation: (model: LanguageModel) => Promise<string>,
  config: FallbackConfig = {}
): Promise<string> {
  const result = await executeWithFallback(
    async (provider, model) => operation(model),
    config
  );
  return result.result;
}

// ============================================================================
// Specialized Fallback Functions
// ============================================================================

/**
 * Get the best available provider (respecting circuit states)
 */
export function getBestAvailableProvider(): ProviderName | null {
  for (const provider of DEFAULT_FALLBACK_ORDER) {
    if (isProviderAvailable(provider) && circuitBreaker.isAvailable(provider)) {
      return provider;
    }
  }
  return null;
}

/**
 * Get all healthy providers
 */
export function getHealthyProviders(): ProviderName[] {
  return DEFAULT_FALLBACK_ORDER.filter(
    (provider) =>
      isProviderAvailable(provider) && circuitBreaker.isAvailable(provider)
  );
}

/**
 * Get provider availability status
 */
export function getProviderAvailability(): Record<
  ProviderName,
  { configured: boolean; circuitHealthy: boolean }
> {
  const result: Record<ProviderName, { configured: boolean; circuitHealthy: boolean }> =
    {} as Record<ProviderName, { configured: boolean; circuitHealthy: boolean }>;

  for (const provider of DEFAULT_FALLBACK_ORDER) {
    result[provider] = {
      configured: isProviderAvailable(provider),
      circuitHealthy: circuitBreaker.isAvailable(provider),
    };
  }

  return result;
}

// ============================================================================
// Custom Errors
// ============================================================================

export class AllProvidersFailedError extends Error {
  constructor(
    public providers: ProviderName[],
    public lastError: Error
  ) {
    super(
      `All AI providers failed: ${providers.join(", ")}. Last error: ${lastError.message}`
    );
    this.name = "AllProvidersFailedError";
  }
}

// ============================================================================
// Exports for Provider Constants
// ============================================================================

export { DEFAULT_FALLBACK_ORDER };
