/**
 * Prompt Injection Guard
 *
 * Detects and sanitizes prompt injection attempts in user input.
 * Protects AI pipeline from manipulation via crafted inputs.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface InjectionDetectionResult {
  isInjection: boolean;
  confidence: number;
  patterns: string[];
  sanitizedInput: string;
}

// ============================================================================
// Injection Patterns
// ============================================================================

const INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp; weight: number }> = [
  // Direct instruction override attempts
  { name: "ignore_previous", pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?|context)/i, weight: 0.95 },
  { name: "new_instructions", pattern: /(?:new|updated|revised)\s+instructions?:\s/i, weight: 0.9 },
  { name: "system_override", pattern: /(?:system|admin|root)\s*(?:prompt|message|instruction|override|command)\s*:/i, weight: 0.95 },
  { name: "you_are_now", pattern: /you\s+are\s+now\s+(?:a|an|the)\s/i, weight: 0.85 },
  { name: "act_as", pattern: /(?:act|behave|pretend|respond)\s+as\s+(?:if\s+you\s+are|a|an|the)/i, weight: 0.7 },
  { name: "forget_everything", pattern: /forget\s+(?:everything|all|your)\s/i, weight: 0.9 },
  { name: "disregard", pattern: /disregard\s+(?:all|any|the|your)\s+(?:previous|prior|above|instructions?|rules?|guidelines?)/i, weight: 0.95 },

  // Role/persona manipulation
  { name: "jailbreak_dan", pattern: /\b(?:DAN|do\s+anything\s+now|jailbreak)\b/i, weight: 0.9 },
  { name: "developer_mode", pattern: /(?:developer|debug|testing|maintenance)\s+mode\s*(?:enabled|activated|on)/i, weight: 0.85 },

  // Prompt leaking attempts
  { name: "reveal_prompt", pattern: /(?:reveal|show|display|print|output|repeat|echo)\s+(?:your|the|system)\s+(?:prompt|instructions?|rules?|guidelines?)/i, weight: 0.85 },
  { name: "what_are_instructions", pattern: /what\s+(?:are|were)\s+your\s+(?:instructions?|system\s+prompt|rules?|guidelines?)/i, weight: 0.8 },

  // Delimiter injection
  { name: "delimiter_injection", pattern: /```(?:system|admin|instruction|prompt)\b/i, weight: 0.9 },
  { name: "xml_injection", pattern: /<\/?(?:system|instruction|prompt|admin|command|override)>/i, weight: 0.85 },

  // Encoding/obfuscation attempts
  { name: "base64_instruction", pattern: /(?:decode|base64|eval)\s*\(\s*['"`]/i, weight: 0.8 },
  { name: "unicode_escape", pattern: /\\u[0-9a-f]{4}\s*\\u[0-9a-f]{4}\s*\\u[0-9a-f]{4}/i, weight: 0.7 },

  // Output manipulation
  { name: "output_format_override", pattern: /(?:always|must|only)\s+respond\s+(?:with|in|as)/i, weight: 0.6 },
  { name: "response_override", pattern: /(?:your\s+)?response\s+(?:should|must|will)\s+(?:be|start\s+with|contain|include)\s*:/i, weight: 0.75 },
];

// Strings that should be stripped/escaped from user input before embedding in prompts
const DANGEROUS_STRINGS = [
  "{{",
  "}}",
  "{%",
  "%}",
  "<%",
  "%>",
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Detect if user input contains prompt injection attempts.
 *
 * Returns detection result with confidence score and matched patterns.
 */
export function detectInjectionAttempt(input: string): InjectionDetectionResult {
  const matchedPatterns: string[] = [];
  let maxWeight = 0;

  for (const { name, pattern, weight } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      matchedPatterns.push(name);
      maxWeight = Math.max(maxWeight, weight);
    }
  }

  // Multiple pattern matches increase confidence
  const confidence = matchedPatterns.length > 0
    ? Math.min(maxWeight + (matchedPatterns.length - 1) * 0.05, 1)
    : 0;

  const isInjection = confidence >= 0.7;

  if (isInjection) {
    logger.log(
      `[PromptGuard] Injection attempt detected (confidence: ${confidence.toFixed(2)}):`,
      matchedPatterns.join(", ")
    );
  }

  return {
    isInjection,
    confidence,
    patterns: matchedPatterns,
    sanitizedInput: sanitizeUserInput(input),
  };
}

/**
 * Sanitize user input for safe embedding in AI prompts.
 *
 * - Strips template syntax that could break prompt boundaries
 * - Normalizes whitespace
 * - Truncates to max length
 * - Does NOT strip legitimate content — only dangerous metacharacters
 */
export function sanitizeUserInput(input: string, maxLength = 10000): string {
  let sanitized = input;

  // Remove dangerous template strings
  for (const dangerous of DANGEROUS_STRINGS) {
    sanitized = sanitized.split(dangerous).join("");
  }

  // Normalize excessive whitespace (but keep paragraph structure)
  sanitized = sanitized.replace(/[ \t]{10,}/g, " ");
  sanitized = sanitized.replace(/\n{5,}/g, "\n\n\n");

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}

/**
 * Wrap user input in delimiters for safe prompt embedding.
 * This prevents the model from confusing user content with instructions.
 */
export function wrapUserInput(input: string): string {
  const sanitized = sanitizeUserInput(input);
  return `<user_message>\n${sanitized}\n</user_message>`;
}

/**
 * Sanitize a dynamically-assembled context block before injecting it into the
 * system prompt.  This is used for context blocks built from user-controlled
 * data (enrichment data, semantic memory values, evidence content) that flow
 * through `buildFounderContext` or `buildProgressContext`.
 *
 * Applies the same sanitization as `sanitizeUserInput` but with a higher
 * length limit appropriate for structured context blocks, and additionally
 * strips XML-style tags that could be confused with prompt boundaries.
 */
export function sanitizeContextString(contextBlock: string, maxLength = 20000): string {
  let sanitized = contextBlock;

  // Remove dangerous template strings
  for (const dangerous of DANGEROUS_STRINGS) {
    sanitized = sanitized.split(dangerous).join("");
  }

  // Strip XML-style tags that could be confused with system/instruction boundaries
  sanitized = sanitized.replace(/<\/?(?:system|instruction|prompt|admin|command|override|user_message)>/gi, "");

  // Normalize excessive whitespace (but keep paragraph structure)
  sanitized = sanitized.replace(/[ \t]{10,}/g, " ");
  sanitized = sanitized.replace(/\n{5,}/g, "\n\n\n");

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}
