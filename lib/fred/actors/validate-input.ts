/**
 * Validate Input Actor
 *
 * Parses and validates user input, extracting intent, entities, and determining
 * if clarification is needed before proceeding.
 */

import { logger } from "@/lib/logger";
import {
  detectInjectionAttempt,
  sanitizeUserInput,
} from "@/lib/ai/guards/prompt-guard";
import type {
  UserInput,
  ValidatedInput,
  MemoryContext,
  InputIntent,
  ExtractedEntity,
  ClarificationRequest,
  CoachingTopic,
  BurnoutSignals,
  ConversationStateContext,
} from "../types";
import { STEP_ORDER, type StartupStep } from "@/lib/ai/frameworks/startup-process";
import { detectBurnoutSignals } from "./burnout-detector";

/**
 * Validate and parse user input
 */
export async function validateInputActor(
  input: UserInput,
  memoryContext: MemoryContext | null,
  conversationState?: ConversationStateContext | null
): Promise<ValidatedInput> {
  logger.log("[FRED] Validating input:", input.message.substring(0, 100));

  // Check for prompt injection attempts
  const injectionCheck = detectInjectionAttempt(input.message);
  if (injectionCheck.isInjection) {
    logger.log(
      `[FRED] Prompt injection blocked (confidence: ${injectionCheck.confidence.toFixed(2)}):`,
      injectionCheck.patterns.join(", ")
    );
    return {
      originalMessage: input.message,
      intent: "unknown",
      entities: [],
      confidence: 0,
      clarificationNeeded: [{
        question: "I wasn't able to process that input. Could you rephrase your question?",
        reason: "Input validation failed",
        required: true,
      }],
      keywords: [],
      sentiment: "neutral",
      urgency: "low",
    };
  }

  // Sanitize input for downstream processing
  const sanitizedMessage = sanitizeUserInput(input.message);

  // Extract intent from the message
  const intentResult = await detectIntent(sanitizedMessage);

  // Extract entities from the message
  const entities = await extractEntities(sanitizedMessage);

  // Determine if clarification is needed
  const clarificationNeeded = determineClarificationNeeds(
    input,
    intentResult,
    entities,
    memoryContext
  );

  // Analyze sentiment
  const sentiment = analyzeSentiment(sanitizedMessage);

  // Detect urgency
  const urgency = detectUrgency(sanitizedMessage, intentResult.intent);

  // Extract keywords
  const keywords = extractKeywords(sanitizedMessage);

  // Detect coaching topic (orthogonal to intent)
  const topic = detectTopic(sanitizedMessage, keywords);

  // Detect burnout signals for founder wellbeing
  const burnoutSignals = detectBurnoutSignals(sanitizedMessage);

  // Phase 36: Step-relevance and drift detection
  let stepRelevance: { targetStep: StartupStep; confidence: number } | null = null;
  let driftDetected: { isDrift: boolean; targetStep: StartupStep; currentStep: StartupStep } | null = null;

  if (conversationState) {
    stepRelevance = detectStepRelevance(sanitizedMessage, keywords, conversationState.currentStep);
    driftDetected = detectDrift(stepRelevance, conversationState);
  }

  return {
    originalMessage: input.message,
    intent: intentResult.intent,
    topic,
    entities,
    confidence: intentResult.confidence,
    clarificationNeeded,
    keywords,
    sentiment,
    urgency,
    burnoutSignals,
    stepRelevance,
    driftDetected,
  };
}

/**
 * Detect the user's intent from their message
 */
