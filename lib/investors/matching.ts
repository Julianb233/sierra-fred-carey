/**
 * Investor Matching Engine
 * Phase 20: Investor Targeting
 *
 * AI-powered scoring engine that matches founders to investors based on
 * stage alignment, sector fit, and check size compatibility.
 * Uses Fred Cary's investor voice for reasoning generation.
 */

import { z } from "zod";
import { generateStructuredReliable } from "@/lib/ai/fred-client";
import { FRED_AGENT_VOICE } from "@/lib/agents/fred-agent-voice";
import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface InvestorMatch {
  id: string;
  userId: string;
  investorId: string;
  investorName: string;
  investorFirm: string | null;
  investorEmail: string | null;
  investorWebsite: string | null;
  overallScore: number;
  stageScore: number;
  sectorScore: number;
  sizeScore: number;
  reasoning: string;
  status: string;
  createdAt: string;
}

interface FounderProfile {
  stage: string | null;
  industry: string | null;
  revenueRange: string | null;
  fundingHistory: string | null;
  teamSize: number | null;
  name: string | null;
  location: string | null;
}

interface InvestorRecord {
  id: string;
  list_id: string;
  name: string;
  firm: string | null;
  email: string | null;
  website: string | null;
  stage_focus: string[] | null;
  sector_focus: string[] | null;
  check_size_min: number | null;
  check_size_max: number | null;
  location: string | null;
  notes: string | null;
}

// ============================================================================
// Stage Mapping
// ============================================================================

/** Normalize stage names for comparison */
function normalizeStage(stage: string): string {
  const s = stage.toLowerCase().trim().replace(/[_\s-]+/g, "-");
  const aliases: Record<string, string> = {
    "pre-seed": "pre-seed",
    "preseed": "pre-seed",
    "idea": "pre-seed",
    "concept": "pre-seed",
    "seed": "seed",
    "series-a": "series-a",
    "series a": "series-a",
    "a": "series-a",
    "series-b": "series-b",
    "series b": "series-b",
    "b": "series-b",
    "series-c": "series-c",
    "series c": "series-c",
    "growth": "growth",
    "late": "growth",
  };
  return aliases[s] || s;
}

/** Stage adjacency -- how close two stages are */
const STAGE_ORDER = ["pre-seed", "seed", "series-a", "series-b", "series-c", "growth"];

