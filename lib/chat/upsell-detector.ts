/**
 * Upsell Detection for FRED Chat
 *
 * Detects when a free-tier user is asking for Pro-tier features
 * (document review, pitch deck improvement, storage, strategy docs)
 * so FRED can offer a conversational, mentor-style upgrade nudge.
 */

// ============================================================================
// Types
// ============================================================================

export type UpsellTrigger =
  | "pitch_deck_review"
  | "doc_improvement"
  | "doc_storage"
  | "strategy_docs"
  | "investor_readiness"

export interface UpsellDetection {
  /** Whether the message triggers an upsell opportunity */
  detected: boolean
  /** The specific feature the user is asking about */
  trigger: UpsellTrigger | null
  /** Confidence of the detection (0-1) */
  confidence: number
  /** Human-readable description for analytics */
  featureLabel: string | null
}

// ============================================================================
// Detection Patterns
// ============================================================================

interface DetectionRule {
  trigger: UpsellTrigger
  /** All patterns in at least one group must match (AND within group, OR across groups) */
  patternGroups: RegExp[][]
  featureLabel: string
  /** Base confidence for this rule */
  confidence: number
}

const DETECTION_RULES: DetectionRule[] = [
  {
    trigger: "pitch_deck_review",
    patternGroups: [
      [/pitch\s*deck/i, /review|grade|score|improv|fix|rewrite|analyz|assess|evaluat|feedback/i],
      [/deck/i, /review|grade|score|improv|fix|better|stronger|rewrite|analyz|assess/i],
      [/pitch/i, /review|grade|improv|fix|better|stronger|rewrite|polish/i],
      [/grade\s+(my|the|our)\s+(pitch|deck)/i],
      [/score\s+(my|the|our)\s+(pitch|deck)/i],
      [/turn\s+(it|this|my\s+deck|the\s+deck)\s+into\s+an?\s+[A-F]/i],
    ],
    featureLabel: "Pitch Deck Review & Improvement",
    confidence: 0.9,
  },
  {
    trigger: "doc_improvement",
    patternGroups: [
      [/document|doc|report|plan|proposal|brief/i, /review|improv|fix|rewrite|edit|polish|refine|updat|enhanc/i],
      [/help\s+(me\s+)?(with|write|create|draft|improve)/i, /document|doc|business\s*plan|executive\s*summary|one[- ]pager/i],
      [/can\s+you\s+(review|improve|rewrite|fix|edit|polish)/i, /document|doc|report|plan|proposal/i],
    ],
    featureLabel: "Document Review & Improvement",
    confidence: 0.85,
  },
  {
    trigger: "doc_storage",
    patternGroups: [
      [/save|store|keep|upload|archive/i, /document|doc|deck|file|report|version/i],
      [/document\s*(storage|vault|library|management)/i],
      [/keep\s+(a\s+)?record|save\s+(this|my|the)\s+(work|progress|doc)/i],
    ],
    featureLabel: "Document Storage & Management",
    confidence: 0.8,
  },
  {
    trigger: "strategy_docs",
    patternGroups: [
      [/strateg(y|ic)/i, /document|doc|report|create|generat|build|write|draft/i],
      [/create\s+(a\s+)?(go[- ]to[- ]market|gtm|market(ing)?|growth|business)\s*(strategy|plan|document|doc)/i],
      [/positioning\s*(document|doc|framework|strategy)/i],
    ],
    featureLabel: "Strategy Documents",
    confidence: 0.85,
  },
  {
    trigger: "investor_readiness",
    patternGroups: [
      [/investor/i, /readiness|score|ready|prepared/i],
      [/am\s+i\s+(investor\s+)?ready\s+(to\s+)?(raise|fundraise|pitch)/i],
      [/investor\s*readiness\s*score/i],
    ],
    featureLabel: "Investor Readiness Score",
    confidence: 0.85,
  },
]

// ============================================================================
// Detection Logic
// ============================================================================

/**
 * Detect if a user message indicates interest in a Pro-tier feature.
 * Returns the best-matching upsell trigger with confidence score.
 */
