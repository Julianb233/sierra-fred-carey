/**
 * Urgency Keyword Detection — AI-4110
 *
 * Detects urgency keywords in feedback comments and metadata to
 * auto-escalate priority. When Fred says "this is broken" or "ASAP",
 * the signal gets flagged as urgent and its weight is boosted.
 */

export type UrgencyLevel = 'none' | 'elevated' | 'urgent' | 'critical'

interface UrgencyResult {
  level: UrgencyLevel
  matchedKeywords: string[]
  weightMultiplier: number
}

// Keyword patterns grouped by urgency level
const URGENCY_PATTERNS: Array<{
  level: UrgencyLevel
  multiplier: number
  patterns: RegExp[]
}> = [
  {
    level: 'critical',
    multiplier: 5.0,
    patterns: [
      /\bcrash(es|ed|ing)?\b/i,
      /\bdata\s*loss\b/i,
      /\bsecurity\s*(issue|vuln|breach|hole)\b/i,
      /\bproduction\s*(down|broken|outage)\b/i,
      /\b(completely|totally)\s+broken\b/i,
      /\bcant?\s+(use|access|log\s*in)\b/i,
    ],
  },
  {
    level: 'urgent',
    multiplier: 3.0,
    patterns: [
      /\basap\b/i,
      /\burgent(ly)?\b/i,
      /\bblocking\b/i,
      /\bblocked\b/i,
      /\bbroken\b/i,
      /\bcritical\b/i,
      /\bemergency\b/i,
      /\bimmediately\b/i,
      /\bright\s+now\b/i,
      /\bshow\s*stopper\b/i,
      /\bdeal\s*breaker\b/i,
      /\bnot\s+working\b/i,
      /\bfails?\s+(every|all|always)\b/i,
    ],
  },
  {
    level: 'elevated',
    multiplier: 1.5,
    patterns: [
      /\bimportant\b/i,
      /\bpriority\b/i,
      /\bfrustrat(ed|ing)\b/i,
      /\bannoying\b/i,
      /\bunacceptable\b/i,
      /\bfix\s+(this|it)\b/i,
      /\bplease\s+(fix|address|resolve)\b/i,
      /\bkeep(s)?\s+(happening|occurring|failing)\b/i,
      /\bagain\s+and\s+again\b/i,
      /\bstill\s+(broken|not\s+working|failing)\b/i,
    ],
  },
]

/**
 * Detect urgency level from text content.
 * Scans comment text and returns the highest matching urgency level.
 */
export function detectUrgency(text: string | null | undefined): UrgencyResult {
  if (!text || text.trim().length === 0) {
    return { level: 'none', matchedKeywords: [], weightMultiplier: 1.0 }
  }

  let highestLevel: UrgencyLevel = 'none'
  let highestMultiplier = 1.0
  const matchedKeywords: string[] = []

  for (const group of URGENCY_PATTERNS) {
    for (const pattern of group.patterns) {
      const match = text.match(pattern)
      if (match) {
        matchedKeywords.push(match[0])
        if (group.multiplier > highestMultiplier) {
          highestLevel = group.level
          highestMultiplier = group.multiplier
        }
      }
    }
  }

  return {
    level: highestLevel,
    matchedKeywords: [...new Set(matchedKeywords)],
    weightMultiplier: highestMultiplier,
  }
}

/**
 * Map urgency level to minimum severity for clustering.
 * Ensures urgent signals push cluster severity upward.
 */
export function urgencyToMinSeverity(
  level: UrgencyLevel
): 'low' | 'medium' | 'high' | 'critical' {
  switch (level) {
    case 'critical': return 'critical'
    case 'urgent': return 'high'
    case 'elevated': return 'medium'
    default: return 'low'
  }
}
