/**
 * FRED AI Client
 *
 * Unified AI client using Vercel AI SDK 6 with:
 * - Structured outputs via Zod schemas
 * - Streaming support
 * - Embedding generation
 * - Automatic provider fallback
 * - Request/response logging
 */

import {
  generateText,
  generateObject,
  streamText,
  streamObject,
  embed,
  embedMany,
  type StreamTextResult,
} from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";
import {
  getModel,
  getEmbedding,
  type ProviderKey,
  type EmbeddingProviderKey,
  PROVIDER_METADATA,
} from "./providers";
import {
  executeWithFallback,
  type ProviderName,
  type FallbackConfig,
} from "./fallback-chain";
import { withRetry as withRetryAdvanced, RETRY_PRESETS } from "./retry";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface GenerateOptions {
  /** Which model to use (default: primary) */
  model?: ProviderKey;
  /** Maximum output tokens to generate */
  maxOutputTokens?: number;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** System prompt to prepend */
  system?: string;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  modelId: string;
}

export interface StructuredGenerateResult<T> {
  object: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  modelId: string;
}

export interface EmbeddingOptions {
  /** Which embedding model to use */
  model?: EmbeddingProviderKey;
}

export interface EmbeddingResult {
  embedding: number[];
  usage: {
    tokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  usage: {
    tokens: number;
  };
}

// ============================================================================
// Text Generation
// ============================================================================

/**
 * Generate text from a prompt
 *
 * @example
 * const result = await generate("What is 2+2?");
 * logger.log(result.text); // "4"
 */
export async function generate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const model = getModel(options.model || "primary");

  const result = await generateText({
    model,
    prompt,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    abortSignal: options.abortSignal,
  });

  return {
    text: result.text,
    usage: {
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
      totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
    },
    finishReason: result.finishReason,
    modelId: result.response?.modelId ?? "unknown",
  };
}

/**
 * Generate text from a conversation (messages array)
 *
 * @example
 * const result = await generateFromMessages([
 *   { role: "user", content: "Hello" },
 *   { role: "assistant", content: "Hi there!" },
 *   { role: "user", content: "How are you?" }
 * ]);
 */
export async function generateFromMessages(
  messages: ModelMessage[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const model = getModel(options.model || "primary");

  const result = await generateText({
    model,
    messages,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    abortSignal: options.abortSignal,
  });

  return {
    text: result.text,
    usage: {
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
      totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
    },
    finishReason: result.finishReason,
    modelId: result.response?.modelId ?? "unknown",
  };
}

// ============================================================================
// Structured Output Generation
// ============================================================================

/**
 * Generate a structured object from a prompt using a Zod schema
 *
 * @example
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 *
 * const result = await generateStructured(
 *   "Extract: John is 25 years old",
 *   schema
 * );
 * logger.log(result.object); // { name: "John", age: 25 }
 */
export async function generateStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: GenerateOptions = {}
): Promise<StructuredGenerateResult<z.infer<T>>> {
  const model = getModel(options.model || "primary");

  const result = await generateObject({
    model,
    prompt,
    schema,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.5, // Lower temp for structured output
    abortSignal: options.abortSignal,
  });

  return {
    object: result.object as z.infer<T>,
    usage: {
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
      totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
    },
    finishReason: result.finishReason,
    modelId: result.response?.modelId ?? "unknown",
  };
}

/**
 * Generate a structured object from messages using a Zod schema
 */
export async function generateStructuredFromMessages<T extends z.ZodType>(
  messages: ModelMessage[],
  schema: T,
  options: GenerateOptions = {}
): Promise<StructuredGenerateResult<z.infer<T>>> {
  const model = getModel(options.model || "primary");

  const result = await generateObject({
    model,
    messages,
    schema,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.5,
    abortSignal: options.abortSignal,
  });

  return {
    object: result.object as z.infer<T>,
    usage: {
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
      totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
    },
    finishReason: result.finishReason,
    modelId: result.response?.modelId ?? "unknown",
  };
}

// ============================================================================
// Streaming Generation
// ============================================================================

/**
 * Stream text generation from a prompt
 *
 * @example
 * const stream = await streamGenerate("Write a poem about AI");
 * for await (const chunk of stream.textStream) {
 *   process.stdout.write(chunk);
 * }
 */
export async function streamGenerate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<StreamTextResult<Record<string, never>, never>> {
  const model = getModel(options.model || "primary");

  return streamText({
    model,
    prompt,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    abortSignal: options.abortSignal,
  });
}

/**
 * Stream text generation from messages
 */
export async function streamGenerateFromMessages(
  messages: ModelMessage[],
  options: GenerateOptions = {}
): Promise<StreamTextResult<Record<string, never>, never>> {
  const model = getModel(options.model || "primary");

  return streamText({
    model,
    messages,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    abortSignal: options.abortSignal,
  });
}

/**
 * Convert a stream result to an async generator of text chunks
 *
 * @example
 * const stream = await streamGenerate("Write a poem");
 * for await (const chunk of streamToGenerator(stream)) {
 *   process.stdout.write(chunk);
 * }
 */
