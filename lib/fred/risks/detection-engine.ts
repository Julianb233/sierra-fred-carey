/**
 * Red Flag Detection Engine
 *
 * Analyzes SynthesisResult output to extract and classify business risks
 * into structured RedFlag objects with category, severity, and description.
 */

import type { RedFlag, RedFlagCategory, Severity, SynthesisResult } from "@/lib/fred/types";

// ============================================================================
// Category keyword maps
// ============================================================================

const CATEGORY_KEYWORDS: Record<RedFlagCategory, string[]> = {
  market: ["market", "demand", "customer", "competition", "tam", "segment", "audience", "adoption"],
  financial: ["burn", "runway", "revenue", "cash", "funding", "capital", "cost", "profit", "margin", "budget"],
  team: ["team", "hire", "founder", "talent", "leadership", "capacity", "culture", "retention"],
  product: ["product", "tech", "technical", "feature", "mvp", "scale", "architecture", "infrastructure", "bug"],
  legal: ["legal", "compliance", "regulation", "ip", "patent", "liability", "license", "gdpr", "privacy"],
  competitive: ["competitor", "moat", "differentiation", "substitute", "advantage", "barrier"],
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Classify a risk description into a RedFlagCategory using keyword matching.
 */
export function categorizeRisk(description: string): RedFlagCategory {
  const lower = description.toLowerCase();

  let bestCategory: RedFlagCategory = "market";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [RedFlagCategory, string[]][]) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Determine severity based on composite score from synthesis factors.
 */
function determineSeverity(composite: number): Severity {
  if (composite < 30) return "critical";
  if (composite < 50) return "high";
  if (composite < 70) return "medium";
  return "low";
}

/**
 * Generate a concise title from a risk description.
 */
function generateTitle(description: string, category: RedFlagCategory): string {
  // Truncate to a reasonable title length
  const maxLen = 80;
  const trimmed = description.length > maxLen
    ? description.slice(0, maxLen).replace(/\s+\S*$/, "") + "..."
    : description;

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  return `${categoryLabel}: ${trimmed}`;
}

/**
 * Analyze a SynthesisResult to extract and classify business risks
 * into structured RedFlag objects.
 *
 * @param synthesis - The synthesis result containing risks and factor scores
 * @param userId    - The user who owns these flags
 * @returns Array of RedFlag objects with category, severity, and status
 */
export function detectRedFlags(
  synthesis: SynthesisResult,
  userId: string
): RedFlag[] {
  if (!synthesis.risks || synthesis.risks.length === 0) {
    return [];
  }

  const composite = synthesis.factors?.composite ?? 50;
  const baseSeverity = determineSeverity(composite);
  const now = new Date().toISOString();

  return synthesis.risks.map((risk) => {
    const category = categorizeRisk(risk.description);

    // Adjust severity per-risk based on impact and likelihood
    let severity = baseSeverity;
    if (risk.impact >= 0.8 && risk.likelihood >= 0.5) {
      severity = "critical";
    } else if (risk.impact >= 0.6 && risk.likelihood >= 0.3) {
      severity = severity === "low" ? "medium" : severity;
    }

    return {
      userId,
      category,
      severity,
      title: generateTitle(risk.description, category),
      description: risk.description + (risk.mitigation ? ` Mitigation: ${risk.mitigation}` : ""),
      status: "active" as const,
      detectedAt: now,
    };
  });
}