function stageDistance(a: string, b: string): number {
  const idxA = STAGE_ORDER.indexOf(normalizeStage(a));
  const idxB = STAGE_ORDER.indexOf(normalizeStage(b));
  if (idxA === -1 || idxB === -1) return 2; // Unknown stages get moderate penalty
  return Math.abs(idxA - idxB);
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Score how well investor stage focus matches founder stage.
 * Perfect match = 100, adjacent stage = 70, 2 away = 40, 3+ = 10
 */
function scoreStage(founderStage: string | null, investorStages: string[] | null): number {
  if (!founderStage || !investorStages || investorStages.length === 0) return 50; // Neutral when data missing

  const distances = investorStages.map((s) => stageDistance(founderStage, s));
  const minDistance = Math.min(...distances);

  switch (minDistance) {
    case 0: return 100;
    case 1: return 70;
    case 2: return 40;
    default: return 10;
  }
}

/**
 * Score how well investor sector focus matches founder industry.
 * Uses substring matching for flexibility.
 */
function scoreSector(founderIndustry: string | null, investorSectors: string[] | null): number {
  if (!founderIndustry || !investorSectors || investorSectors.length === 0) return 50;

  const founderLower = founderIndustry.toLowerCase();
  const founderTerms = founderLower.split(/[\s,;/&]+/).filter(Boolean);

  let bestScore = 0;

  for (const sector of investorSectors) {
    const sectorLower = sector.toLowerCase();

    // Exact or substring match
    if (founderLower.includes(sectorLower) || sectorLower.includes(founderLower)) {
      return 100;
    }

    // Term overlap
    const sectorTerms = sectorLower.split(/[\s,;/&]+/).filter(Boolean);
    const overlap = founderTerms.filter((t) =>
      sectorTerms.some((st) => st.includes(t) || t.includes(st))
    );

    const overlapScore = overlap.length > 0
      ? Math.min(100, 50 + (overlap.length / Math.max(founderTerms.length, 1)) * 50)
      : 0;

    bestScore = Math.max(bestScore, overlapScore);
  }

  return bestScore || 20; // Minimum 20 for any sector mismatch (still possible fit)
}

/**
 * Score check size compatibility.
 * Estimates founder raise amount from stage, checks if it falls in investor range.
 */
function scoreSize(
  founderStage: string | null,
  founderRevenue: string | null,
  investorMin: number | null,
  investorMax: number | null
): number {
  // Estimate raise amount based on stage
  const stageRaiseEstimates: Record<string, { min: number; max: number }> = {
    "pre-seed": { min: 100_000, max: 500_000 },
    "seed": { min: 500_000, max: 3_000_000 },
    "series-a": { min: 3_000_000, max: 15_000_000 },
    "series-b": { min: 10_000_000, max: 50_000_000 },
    "series-c": { min: 30_000_000, max: 100_000_000 },
    "growth": { min: 50_000_000, max: 500_000_000 },
  };

  const normalized = founderStage ? normalizeStage(founderStage) : "seed";
  const estimate = stageRaiseEstimates[normalized] || stageRaiseEstimates["seed"];

  // If investor has no size data, neutral score
  if (investorMin === null && investorMax === null) return 50;

  const invMin = investorMin || 0;
  const invMax = investorMax || Infinity;

  // Check overlap between founder raise range and investor check range
  const overlapMin = Math.max(estimate.min, invMin);
  const overlapMax = Math.min(estimate.max, invMax);

  if (overlapMin <= overlapMax) {
    // There is overlap -- score based on how much
    const overlapRange = overlapMax - overlapMin;
    const founderRange = estimate.max - estimate.min;
    const overlapPct = founderRange > 0 ? overlapRange / founderRange : 1;
    return Math.round(60 + overlapPct * 40); // 60-100 for overlapping ranges
  }

  // No overlap -- penalize based on distance
  const gap = overlapMin > overlapMax
    ? Math.min(Math.abs(estimate.min - invMax), Math.abs(estimate.max - invMin))
    : 0;
  const founderMid = (estimate.min + estimate.max) / 2;
  const gapPct = founderMid > 0 ? gap / founderMid : 1;
  return Math.max(0, Math.round(50 - gapPct * 50));
}

/**
 * Location bonus score.
 * Returns 0-30 bonus points for geographic alignment.
 */
function scoreLocation(founderLocation: string | null, investorLocation: string | null): number {
  if (!founderLocation || !investorLocation) return 0;

  const fLower = founderLocation.toLowerCase();
  const iLower = investorLocation.toLowerCase();

  if (fLower.includes(iLower) || iLower.includes(fLower)) return 30;

  // Check for common geographic terms
  const fTerms = fLower.split(/[\s,]+/).filter(Boolean);
  const iTerms = iLower.split(/[\s,]+/).filter(Boolean);
  const overlap = fTerms.filter((t) => iTerms.some((it) => it === t));

  if (overlap.length > 0) return 15;

  return 0;
}

// ============================================================================
// AI Reasoning Generation
// ============================================================================

const reasoningSchema = z.object({
  reasonings: z.array(
    z.object({
      investorId: z.string(),
      reasoning: z.string().describe("2-3 sentence match reasoning in Fred's voice"),
    })
  ),
});

/**
 * Generate AI reasoning for match results in Fred's voice.
 * Batches investors for efficiency.
 */
async function generateMatchReasoning(
  profile: FounderProfile,
  matches: Array<{
    investorId: string;
    investorName: string;
    investorFirm: string | null;
    overallScore: number;
    stageScore: number;
    sectorScore: number;
    sizeScore: number;
    investorStages: string[] | null;
    investorSectors: string[] | null;
  }>
): Promise<Map<string, string>> {
  const reasoningMap = new Map<string, string>();

  if (matches.length === 0) return reasoningMap;

  // Batch into groups of 10 for API efficiency
  const batches: typeof matches[] = [];
  for (let i = 0; i < matches.length; i += 10) {
    batches.push(matches.slice(i, i + 10));
  }

  for (const batch of batches) {
    const investorDescriptions = batch
      .map(
        (m) =>
          `- ID: ${m.investorId} | ${m.investorName}${m.investorFirm ? ` at ${m.investorFirm}` : ""} | Score: ${m.overallScore} (stage: ${m.stageScore}, sector: ${m.sectorScore}, size: ${m.sizeScore}) | Stages: ${m.investorStages?.join(", ") || "N/A"} | Sectors: ${m.investorSectors?.join(", ") || "N/A"}`
      )
      .join("\n");

    const prompt = `A ${profile.stage || "early-stage"} founder in ${profile.industry || "tech"} is looking for investor matches.

Founder profile:
- Stage: ${profile.stage || "unknown"}
- Industry: ${profile.industry || "unknown"}
- Revenue: ${profile.revenueRange || "unknown"}
- Funding history: ${profile.fundingHistory || "unknown"}

Here are the matched investors with their scores:
${investorDescriptions}

For each investor, write a brief 2-3 sentence reasoning explaining why they are or aren't a good match. Reference specific alignment on stage, sector, or check size. Be direct and practical -- this is actionable intelligence for the founder.

Return the reasoning for each investor by their ID.`;

    try {
      const result = await generateStructuredReliable(prompt, reasoningSchema, {
        system: `${FRED_AGENT_VOICE}\n\nYou're evaluating investor-founder fit. Be specific about why each investor is or isn't a good match. Draw from your experience sitting on both sides of the table.`,
        temperature: 0.6,
      });

      for (const item of result.object.reasonings) {
        reasoningMap.set(item.investorId, item.reasoning);
      }
    } catch (error) {
      console.error("[InvestorMatching] AI reasoning generation failed:", error);
      // Fall back to rule-based reasoning
      for (const m of batch) {
        const parts: string[] = [];
        if (m.stageScore >= 70) parts.push("stage alignment is strong");
        else if (m.stageScore < 40) parts.push("stage focus doesn't align well");
        if (m.sectorScore >= 70) parts.push("sector focus matches");
        else if (m.sectorScore < 40) parts.push("sector mismatch is a concern");
        if (m.sizeScore >= 70) parts.push("check size fits your raise");
        else if (m.sizeScore < 40) parts.push("check size may not fit");

        reasoningMap.set(
          m.investorId,
          parts.length > 0
            ? `${m.investorName}${m.investorFirm ? ` (${m.investorFirm})` : ""}: ${parts.join(", ")}. Overall score: ${m.overallScore}/100.`
            : `Insufficient data to provide detailed reasoning. Score: ${m.overallScore}/100.`
        );
      }
    }
  }

  return reasoningMap;
}

// ============================================================================
// Main Matching Function
// ============================================================================

/**
 * Match investors against a founder's profile.
 * Scores across stage (35%), sector (35%), size (30%) + location bonus.
 * Generates AI reasoning in Fred's voice.
 *
 * @param userId - The founder's user ID
 * @param listId - Optional specific list ID to match against
 * @returns Sorted array of investor matches (top 25)
 */
export async function matchInvestors(
  userId: string,
  listId?: string
): Promise<InvestorMatch[]> {
  const supabase = createServiceClient();

  // 1. Load founder profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("stage, industry, revenue_range, funding_history, team_size, name, enrichment_data")
    .eq("id", userId)
    .single();

  // Extract location from enrichment_data JSONB if available
  const enrichment = (profile?.enrichment_data as Record<string, unknown>) || {};
  const founderLocation = (enrichment.location as string) || null;

  const founderProfile: FounderProfile = {
    stage: profile?.stage || null,
    industry: profile?.industry || null,
    revenueRange: profile?.revenue_range || null,
    fundingHistory: profile?.funding_history || null,
    teamSize: profile?.team_size || null,
    name: profile?.name || null,
    location: founderLocation,
  };

  // 2. Load investors from user's lists
  let investorQuery = supabase
    .from("investors")
    .select("*, investor_lists!inner(user_id)")
    .eq("investor_lists.user_id", userId);

  if (listId) {
    investorQuery = investorQuery.eq("list_id", listId);
  }

  const { data: investors, error: investorError } = await investorQuery;

  if (investorError) {
    console.error("[InvestorMatching] Failed to load investors:", investorError);
    throw new Error("Failed to load investor data");
  }

  if (!investors || investors.length === 0) {
    return [];
  }

  // 3. Score each investor
  const scoredInvestors = investors.map((inv: InvestorRecord & { investor_lists: { user_id: string } }) => {
    const stageScore = scoreStage(founderProfile.stage, inv.stage_focus);
    const sectorScore = scoreSector(founderProfile.industry, inv.sector_focus);
    const sizeScore = scoreSize(founderProfile.stage, founderProfile.revenueRange, inv.check_size_min, inv.check_size_max);
    const locationBonus = scoreLocation(founderProfile.location, inv.location);

    // Weighted average: stage 35%, sector 35%, size 30% + location bonus (capped at 100)
    const baseScore = Math.round(stageScore * 0.35 + sectorScore * 0.35 + sizeScore * 0.3);
    const overallScore = Math.min(100, baseScore + Math.round(locationBonus * 0.1));

    return {
      investorId: inv.id,
      investorName: inv.name,
      investorFirm: inv.firm,
      investorEmail: inv.email,
      investorWebsite: inv.website,
      overallScore,
      stageScore,
      sectorScore,
      sizeScore,
      investorStages: inv.stage_focus,
      investorSectors: inv.sector_focus,
    };
  });

  // 4. Sort by score and take top 25
  scoredInvestors.sort((a, b) => b.overallScore - a.overallScore);
  const topInvestors = scoredInvestors.slice(0, 25);

  // 5. Generate AI reasoning
  const reasoningMap = await generateMatchReasoning(founderProfile, topInvestors);

  // 6. Upsert match results into database
  const matchRecords = topInvestors.map((inv) => ({
    user_id: userId,
    investor_id: inv.investorId,
    overall_score: inv.overallScore,
    stage_score: inv.stageScore,
    sector_score: inv.sectorScore,
    size_score: inv.sizeScore,
    reasoning: reasoningMap.get(inv.investorId) || "Match analysis pending.",
    status: "new",
  }));

  // Upsert (update if already exists for this user+investor pair)
  for (const record of matchRecords) {
    const { data: upsertedMatch, error: upsertError } = await supabase
      .from("investor_matches")
      .upsert(record, { onConflict: "user_id,investor_id" })
      .select("id")
      .single();

    if (upsertError) {
      console.error("[InvestorMatching] Upsert error:", upsertError);
      continue;
    }

    if (upsertedMatch) {
      // Insert score breakdowns
      const scoreRecords = [
        { match_id: upsertedMatch.id, dimension: "stage", score: record.stage_score, explanation: `Stage alignment score` },
        { match_id: upsertedMatch.id, dimension: "sector", score: record.sector_score, explanation: `Sector fit score` },
        { match_id: upsertedMatch.id, dimension: "size", score: record.size_score, explanation: `Check size compatibility` },
      ];

      // Delete old scores first, then insert new ones
      await supabase
        .from("investor_match_scores")
        .delete()
        .eq("match_id", upsertedMatch.id);

      await supabase
        .from("investor_match_scores")
        .insert(scoreRecords);
    }
  }

  // 7. Return matches
  return topInvestors.map((inv) => ({
    id: "", // Will be populated from DB on GET
    userId,
    investorId: inv.investorId,
    investorName: inv.investorName,
    investorFirm: inv.investorFirm,
    investorEmail: inv.investorEmail,
    investorWebsite: inv.investorWebsite,
    overallScore: inv.overallScore,
    stageScore: inv.stageScore,
    sectorScore: inv.sectorScore,
    sizeScore: inv.sizeScore,
    reasoning: reasoningMap.get(inv.investorId) || "Match analysis pending.",
    status: "new",
    createdAt: new Date().toISOString(),
  }));
}