export async function* streamToGenerator(
  result: StreamTextResult<Record<string, never>, never>
): AsyncGenerator<string> {
  for await (const chunk of result.textStream) {
    yield chunk;
  }
}

/**
 * Convert a stream result to a ReadableStream for HTTP responses
 */
export function streamToReadableStream(
  result: StreamTextResult<Record<string, never>, never>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

// ============================================================================
// Streaming Structured Output
// ============================================================================

/**
 * Stream structured object generation with partial updates
 *
 * @example
 * const schema = z.object({ items: z.array(z.string()) });
 * const stream = await streamStructured("List 5 colors", schema);
 * for await (const partial of stream.partialObjectStream) {
 *   logger.log(partial); // { items: ["red"] }, { items: ["red", "blue"] }, ...
 * }
 */
export async function streamStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: GenerateOptions = {}
) {
  const model = getModel(options.model || "primary");

  return streamObject({
    model,
    prompt,
    schema,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
    temperature: options.temperature ?? 0.5,
    abortSignal: options.abortSignal,
  });
}

// ============================================================================
// Embeddings
// ============================================================================

/**
 * Generate an embedding for a single text
 *
 * @example
 * const result = await generateEmbedding("Hello world");
 * logger.log(result.embedding); // [0.1, 0.2, ...]
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
  const model = getEmbedding(options.model || "embedding");

  const result = await embed({
    model,
    value: text,
  });

  return {
    embedding: result.embedding,
    usage: {
      tokens: result.usage.tokens,
    },
  };
}

/**
 * Generate embeddings for multiple texts in a single batch
 *
 * @example
 * const result = await generateEmbeddings(["Hello", "World"]);
 * logger.log(result.embeddings); // [[0.1, ...], [0.2, ...]]
 */
export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<BatchEmbeddingResult> {
  const model = getEmbedding(options.model || "embedding");

  const result = await embedMany({
    model,
    values: texts,
  });

  return {
    embeddings: result.embeddings,
    usage: {
      tokens: result.usage.tokens,
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the estimated cost of a generation
 */
export function estimateCost(
  usage: { promptTokens: number; completionTokens: number },
  model: ProviderKey = "primary"
): number {
  const metadata = PROVIDER_METADATA[model];
  const inputCost = (usage.promptTokens / 1_000_000) * metadata.costPerMillionTokens.input;
  const outputCost = (usage.completionTokens / 1_000_000) * metadata.costPerMillionTokens.output;
  return inputCost + outputCost;
}

/**
 * Create a retry wrapper for AI operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoffMultiplier = 2 } = options;

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        console.warn(
          `[FRED Client] Attempt ${attempt + 1} failed, retrying in ${currentDelay}ms:`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
}

/**
 * Create a timeout wrapper for AI operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Reliable Generation (with Circuit Breaker + Fallback)
// ============================================================================

export interface ReliableGenerateOptions extends GenerateOptions {
  /** Fallback configuration */
  fallback?: FallbackConfig;
  /** Use enhanced retry logic (default: true) */
  useRetry?: boolean;
  /** Retry preset (default: standard) */
  retryPreset?: keyof typeof RETRY_PRESETS;
}

/**
 * Generate structured output with automatic provider fallback
 *
 * Uses circuit breaker + retry logic for maximum reliability.
 * This is the recommended function for agent tools that need structured output.
 *
 * @example
 * const schema = z.object({ name: z.string(), age: z.number() });
 * const result = await generateStructuredReliable("John is 25", schema);
 * logger.log(result.object); // { name: "John", age: 25 }
 */
export async function generateStructuredReliable<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: ReliableGenerateOptions = {}
): Promise<StructuredGenerateResult<z.infer<T>> & { provider: ProviderName; fallbacks: number }> {
  const { fallback, useRetry = true, retryPreset = "standard", ...generateOptions } = options;

  const fallbackResult = await executeWithFallback(
    async (_provider, model) => {
      const operation = async () => {
        const result = await generateObject({
          model,
          prompt,
          schema,
          system: generateOptions.system,
          maxOutputTokens: generateOptions.maxOutputTokens ?? 4096,
          temperature: generateOptions.temperature ?? 0.5,
          abortSignal: generateOptions.abortSignal,
        });

        return {
          object: result.object as z.infer<T>,
          usage: {
            promptTokens: result.usage.inputTokens ?? 0,
            completionTokens: result.usage.outputTokens ?? 0,
            totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
          },
          finishReason: result.finishReason,
          modelId: result.response?.modelId ?? "unknown",
        };
      };

      if (useRetry) {
        return withRetryAdvanced(operation, RETRY_PRESETS[retryPreset]);
      }
      return operation();
    },
    {
      ...fallback,
      enableRetry: false, // We handle retry above
    }
  );

  return {
    ...fallbackResult.result,
    provider: fallbackResult.provider,
    fallbacks: fallbackResult.fallbacks,
  };
}
