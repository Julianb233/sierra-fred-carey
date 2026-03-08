import type { IntentCategory } from "./types";

/**
 * Intent classification keywords.
 * Uses regex patterns to detect what the user is trying to DO (action intent),
 * not just what they're talking ABOUT (topic).
 *
 * The classifier requires BOTH a domain keyword AND an action verb
 * (same dual-gate pattern as detectDownstreamRequestQuick in the chat route).
 */

interface IntentPattern {
  intent: IntentCategory;
  /** Domain keywords that indicate this topic */
  keywords: RegExp;
  /** If true, no action verb is required (informational topics are always classified) */
  alwaysMatch?: boolean;
}

const ACTION_VERBS = /\b(help|build|create|make|write|review|prepare|start|plan|need|want|should\s*i|how\s*(do\s*i|to|can\s*i)|ready\s*to|let'?s|work\s*on|get\s*(started|ready)|tell\s*me\s*(about|how)|what\s*(should|do)|guide|coach|advise|show)\b/i;

const INTENT_PATTERNS: IntentPattern[] = [
  // Clarity stage — always accessible, classify broadly
  { intent: "problem_definition", keywords: /\b(problem|pain\s*point|challenge|struggle|issue|what\s*(?:am\s*i|are\s*we)\s*solving)\b/i, alwaysMatch: true },
  { intent: "idea_validation", keywords: /\b(idea|concept|validate\s*(?:my|the|this)|is\s*this\s*(?:good|viable|worth))\b/i, alwaysMatch: true },
  { intent: "customer_interviews", keywords: /\b(customer\s*interview|user\s*interview|talk\s*to\s*(?:customer|user)|customer\s*discovery)\b/i },
  { intent: "market_research", keywords: /\b(market\s*(?:research|size|analysis|opportunity)|tam|sam|som|industry\s*research)\b/i },

  // Validation stage
  { intent: "market_testing", keywords: /\b(market\s*test|test\s*(?:the\s*)?market|demand\s*test|landing\s*page\s*test|smoke\s*test)\b/i },
  { intent: "mvp_planning", keywords: /\b(mvp|minimum\s*viable|prototype|first\s*version|v1|build\s*(?:the\s*)?product)\b/i },
  { intent: "pricing", keywords: /\b(pric(?:e|ing)|monetiz|revenue\s*model|business\s*model|charge|subscription\s*model)\b/i },
  { intent: "competitive_analysis", keywords: /\b(compet(?:itor|itive|ition)|landscape|alternative|differentiat|moat)\b/i },

  // Build stage
  { intent: "pitch_deck_creation", keywords: /\b(pitch\s*deck|investor\s*deck|deck|slides|presentation\s*for\s*investor)\b/i },
  { intent: "team_building", keywords: /\b(hir(?:e|ing)|recruit|co-?founder|first\s*hire|team\s*build|talent)\b/i },
  { intent: "strategy_docs", keywords: /\b(business\s*plan|strategy\s*(?:doc|document)|roadmap|go-?to-?market\s*(?:plan|strategy))\b/i },
  { intent: "product_development", keywords: /\b(product\s*(?:develop|roadmap|feature|backlog)|tech\s*stack|architect(?:ure)?|build\s*(?:out|feature))\b/i },

  // Launch stage
  { intent: "fundraising", keywords: /\b(fundrais|raise\s*(?:money|capital|a?\s*round)|seed\s*round|series\s*[a-c]|vc|venture\s*capital|angel|valuation|term\s*sheet)\b/i },
  { intent: "pitch_preparation", keywords: /\b(pitch\s*(?:practice|prep|rehearse)|investor\s*(?:meeting|presentation|pitch)|practice\s*(?:my|the)\s*pitch)\b/i },
  { intent: "investor_outreach", keywords: /\b(investor\s*(?:outreach|list|target|reach\s*out|contact|email)|find\s*investor|approach\s*investor|cold\s*(?:email|outreach)\s*investor)\b/i },
  { intent: "investor_targeting", keywords: /\b(target\s*investor|right\s*investor|investor\s*(?:fit|match)|which\s*investor)\b/i },

  // Grow stage
  { intent: "scaling", keywords: /\b(scal(?:e|ing)|grow(?:th)?|expand|international|new\s*market|enterprise\s*(?:sales|customer))\b/i },
  { intent: "fund_matching", keywords: /\b(boardy|network(?:ing)?|connect\s*(?:me|with)|introduction|warm\s*intro)\b/i },
  { intent: "advanced_analytics", keywords: /\b(analytics|metric|kpi|cohort|retention\s*(?:rate|curve)|unit\s*economics\s*at\s*scale)\b/i },
  { intent: "partnerships", keywords: /\b(partner(?:ship)?|strategic\s*(?:alliance|partner)|channel\s*partner|distribution\s*partner)\b/i },

  // Always allowed
  { intent: "mindset", keywords: /\b(mindset|motiv(?:ation|ated)|confiden(?:ce|t)|imposter|self-?doubt|overwhelm|stress(?:ed)?|afraid|scared|anxious)\b/i, alwaysMatch: true },
  { intent: "wellbeing", keywords: /\b(burnout|exhaust(?:ed|ion)|sleep|mental\s*health|break(?:down)?|quit(?:ting)?|give\s*up|can'?t\s*(?:do|handle|take))\b/i, alwaysMatch: true },
];

/** Mentor override phrases — user explicitly insists on discussing a topic */
const OVERRIDE_PATTERNS = [
  /\b(i\s*understand|i\s*know|i\s*(?:get|hear)\s*(?:it|you|that))\b.*\b(but|however|still|anyway|regardless|need\s*to|want\s*to|have\s*to)\b/i,
  /\b(i\s*really\s*need|i\s*insist|please\s*(?:just|help)|can\s*we\s*(?:just|please)|let\s*me\s*(?:just|decide))\b/i,
  /\b(i'?ve\s*already|already\s*(?:done|validated|tested|figured)|skip|move\s*(?:on|ahead|forward))\b/i,
];

/**
 * Classify user message intent.
 *
 * Returns the most specific intent detected, or "general" if no specific
 * intent matches. Also detects mentor override signals.
 */
export function classifyIntent(message: string): { intent: IntentCategory; isOverride: boolean } {
  const hasActionVerb = ACTION_VERBS.test(message);
  const isOverride = OVERRIDE_PATTERNS.some(p => p.test(message));

  // Score each intent pattern
  let bestMatch: IntentCategory = "general";
  let bestSpecificity = 0;

  for (const pattern of INTENT_PATTERNS) {
    const match = pattern.keywords.test(message);
    if (!match) continue;

    // Require action verb for non-alwaysMatch intents
    if (!pattern.alwaysMatch && !hasActionVerb) continue;

    // Use pattern specificity (longer regex source = more specific)
    const specificity = pattern.keywords.source.length;
    if (specificity > bestSpecificity) {
      bestSpecificity = specificity;
      bestMatch = pattern.intent;
    }
  }

  return { intent: bestMatch, isOverride };
}