async function detectIntent(
  message: string
): Promise<{ intent: InputIntent; confidence: number }> {
  const lowerMessage = message.toLowerCase();

  // Simple rule-based intent detection (will be enhanced with AI later)
  const intentPatterns: Array<{
    intent: InputIntent;
    patterns: RegExp[];
    weight: number;
  }> = [
    {
      intent: "decision_request",
      patterns: [
        /should\s+(i|we)/i,
        /what\s+should/i,
        /decide\s+(between|on|about)/i,
        /which\s+(option|way|approach)/i,
        /help\s+(me\s+)?decide/i,
        /is\s+it\s+(worth|better|good\s+idea)/i,
        /recommend/i,
        /advice\s+on/i,
      ],
      weight: 0.95,
    },
    {
      intent: "question",
      patterns: [
        /^(what|how|why|when|where|who|which)\s/i,
        /\?$/,
        /can\s+you\s+(explain|tell)/i,
        /i('m|\s+am)\s+(wondering|curious)/i,
      ],
      weight: 0.85,
    },
    {
      intent: "information",
      patterns: [
        /^(here('s|is)|i('ve|\s+have)|we('ve|\s+have)|our)/i,
        /let\s+me\s+(tell|share|explain)/i,
        /for\s+your\s+(information|reference)/i,
        /fyi/i,
      ],
      weight: 0.80,
    },
    {
      intent: "feedback",
      patterns: [
        /^(thanks|thank\s+you|great|good|that('s|\s+is)\s+(helpful|useful))/i,
        /worked|didn('t|\s+not)\s+work/i,
        /actually/i,
        /i\s+(meant|mean)/i,
        /correct(ion)?/i,
      ],
      weight: 0.75,
    },
    {
      intent: "greeting",
      patterns: [
        /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i,
        /^(what('s|\s+is)\s+up|howdy)/i,
      ],
      weight: 0.90,
    },
  ];

  let bestMatch: { intent: InputIntent; confidence: number } = {
    intent: "unknown",
    confidence: 0.3,
  };

  for (const { intent, patterns, weight } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        if (weight > bestMatch.confidence) {
          bestMatch = { intent, confidence: weight };
        }
        break; // Found match for this intent, move to next
      }
    }
  }

  // Boost confidence if message length suggests thoughtful input
  if (message.length > 100 && bestMatch.intent === "decision_request") {
    bestMatch.confidence = Math.min(bestMatch.confidence + 0.05, 1);
  }

  return bestMatch;
}

/**
 * Extract named entities from the message
 */
async function extractEntities(message: string): Promise<ExtractedEntity[]> {
  const entities: ExtractedEntity[] = [];

  // Money patterns
  const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|usd|k|m|million|billion)/gi;
  let match;
  while ((match = moneyPattern.exec(message)) !== null) {
    entities.push({
      type: "money",
      value: match[0],
      confidence: 0.9,
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  // Date patterns
  const datePattern = /(?:next|this|last)\s+(?:week|month|quarter|year)|(?:in\s+)?\d+\s+(?:days?|weeks?|months?|years?)|(?:by|before|after)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi;
  while ((match = datePattern.exec(message)) !== null) {
    entities.push({
      type: "date",
      value: match[0],
      confidence: 0.85,
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  // Metric patterns (percentages, numbers with context)
  const metricPattern = /\d+(?:\.\d+)?%|\d+(?:x|X)\s*(?:revenue|growth|return)/gi;
  while ((match = metricPattern.exec(message)) !== null) {
    entities.push({
      type: "metric",
      value: match[0],
      confidence: 0.85,
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  return entities;
}

/**
 * Determine if clarification is needed before proceeding
 */
function determineClarificationNeeds(
  input: UserInput,
  intentResult: { intent: InputIntent; confidence: number },
  entities: ExtractedEntity[],
  memoryContext: MemoryContext | null
): ClarificationRequest[] {
  const clarifications: ClarificationRequest[] = [];

  // Low confidence intent
  if (intentResult.confidence < 0.6) {
    clarifications.push({
      question: "Could you help me understand what you're looking for?",
      reason: "I want to make sure I address your needs correctly.",
      options: [
        "I need help making a decision",
        "I have a question",
        "I'm sharing information",
        "I'm giving feedback on your previous response",
      ],
      required: true,
    });
  }

  // Decision request without clear options
  if (
    intentResult.intent === "decision_request" &&
    !input.message.toLowerCase().includes("or") &&
    !input.message.match(/between|option|choice/i)
  ) {
    clarifications.push({
      question: "What options or alternatives are you considering?",
      reason: "Understanding your options helps me provide better analysis.",
      required: false,
    });
  }

  // No startup context in memory and decision-related query
  if (
    intentResult.intent === "decision_request" &&
    memoryContext &&
    memoryContext.relevantFacts.length === 0
  ) {
    clarifications.push({
      question: "Could you tell me a bit about your startup or situation?",
      reason: "This context will help me give you more relevant advice.",
      required: false,
    });
  }

  return clarifications;
}

/**
 * Analyze the sentiment of the message
 */
function analyzeSentiment(
  message: string
): "positive" | "negative" | "neutral" | "mixed" {
  const lowerMessage = message.toLowerCase();

  const positiveWords = [
    "great",
    "good",
    "excellent",
    "amazing",
    "love",
    "excited",
    "opportunity",
    "growth",
    "success",
    "win",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "worried",
    "concerned",
    "problem",
    "issue",
    "fail",
    "lose",
    "struggle",
    "difficult",
  ];

  const positiveCount = positiveWords.filter((w) =>
    lowerMessage.includes(w)
  ).length;
  const negativeCount = negativeWords.filter((w) =>
    lowerMessage.includes(w)
  ).length;

  if (positiveCount > 0 && negativeCount > 0) return "mixed";
  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

/**
 * Detect urgency level
 */
function detectUrgency(
  message: string,
  intent: InputIntent
): "low" | "medium" | "high" | "critical" {
  const lowerMessage = message.toLowerCase();

  const criticalIndicators = [
    "asap",
    "urgent",
    "emergency",
    "immediately",
    "right now",
    "today",
  ];
  const highIndicators = [
    "soon",
    "this week",
    "deadline",
    "time sensitive",
    "quickly",
  ];
  const mediumIndicators = ["when you can", "next week", "coming up"];

  if (criticalIndicators.some((i) => lowerMessage.includes(i))) return "critical";
  if (highIndicators.some((i) => lowerMessage.includes(i))) return "high";
  if (mediumIndicators.some((i) => lowerMessage.includes(i))) return "medium";

  // Decision requests default to medium urgency
  if (intent === "decision_request") return "medium";

  return "low";
}

/**
 * Extract keywords from the message
 */
function extractKeywords(message: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
    "because", "until", "while", "this", "that", "these", "those", "i",
    "me", "my", "we", "our", "you", "your", "he", "him", "his", "she",
    "her", "it", "its", "they", "them", "their", "what", "which", "who",
  ]);

  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  // Return unique keywords, limited to top 10
  return [...new Set(words)].slice(0, 10);
}

/**
 * Detect coaching topic from message content and extracted keywords.
 * Maps to COACHING_PROMPTS keys in prompts.ts.
 */
// ============================================================================
// Step-Relevance & Drift Detection (Phase 36)
// ============================================================================

/**
 * Detect which startup step the user's message relates to.
 * Uses exact phrases (multi-word, matched with includes) and single-keyword
 * regex patterns (word-boundary to avoid false positives like "scale" matching "escalate").
 */
function detectStepRelevance(
  message: string,
  keywords: string[],
  currentStep: StartupStep
): { targetStep: StartupStep; confidence: number } | null {
  const stepSignals: Record<StartupStep, Array<string | RegExp>> = {
    problem: [/\bproblem\b/, "pain point", /\bissue\b/, /\bfrustrat\w*\b/, /\bbroken\b/, /\binefficient\b/, /\bstruggl\w*\b/],
    buyer: [/\bcustomer\b/, /\bbuyer\b/, /\buser\b/, /\baudience\b/, "target market", "who buys", /\bicp\b/, /\bpersona\b/],
    "founder-edge": [/\badvantage\b/, /\bedge\b/, /\bunfair\b/, /\bexperience\b/, /\bcredib\w*\b/, "why me", "founder-market"],
    solution: [/\bsolution\b/, /\bproduct\b/, /\bbuild\b/, /\bfeature\b/, /\bmvp\b/, /\bprototype\b/],
    validation: [/\bvalidat\w*\b/, /\btest\b/, /\bprov\w*\b/, "customer interview", "willing to pay", /\bdemand\b/],
    gtm: ["go to market", /\bdistribution\b/, /\bchannel\b/, /\bsales\b/, "reach customers", /\bacquir\w*\b/, /\bmarketing\b/],
    execution: [/\bexecut\w*\b/, /\bprioritiz\w*\b/, "this week", /\bcadence\b/, /\bsprint\b/, /\bownership\b/, /\bfocus\b/],
    pilot: [/\bpilot\b/, /\bbeta\b/, /\btrial\b/, "early customers", "first users", /\blaunch\b/],
    "scale-decision": [/\bscal\w*\b/, /\bfundrais\w*\b/, "double down", /\bpivot\b/, /\bgrowth\b/, /\bseries\b/],
  };

  let bestMatch: { targetStep: StartupStep; confidence: number } | null = null;
  const lowerMessage = message.toLowerCase();

  for (const [step, signals] of Object.entries(stepSignals) as [StartupStep, Array<string | RegExp>][]) {
    const matchCount = signals.filter((s) => {
      if (s instanceof RegExp) {
        return s.test(lowerMessage) || keywords.some((k) => s.test(k));
      }
      return lowerMessage.includes(s) || keywords.some((k) => k.includes(s));
    }).length;

    if (matchCount > 0) {
      const confidence = Math.min(0.5 + matchCount * 0.15, 0.95);
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { targetStep: step as StartupStep, confidence };
      }
    }
  }

  return bestMatch;
}

/**
 * Detect if the founder is drifting to a downstream step before
 * the current step is validated. Drift = asking about a step 2+ ahead
 * while current step is not validated.
 */
function detectDrift(
  stepRelevance: { targetStep: StartupStep; confidence: number } | null,
  conversationState: ConversationStateContext
): { isDrift: boolean; targetStep: StartupStep; currentStep: StartupStep } | null {
  if (!stepRelevance || stepRelevance.confidence < 0.6) return null;

  const currentIdx = STEP_ORDER.indexOf(conversationState.currentStep);
  const targetIdx = STEP_ORDER.indexOf(stepRelevance.targetStep);

  // Drift = asking about a step 2+ ahead AND current step is not validated
  if (
    targetIdx > currentIdx + 1 &&
    conversationState.stepStatuses[conversationState.currentStep] !== "validated"
  ) {
    return {
      isDrift: true,
      targetStep: stepRelevance.targetStep,
      currentStep: conversationState.currentStep,
    };
  }

  return null;
}

function detectTopic(message: string, keywords: string[]): CoachingTopic | undefined {
  const topicKeywords: Record<CoachingTopic, string[]> = {
    fundraising: ["fundrais", "raise", "investor", "vc", "capital", "funding", "round", "valuation", "term sheet", "series"],
    pitchReview: ["pitch", "deck", "slides", "presentation", "investor deck"],
    strategy: ["strategy", "plan", "roadmap", "pivot", "direction", "prioritize", "execute", "next steps"],
    positioning: ["positioning", "differentiat", "market fit", "value prop", "brand", "competitive", "messaging"],
    mindset: ["mindset", "motivat", "stuck", "overwhelm", "doubt", "confidence", "fear", "burnout", "stressed", "anxious"],
  };

  const lowerMessage = message.toLowerCase();
  let bestTopic: CoachingTopic | undefined;
  let bestScore = 0;

  for (const [topic, words] of Object.entries(topicKeywords) as [CoachingTopic, string[]][]) {
    const score = words.filter(w =>
      lowerMessage.includes(w) || keywords.some(k => k.includes(w))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestScore > 0 ? bestTopic : undefined;
}
