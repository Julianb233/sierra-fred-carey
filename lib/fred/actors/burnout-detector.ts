/**
 * Burnout Signal Detector
 *
 * Analyzes user message text for burnout indicators across five categories:
 * sleep/exhaustion, overwhelm, isolation, doubt, and anxiety.
 * Produces a 0-100 stress score with Fred-voiced recommendations.
 */

import type { BurnoutSignals } from "../types";

// ============================================================================
// Keyword Groups (5 indicator categories, each scored 0-20)
// ============================================================================

interface IndicatorGroup {
  name: string;
  label: string;
  keywords: string[];
}

const INDICATOR_GROUPS: IndicatorGroup[] = [
  {
    name: "sleep_exhaustion",
    label: "Sleep & Exhaustion",
    keywords: [
      "tired",
      "exhausted",
      "can't sleep",
      "no sleep",
      "burned out",
      "burnout",
      "drained",
      "fatigue",
      "insomnia",
      "running on empty",
    ],
  },
  {
    name: "overwhelm",
    label: "Overwhelm",
    keywords: [
      "overwhelmed",
      "too much",
      "drowning",
      "can't keep up",
      "falling behind",
      "buried",
      "swamped",
      "underwater",
      "impossible",
      "never-ending",
    ],
  },
  {
    name: "isolation",
    label: "Isolation",
    keywords: [
      "alone",
      "no one understands",
      "isolated",
      "lonely",
      "no support",
      "on my own",
      "nobody gets it",
      "by myself",
      "disconnected",
    ],
  },
  {
    name: "doubt",
    label: "Self-Doubt",
    keywords: [
      "giving up",
      "quit",
      "pointless",
      "waste of time",
      "not worth it",
      "failure",
      "failing",
      "hopeless",
      "can't do this",
      "what's the point",
    ],
  },
  {
    name: "anxiety",
    label: "Anxiety & Stress",
    keywords: [
      "anxious",
      "worried",
      "panic",
      "stressed",
      "can't focus",
      "losing it",
      "freaking out",
      "paralyzed",
      "spiraling",
      "dread",
    ],
  },
];

// ============================================================================
// Recommendations (in Fred Cary's voice)
// ============================================================================

const RECOMMENDATIONS = {
  none: "",
  moderate:
    "I can tell things are weighing on you. That's normal -- building something from nothing is hard. Let's talk about what's really going on.",
  high:
    "Hey, I've been where you are. After 50+ years of this, I can tell you that burning out doesn't make you tougher -- it makes you worse at the job. Let's take a step back.",
  critical:
    "I need you to hear this: your health matters more than your startup. I've watched too many founders destroy themselves. Let's check in on how you're really doing.",
} as const;

// ============================================================================
// Detection Function
// ============================================================================

/**
 * Analyze user message text for burnout signals.
 *
 * Each of the 5 indicator groups contributes 0-20 to the total stress score.
 * - detected = true when stressLevel >= 40
 * - suggestCheckIn = true when stressLevel >= 60
 */
export function detectBurnoutSignals(text: string): BurnoutSignals {
  const lowerText = text.toLowerCase();
  const indicators: string[] = [];
  let totalScore = 0;

  for (const group of INDICATOR_GROUPS) {
    let matchCount = 0;

    for (const keyword of group.keywords) {
      // Use word-boundary-aware matching for multi-word and single-word keywords
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escaped}\\b`, "i");
      if (pattern.test(lowerText)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      indicators.push(group.name);
      // Score: first match = 10, each additional match adds 5, capped at 20
      const groupScore = Math.min(10 + (matchCount - 1) * 5, 20);
      totalScore += groupScore;
    }
  }

  const stressLevel = Math.min(totalScore, 100);
  const detected = stressLevel >= 40;
  const suggestCheckIn = stressLevel >= 60;

  let recommendation: string;
  if (stressLevel < 40) {
    recommendation = RECOMMENDATIONS.none;
  } else if (stressLevel < 60) {
    recommendation = RECOMMENDATIONS.moderate;
  } else if (stressLevel < 80) {
    recommendation = RECOMMENDATIONS.high;
  } else {
    recommendation = RECOMMENDATIONS.critical;
  }

  return {
    detected,
    stressLevel,
    indicators,
    recommendation,
    suggestCheckIn,
  };
}
