/**
 * Context Window Management
 *
 * Manages token budgets and message trimming to prevent context overflow.
 * Uses model-specific limits from providers.ts.
 */

import type { ProviderKey } from "./providers";
import { generate } from "./fred-client";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TrimOptions {
  /** Maximum tokens allowed (defaults to model limit) */
  maxTokens?: number;
  /** Reserve tokens for the response */
  reserveForResponse?: number;
  /** Always keep the system message */
  keepSystem?: boolean;
  /** Minimum number of recent messages to keep */
  minRecentMessages?: number;
}

export interface TokenEstimate {
  tokens: number;
  messages: number;
}

// ============================================================================
// Model Context Limits
// ============================================================================

const MODEL_CONTEXT_LIMITS: Record<ProviderKey, number> = {
  primary: 128_000,    // GPT-4o
  fallback1: 200_000,  // Claude 3.5 Sonnet
  fallback2: 1_000_000, // Gemini 1.5 Pro
  fast: 128_000,       // GPT-4o-mini
  reasoning: 200_000,  // o1
};

// Average tokens per character (English, conservative estimate)
const CHARS_PER_TOKEN = 4;

// Overhead per message (role, formatting)
const MESSAGE_OVERHEAD_TOKENS = 4;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Estimate the token count of a string.
 * Uses character-based heuristic (4 chars ≈ 1 token for English).
 * This is intentionally conservative — overestimates slightly to avoid overflow.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate total tokens for an array of messages.
 */
export function estimateMessagesTokens(messages: Message[]): TokenEstimate {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.content) + MESSAGE_OVERHEAD_TOKENS;
  }
  return { tokens: total, messages: messages.length };
}

/**
 * Trim messages to fit within the model's context window.
 *
 * Strategy:
 * 1. Always keep the system message (if present and keepSystem=true)
 * 2. Always keep the most recent user message
 * 3. Keep as many recent messages as possible
 * 4. Drop oldest non-system messages first
 */
export function trimMessages(
  messages: Message[],
  model: ProviderKey = "primary",
  options: TrimOptions = {}
): Message[] {
  const {
    maxTokens = MODEL_CONTEXT_LIMITS[model],
    reserveForResponse = 4096,
    keepSystem = true,
    minRecentMessages = 2,
  } = options;

  const budget = maxTokens - reserveForResponse;

  if (budget <= 0) {
    logger.log("[ContextManager] Warning: no token budget remaining after response reservation");
    return messages.slice(-minRecentMessages);
  }

  // Separate system and non-system messages
  const systemMessages = keepSystem ? messages.filter((m) => m.role === "system") : [];
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  // Calculate system message tokens
  let usedTokens = 0;
  for (const msg of systemMessages) {
    usedTokens += estimateTokens(msg.content) + MESSAGE_OVERHEAD_TOKENS;
  }

  // If system messages alone exceed budget, truncate the system message
  if (usedTokens >= budget && systemMessages.length > 0) {
    const maxSystemChars = (budget - MESSAGE_OVERHEAD_TOKENS) * CHARS_PER_TOKEN;
    systemMessages[0] = {
      ...systemMessages[0],
      content: systemMessages[0].content.substring(0, Math.max(100, maxSystemChars)),
    };
    usedTokens = estimateTokens(systemMessages[0].content) + MESSAGE_OVERHEAD_TOKENS;
  }

  const remainingBudget = budget - usedTokens;

  // Greedily add messages from most recent to oldest
  const result: Message[] = [];
  let currentTokens = 0;

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const msg = nonSystemMessages[i];
    const msgTokens = estimateTokens(msg.content) + MESSAGE_OVERHEAD_TOKENS;

    if (currentTokens + msgTokens <= remainingBudget) {
      result.unshift(msg);
      currentTokens += msgTokens;
    } else if (result.length < minRecentMessages) {
      // Force-include minimum recent messages even if over budget
      result.unshift(msg);
      currentTokens += msgTokens;
    } else {
      break;
    }
  }

  const trimmed = [...systemMessages, ...result];

  if (trimmed.length < messages.length) {
    logger.log(
      `[ContextManager] Trimmed ${messages.length - trimmed.length} messages to fit context window ` +
      `(${estimateMessagesTokens(trimmed).tokens} / ${budget} tokens)`
    );
  }

  return trimmed;
}

/**
 * Check if messages fit within the model's context window.
 */
export function fitsInContext(
  messages: Message[],
  model: ProviderKey = "primary",
  reserveForResponse = 4096
): boolean {
  const limit = MODEL_CONTEXT_LIMITS[model];
  const estimate = estimateMessagesTokens(messages);
  return estimate.tokens + reserveForResponse <= limit;
}

/**
 * Get the context limit for a model.
 */
export function getContextLimit(model: ProviderKey): number {
  return MODEL_CONTEXT_LIMITS[model];
}

// ============================================================================
// Conversation Summarization
// ============================================================================

/**
 * Check if a conversation should be summarized based on message count
 * and estimated token usage.
 *
 * Returns true when messages exceed 20 AND the estimated tokens
 * (messages + system prompt) exceed 60% of the model's context limit.
 * The 0.6 threshold triggers summarization before hitting the hard limit,
 * leaving room for the response and buffer.
 */
export function shouldSummarize(
  messages: Message[],
  systemPromptTokens: number,
  model: ProviderKey = "primary"
): boolean {
  if (messages.length <= 20) return false;
  const messageTokens = estimateMessagesTokens(messages).tokens;
  const totalTokens = messageTokens + systemPromptTokens;
  return totalTokens > MODEL_CONTEXT_LIMITS[model] * 0.6;
}

/**
 * Summarize older messages in a conversation using the LLM.
 *
 * Keeps the most recent `keepRecent` messages intact and summarizes
 * older user/assistant messages into a single system message.
 * Preserves key decisions, facts, action items, and founder context.
 *
 * Falls back to trimMessages() if the summarization call fails.
 */
export async function summarizeOlderMessages(
  messages: Message[],
  keepRecent: number = 10
): Promise<Message[]> {
  if (messages.length <= keepRecent) return messages;

  const older = messages.slice(0, -keepRecent);
  const recent = messages.slice(-keepRecent);

  // Filter older to only user and assistant messages (skip system)
  const olderConversation = older.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  if (olderConversation.length === 0) return messages;

  try {
    const formatted = olderConversation
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n");

    const result = await generate(formatted, {
      system:
        "Create a concise summary of a conversation between a founder and their mentor FRED. " +
        "Preserve: key decisions made, important facts shared, action items discussed, " +
        "the founder's current situation and challenges. Keep it under 500 words.",
      maxOutputTokens: 512,
      temperature: 0.3,
    });

    return [
      {
        role: "system" as const,
        content: "Previous conversation summary:\n" + result.text,
      },
      ...recent,
    ];
  } catch (error) {
    logger.log(
      `[ContextManager] Summarization failed, falling back to trimMessages: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return trimMessages(messages);
  }
}