export function detectUpsellTrigger(message: string): UpsellDetection {
  const noDetection: UpsellDetection = {
    detected: false,
    trigger: null,
    confidence: 0,
    featureLabel: null,
  }

  if (!message || message.length < 5) return noDetection

  let bestMatch: UpsellDetection = noDetection

  for (const rule of DETECTION_RULES) {
    for (const group of rule.patternGroups) {
      const allMatch = group.every((pattern) => pattern.test(message))
      if (allMatch && rule.confidence > bestMatch.confidence) {
        bestMatch = {
          detected: true,
          trigger: rule.trigger,
          confidence: rule.confidence,
          featureLabel: rule.featureLabel,
        }
      }
    }
  }

  return bestMatch
}

// ============================================================================
// Mentor-style upsell messages (Fred's voice)
// ============================================================================

const UPSELL_MESSAGES: Record<UpsellTrigger, string[]> = {
  pitch_deck_review: [
    "I can give you a quick score on your pitch deck right now — think of it as a gut-check grade. But if you want me to go slide-by-slide and actually *fix* it? That's where the Pro tier comes in. I've helped thousands of founders turn C-minus decks into ones that close rounds.",
    "Here's what I can do right now — I'll grade your pitch deck and give you the high-level hits and misses. But turning a C into an A? That takes the deep-dive review. Upgrade to Pro and I'll tear it apart slide by slide and rebuild it with you.",
    "Let me give you a quick score on that deck. Fair warning though — the real magic happens when I can do a full review and help you rewrite the weak spots. That's a Pro feature, and at $99/month, it's the cheapest fundraising advisor you'll ever find.",
  ],
  doc_improvement: [
    "I can point you in the right direction here, but if you want me to actually roll up my sleeves and help you rewrite and improve your documents? That's Pro territory. Trust me — having an experienced eye edit your stuff is worth every penny.",
    "Great question. I can give you general guidance right now, but the real value is when I can review, edit, and improve your documents directly. Upgrade to Pro and we'll work on this together.",
  ],
  doc_storage: [
    "Right now your conversations with me reset each session. Upgrade to Pro and I'll remember everything — your docs, your progress, your strategy. It's like having a co-founder who never forgets.",
    "Storage and persistent memory is a Pro feature. When you upgrade, I keep track of everything — your documents, your pitch iterations, your strategy evolution. Nothing falls through the cracks.",
  ],
  strategy_docs: [
    "I can talk strategy all day — that's free. But when you're ready to actually *create* strategy documents, positioning frameworks, and go-to-market plans? That's where Pro comes in. I've built these for companies that went on to raise millions.",
    "Strategy conversations? Absolutely, let's go. But generating actual strategy documents and frameworks — that's a Pro feature. Upgrade and I'll help you build the kind of strategic docs that make investors take notice.",
  ],
  investor_readiness: [
    "You're asking the right question. I can give you a general sense of where you stand, but the full Investor Readiness Score — the one that breaks down exactly where you're strong and where you're vulnerable? That's Pro. And it's worth knowing before you walk into any pitch meeting.",
    "Smart move checking your readiness. I can chat about it, but the detailed Investor Readiness Score that shows you exactly what VCs will scrutinize? That's a Pro feature. Upgrade and I'll give you the same assessment I'd give a company in my portfolio.",
  ],
}

/**
 * Get a random mentor-style upsell message for a given trigger.
 */
export function getUpsellMessage(trigger: UpsellTrigger): string {
  const messages = UPSELL_MESSAGES[trigger]
  return messages[Math.floor(Math.random() * messages.length)]
}

/**
 * Feature descriptions for the upsell UI card
 */
export const PRO_TIER_HIGHLIGHTS = [
  "Full Pitch Deck Review & Scorecard",
  "Document Review & Improvement",
  "Strategy Document Generation",
  "Investor Readiness Score",
  "Persistent Memory (30 days)",
  "Priority AI Model (GPT-4o)",
] as const
