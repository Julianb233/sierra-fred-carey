/**
 * Investor Firm Matcher
 *
 * Given a founder's stage, sector, and metrics, scores and ranks firms from
 * the curated knowledge base. Used by Fred to suggest relevant investors
 * during coaching conversations.
 *
 * Scoring dimensions:
 *   - Stage alignment (40%): Does the firm invest at this round?
 *   - Sector fit (35%): Does the firm focus on this industry?
 *   - Check size fit (25%): Is the raise amount in range?
 *
 * Linear: AI-1285
 */

import {
  INVESTOR_FIRMS,
  type InvestorFirm,
  type RoundFocus,
} from "./knowledge-base";

// ============================================================================
// Types
// ============================================================================

export interface FounderCriteria {
  /** Startup stage (pre-seed, seed, series-a, etc.) */
  stage: string;
  /** Industry or sector */
  sector?: string;
  /** Approximate raise amount in USD */
  raiseAmount?: number;
  /** Specific investor type preference */
  preferredType?: string;
  /** Number of results to return */
  limit?: number;
}

export interface FirmMatch {
  firm: InvestorFirm;
  /** Overall match score 0-100 */
  score: number;
  /** Stage alignment score 0-100 */
  stageScore: number;
  /** Sector fit score 0-100 */
  sectorScore: number;
  /** Check size fit score 0-100 */
  sizeScore: number;
  /** Why this firm is a match (for Fred to reference) */
  matchReason: string;
}

// ============================================================================
// Stage Normalization
// ============================================================================

const STAGE_ALIASES: Record<string, RoundFocus> = {
  "idea": "pre-seed",
  "concept": "pre-seed",
  "pre-seed": "pre-seed",
  "preseed": "pre-seed",
  "seed": "seed",
  "series-a": "series-a",
  "series a": "series-a",
  "a": "series-a",
  "series-b": "series-b",
  "series b": "series-b",
  "b": "series-b",
  "series-c": "series-c",
  "series c": "series-c",
  "c": "series-c",
  "growth": "growth",
  "late": "growth",
  "late-stage": "growth",
};

const ROUND_ORDER: RoundFocus[] = [
  "pre-seed",
  "seed",
  "series-a",
  "series-b",
  "series-c",
  "growth",
];

function normalizeStage(stage: string): RoundFocus {
  const lower = stage.toLowerCase().trim().replace(/[_\s]+/g, "-");
  return STAGE_ALIASES[lower] || "seed";
}

// ============================================================================
// Estimated Raise Amounts by Stage
// ============================================================================

const STAGE_RAISE_ESTIMATES: Record<RoundFocus, { min: number; max: number }> = {
  "pre-seed": { min: 100_000, max: 500_000 },
  "seed": { min: 500_000, max: 3_000_000 },
  "series-a": { min: 3_000_000, max: 15_000_000 },
  "series-b": { min: 10_000_000, max: 50_000_000 },
  "series-c": { min: 30_000_000, max: 100_000_000 },
  "growth": { min: 50_000_000, max: 500_000_000 },
};

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Score stage alignment.
 * Perfect match = 100, adjacent round = 60, 2 away = 30, further = 10.
 */
function scoreStage(founderStage: RoundFocus, firmRounds: RoundFocus[]): number {
  if (firmRounds.includes(founderStage)) return 100;

  const founderIdx = ROUND_ORDER.indexOf(founderStage);
  const distances = firmRounds.map((r) => Math.abs(ROUND_ORDER.indexOf(r) - founderIdx));
  const minDist = Math.min(...distances);

  if (minDist === 1) return 60;
  if (minDist === 2) return 30;
  return 10;
}

/**
 * Score sector fit using keyword matching.
 * Generalist firms (empty sectorFocus) get 70 — they're not a perfect fit but not a mismatch.
 */
function scoreSector(founderSector: string | undefined, firmSectors: string[]): number {
  if (!founderSector) return 50; // Unknown sector = neutral

  // Generalist firms match broadly
  if (firmSectors.length === 0) return 70;

  const founderLower = founderSector.toLowerCase();
  const founderTerms = founderLower.split(/[\s,;/&-]+/).filter((t) => t.length > 2);

  let bestScore = 0;

  for (const sector of firmSectors) {
    const sectorLower = sector.toLowerCase();

    // Direct match
    if (founderLower.includes(sectorLower) || sectorLower.includes(founderLower)) {
      return 100;
    }

    // Term overlap
    const sectorTerms = sectorLower.split(/[\s,;/&-]+/).filter((t) => t.length > 2);
    const overlap = founderTerms.filter((t) =>
      sectorTerms.some((st) => st.includes(t) || t.includes(st))
    );

    if (overlap.length > 0) {
      const overlapScore = Math.min(100, 50 + (overlap.length / Math.max(founderTerms.length, 1)) * 50);
      bestScore = Math.max(bestScore, overlapScore);
    }
  }

  return bestScore || 20;
}

/**
 * Score check size compatibility.
 * Perfect overlap = 100. Partial overlap = 60-90. No overlap = penalized.
 */
function scoreSize(
  founderStage: RoundFocus,
  raiseAmount: number | undefined,
  firmCheckSize: { min: number; max: number }
): number {
  // Estimate raise if not provided
  const estimate = raiseAmount
    ? { min: raiseAmount * 0.7, max: raiseAmount * 1.3 }
    : STAGE_RAISE_ESTIMATES[founderStage] || STAGE_RAISE_ESTIMATES["seed"];

  const overlapMin = Math.max(estimate.min, firmCheckSize.min);
  const overlapMax = Math.min(estimate.max, firmCheckSize.max);

  if (overlapMin <= overlapMax) {
    // There is overlap
    const overlapRange = overlapMax - overlapMin;
    const founderRange = estimate.max - estimate.min;
    const pct = founderRange > 0 ? overlapRange / founderRange : 1;
    return Math.round(60 + pct * 40);
  }

  // No overlap — penalize by gap distance
  const gap = Math.min(
    Math.abs(estimate.min - firmCheckSize.max),
    Math.abs(estimate.max - firmCheckSize.min)
  );
  const founderMid = (estimate.min + estimate.max) / 2;
  const gapPct = founderMid > 0 ? gap / founderMid : 1;
  return Math.max(0, Math.round(50 - gapPct * 50));
}

/**
 * Generate a human-readable match reason for Fred to reference.
 */
function buildMatchReason(
  firm: InvestorFirm,
  founderStage: RoundFocus,
  founderSector: string | undefined,
  stageScore: number,
  sectorScore: number,
  sizeScore: number
): string {
  const parts: string[] = [];

  if (stageScore === 100) {
    parts.push(`actively invests at ${founderStage}`);
  } else if (stageScore >= 60) {
    parts.push(`invests near your stage (${firm.roundFocus.join(", ")})`);
  }

  if (sectorScore >= 80 && founderSector) {
    parts.push(`strong ${founderSector} focus`);
  } else if (sectorScore >= 60 && firm.sectorFocus.length === 0) {
    parts.push("generalist fund open to your sector");
  }

  if (sizeScore >= 70) {
    parts.push("check size fits your raise");
  }

  if (firm.type === "accelerator") {
    parts.push("provides mentorship and demo day access");
  }

  if (parts.length === 0) {
    return `${firm.name} is a potential fit based on overall profile alignment.`;
  }

  return `${firm.name}: ${parts.join(", ")}.`;
}

// ============================================================================
// Main Matching Function
// ============================================================================

/**
 * Match a founder's criteria against the curated investor knowledge base.
 * Returns scored and sorted firm matches.
 */
export function matchFirms(criteria: FounderCriteria): FirmMatch[] {
  const founderStage = normalizeStage(criteria.stage);
  const limit = criteria.limit || 10;

  let candidates = [...INVESTOR_FIRMS];

  // Filter by preferred type if specified
  if (criteria.preferredType) {
    const typeLower = criteria.preferredType.toLowerCase();
    const typeFiltered = candidates.filter((f) =>
      f.type.toLowerCase().includes(typeLower) ||
      typeLower.includes(f.type.toLowerCase())
    );
    // Only apply filter if it produces results; otherwise keep all
    if (typeFiltered.length > 0) {
      candidates = typeFiltered;
    }
  }

  // Score each firm
  const scored: FirmMatch[] = candidates.map((firm) => {
    const stageScore = scoreStage(founderStage, firm.roundFocus);
    const sectorScore = scoreSector(criteria.sector, firm.sectorFocus);
    const sizeScore = scoreSize(founderStage, criteria.raiseAmount, firm.checkSize);

    // Weighted overall: stage 40%, sector 35%, size 25%
    const score = Math.round(stageScore * 0.4 + sectorScore * 0.35 + sizeScore * 0.25);

    const matchReason = buildMatchReason(
      firm,
      founderStage,
      criteria.sector,
      stageScore,
      sectorScore,
      sizeScore
    );

    return { firm, score, stageScore, sectorScore, sizeScore, matchReason };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

/**
 * Find firms similar to a given firm — same type, overlapping stages, or sectors.
 * Useful for "show me firms like X" queries.
 */
export function findSimilarFirms(firmId: string, limit = 5): FirmMatch[] {
  const target = INVESTOR_FIRMS.find((f) => f.id === firmId);
  if (!target) return [];

  const candidates = INVESTOR_FIRMS.filter((f) => f.id !== firmId);

  const scored: FirmMatch[] = candidates.map((firm) => {
    // Stage overlap
    const stageOverlap = firm.roundFocus.filter((r) => target.roundFocus.includes(r)).length;
    const stageScore = Math.round((stageOverlap / Math.max(target.roundFocus.length, 1)) * 100);

    // Sector overlap
    let sectorScore = 0;
    if (target.sectorFocus.length === 0 && firm.sectorFocus.length === 0) {
      sectorScore = 80; // Both generalist
    } else if (target.sectorFocus.length > 0 && firm.sectorFocus.length > 0) {
      const targetSectors = target.sectorFocus.map((s) => s.toLowerCase());
      const firmSectors = firm.sectorFocus.map((s) => s.toLowerCase());
      const overlap = targetSectors.filter((s) =>
        firmSectors.some((fs) => fs.includes(s) || s.includes(fs))
      ).length;
      sectorScore = Math.round((overlap / Math.max(targetSectors.length, 1)) * 100);
    } else {
      sectorScore = 40; // One generalist, one specific
    }

    // Type match
    const typeScore = firm.type === target.type ? 100 : 50;

    // Size overlap
    const sizeOverlap =
      Math.min(firm.checkSize.max, target.checkSize.max) -
      Math.max(firm.checkSize.min, target.checkSize.min);
    const sizeScore = sizeOverlap > 0 ? 80 : 30;

    const score = Math.round(stageScore * 0.3 + sectorScore * 0.3 + typeScore * 0.2 + sizeScore * 0.2);

    return {
      firm,
      score,
      stageScore,
      sectorScore,
      sizeScore,
      matchReason: `Similar to ${target.name}: ${firm.type}, invests at ${firm.roundFocus.join(", ")}.`,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
