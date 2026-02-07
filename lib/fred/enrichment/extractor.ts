/**
 * Conversation-Based Profile Enrichment Extractor
 * Phase 18-02: Auto-enrichment from FRED conversations
 *
 * Heuristic (non-AI) extractor that mines user messages for profile-relevant
 * data: industry signals, revenue hints, team size, funding status,
 * challenges, competitors, and startup metrics.
 *
 * Designed to be fast and synchronous -- no API calls, pure regex/keyword matching.
 */

// ============================================================================
// Types
// ============================================================================

export interface ProfileEnrichment {
  industry?: string;
  revenueHint?: string;
  teamSizeHint?: number;
  fundingHint?: string;
  challenges?: string[];
  competitorsMentioned?: string[];
  metricsShared?: Record<string, string>;
}

// ============================================================================
// Industry Detection
// ============================================================================

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  SaaS: ["saas", "software as a service", "subscription software", "cloud software"],
  FinTech: ["fintech", "financial technology", "payments", "banking app", "neobank", "lending platform"],
  HealthTech: ["healthtech", "health tech", "telemedicine", "telehealth", "digital health", "medtech", "medical device"],
  EdTech: ["edtech", "education technology", "e-learning", "elearning", "online learning", "lms"],
  "E-Commerce": ["ecommerce", "e-commerce", "online store", "shopify", "marketplace", "d2c", "direct to consumer"],
  "AI/ML": ["artificial intelligence", "machine learning", "ai startup", "deep learning", "nlp", "computer vision", "generative ai"],
  Cybersecurity: ["cybersecurity", "cyber security", "infosec", "security platform"],
  PropTech: ["proptech", "real estate tech", "property technology"],
  FoodTech: ["foodtech", "food tech", "food delivery", "ghost kitchen", "meal kit"],
  CleanTech: ["cleantech", "clean tech", "renewable energy", "solar", "sustainability", "green tech"],
  Biotech: ["biotech", "biotechnology", "pharmaceutical", "drug discovery"],
  InsurTech: ["insurtech", "insurance technology", "insurance platform"],
  AgTech: ["agtech", "agriculture technology", "farming tech", "precision agriculture"],
  Logistics: ["logistics", "supply chain", "freight", "last mile delivery", "warehouse"],
  "Developer Tools": ["developer tools", "devtools", "api platform", "developer platform", "sdk"],
  Gaming: ["gaming", "game studio", "mobile game", "game development"],
  "Social Media": ["social media", "social network", "social platform", "content platform"],
  "B2B": ["b2b", "business to business", "enterprise software", "enterprise saas"],
  "Consumer App": ["consumer app", "mobile app", "consumer social", "dating app"],
  "Hardware": ["hardware startup", "iot", "internet of things", "smart device", "wearable"],
};

function detectIndustry(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return industry;
      }
    }
  }
  return undefined;
}

// ============================================================================
// Revenue Detection
// ============================================================================

const REVENUE_PATTERNS = [
  // "$50k MRR", "$50K mrr", "$50,000 MRR"
  /\$[\d,]+\.?\d*\s*[kKmMbB]?\s*(?:mrr|arr|revenue|monthly revenue|annual revenue|recurring revenue)/i,
  // "MRR of $50k", "ARR of $1M"
  /(?:mrr|arr|revenue|monthly revenue|annual revenue|recurring revenue)\s*(?:of|is|at|around|about|~|:)\s*\$[\d,]+\.?\d*\s*[kKmMbB]?/i,
  // "making $50k/month", "generating $1M/year"
  /(?:making|generating|earning|doing|pulling in|bringing in)\s*\$[\d,]+\.?\d*\s*[kKmMbB]?\s*(?:\/|\s*per\s*)?\s*(?:month|year|mo|yr|annually|monthly)/i,
  // "revenue is about $50k"
  /revenue\s+(?:is|was|hit|reached|crossed|passed)\s+(?:about\s+|around\s+|~\s*)?\$[\d,]+\.?\d*\s*[kKmMbB]?/i,
];

function detectRevenue(text: string): string | undefined {
  for (const pattern of REVENUE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return undefined;
}

// ============================================================================
// Team Size Detection
// ============================================================================

const TEAM_SIZE_PATTERNS = [
  // "we have 5 people", "team of 12"
  /(?:we\s+have|team\s+of|we're|we\s+are)\s+(\d+)\s*(?:people|employees|team\s*members|engineers|developers|folks|staff|full[\s-]?time)/i,
  // "5 person team", "12-person team"
  /(\d+)[\s-]?(?:person|people|member|man|woman)\s+team/i,
  // "our team is 5 people"
  /(?:our\s+)?team\s+(?:is|has|consists of|includes)\s+(\d+)\s*(?:people|members|employees|engineers|developers)?/i,
  // "hired 3 engineers", "have 5 developers"
  /(?:hired|have|got|employ|employing)\s+(\d+)\s*(?:engineers|developers|designers|people|employees|staff|contractors)/i,
  // "5 cofounders", "3 co-founders"
  /(\d+)\s*co[\s-]?founders?/i,
];

function detectTeamSize(text: string): number | undefined {
  for (const pattern of TEAM_SIZE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      // Sanity check: team sizes between 1 and 10,000
      if (num >= 1 && num <= 10000) {
        return num;
      }
    }
  }
  return undefined;
}

// ============================================================================
// Funding Detection
// ============================================================================

const FUNDING_KEYWORDS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /raised\s+(?:a\s+)?seed\s+(?:round)?/i, hint: "raised a seed round" },
  { pattern: /raised\s+(?:a\s+)?pre[\s-]?seed/i, hint: "raised a pre-seed round" },
  { pattern: /raised\s+(?:a\s+)?series\s+[a-d]/i, hint: "raised a Series round" },
  { pattern: /raised\s+\$[\d,]+\.?\d*\s*[kKmMbB]?/i, hint: "mentioned raising capital" },
  { pattern: /(?:angel\s+)?(?:investors?|investment)\s+(?:of|for|worth)\s+\$/i, hint: "has angel investment" },
  { pattern: /bootstrapped/i, hint: "bootstrapped" },
  { pattern: /self[\s-]?funded/i, hint: "self-funded" },
  { pattern: /vc[\s-]?backed|venture[\s-]?capital/i, hint: "VC-backed" },
  { pattern: /angel\s+(?:investor|round|funding)/i, hint: "has angel funding" },
  { pattern: /(?:seed|pre-seed|series)\s+(?:round|funding|raise)/i, hint: "in fundraising process" },
  { pattern: /crowdfund(?:ed|ing)?/i, hint: "crowdfunded" },
  { pattern: /accelerator|incubator|y[\s-]?combinator|techstars/i, hint: "in accelerator/incubator" },
];

function detectFunding(text: string): string | undefined {
  for (const { pattern, hint } of FUNDING_KEYWORDS) {
    if (pattern.test(text)) {
      return hint;
    }
  }
  return undefined;
}

// ============================================================================
// Challenges Detection
// ============================================================================

const CHALLENGE_PATTERNS = [
  /(?:struggling\s+with|struggle\s+with|struggling\s+to)\s+(.{10,120}?)(?:\.|$)/gi,
  /(?:our\s+)?(?:biggest|main|primary|key)\s+challenge\s+(?:is|has been)\s+(.{10,120}?)(?:\.|$)/gi,
  /(?:problem|issue)\s+(?:is|we're facing|we face)\s+(.{10,120}?)(?:\.|$)/gi,
  /stuck\s+on\s+(.{10,120}?)(?:\.|$)/gi,
  /(?:can't|cannot|having trouble|hard time|difficulty)\s+(?:figure out|figuring out|with)\s+(.{10,120}?)(?:\.|$)/gi,
  /(?:pain\s+point|bottleneck)\s+(?:is|for us is)\s+(.{10,120}?)(?:\.|$)/gi,
];

function detectChallenges(text: string): string[] {
  const challenges: string[] = [];
  for (const pattern of CHALLENGE_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const challenge = match[1].trim();
        if (challenge.length >= 10 && !challenges.includes(challenge)) {
          challenges.push(challenge);
        }
      }
    }
  }
  return challenges;
}

// ============================================================================
// Competitors Detection
// ============================================================================

const COMPETITOR_PATTERNS = [
  /(?:competitor|competing\s+with|compete\s+with|compete\s+against|rival)\s+(?:is|are|like|such as|including)\s+(.{3,80}?)(?:\.|,\s*and|$)/gi,
  /(?:vs|versus|compared\s+to|alternative\s+to|similar\s+to)\s+(.{3,60}?)(?:\.|,|$)/gi,
  /(?:companies?\s+like|players?\s+like|similar\s+to)\s+(.{3,80}?)(?:\.|$)/gi,
];

function detectCompetitors(text: string): string[] {
  const competitors: string[] = [];
  for (const pattern of COMPETITOR_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        // Split by "and", "," to get individual competitor names
        const names = match[1].split(/,\s*|\s+and\s+/).map((n) => n.trim()).filter((n) => n.length >= 2 && n.length <= 60);
        for (const name of names) {
          if (!competitors.includes(name)) {
            competitors.push(name);
          }
        }
      }
    }
  }
  return competitors;
}

// ============================================================================
// Metrics Detection
// ============================================================================

const METRIC_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: "MRR", pattern: /(?:mrr|monthly\s+recurring\s+revenue)\s*(?:is|of|at|:|=|around|about|~)?\s*\$?([\d,]+\.?\d*\s*[kKmMbB]?)/i },
  { key: "ARR", pattern: /(?:arr|annual\s+recurring\s+revenue)\s*(?:is|of|at|:|=|around|about|~)?\s*\$?([\d,]+\.?\d*\s*[kKmMbB]?)/i },
  { key: "CAC", pattern: /(?:cac|customer\s+acquisition\s+cost)\s*(?:is|of|at|:|=|around|about|~)?\s*\$?([\d,]+\.?\d*\s*[kKmMbB]?)/i },
  { key: "LTV", pattern: /(?:ltv|lifetime\s+value|clv|customer\s+lifetime\s+value)\s*(?:is|of|at|:|=|around|about|~)?\s*\$?([\d,]+\.?\d*\s*[kKmMbB]?)/i },
  { key: "Churn", pattern: /(?:churn(?:\s+rate)?)\s*(?:is|of|at|:|=|around|about|~)?\s*([\d.]+\s*%)/i },
  { key: "NPS", pattern: /(?:nps|net\s+promoter\s+score)\s*(?:is|of|at|:|=|around|about|~)?\s*([\d.]+)/i },
  { key: "DAU", pattern: /(?:dau|daily\s+active\s+users?)\s*(?:is|of|at|:|=|around|about|~)?\s*([\d,]+\.?\d*\s*[kKmMbB]?)/i },
  { key: "MAU", pattern: /(?:mau|monthly\s+active\s+users?)\s*(?:is|of|at|:|=|around|about|~)?\s*([\d,]+\.?\d*\s*[kKmMbB]?)/i },
  { key: "Burn Rate", pattern: /(?:burn\s+rate)\s*(?:is|of|at|:|=|around|about|~)?\s*\$?([\d,]+\.?\d*\s*[kKmMbB]?\s*(?:\/\s*month|per\s+month|monthly)?)/i },
  { key: "Runway", pattern: /(?:runway)\s*(?:is|of|at|:|=|around|about|~)?\s*([\d.]+\s*(?:months?|years?|mo|yr))/i },
  { key: "GMV", pattern: /(?:gmv|gross\s+merchandise\s+value)\s*(?:is|of|at|:|=|around|about|~)?\s*\$?([\d,]+\.?\d*\s*[kKmMbB]?)/i },
  { key: "Conversion Rate", pattern: /(?:conversion\s+rate)\s*(?:is|of|at|:|=|around|about|~)?\s*([\d.]+\s*%)/i },
  { key: "Revenue Growth", pattern: /(?:revenue\s+growth|growth\s+rate|growing)\s*(?:is|of|at|:|=|around|about|~)?\s*([\d.]+\s*%\s*(?:mom|yoy|monthly|annually)?)/i },
];

function detectMetrics(text: string): Record<string, string> {
  const metrics: Record<string, string> = {};
  for (const { key, pattern } of METRIC_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      metrics[key] = match[1].trim();
    }
  }
  return metrics;
}

// ============================================================================
// Main Extractor
// ============================================================================

/**
 * Extract profile-relevant enrichment data from conversation messages.
 *
 * Scans only user messages (role === "user") for pattern matches across
 * industry, revenue, team size, funding, challenges, competitors, and metrics.
 *
 * Returns null if no enrichment data was found (to avoid unnecessary DB writes).
 *
 * @param messages Array of conversation messages with role and content
 * @returns ProfileEnrichment object or null if nothing was detected
 */
export function extractProfileEnrichment(
  messages: Array<{ role: string; content: string }>
): ProfileEnrichment | null {
  // Concatenate only user messages
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  if (!userText.trim()) {
    return null;
  }

  const industry = detectIndustry(userText);
  const revenueHint = detectRevenue(userText);
  const teamSizeHint = detectTeamSize(userText);
  const fundingHint = detectFunding(userText);
  const challenges = detectChallenges(userText);
  const competitorsMentioned = detectCompetitors(userText);
  const metricsShared = detectMetrics(userText);

  // Build result only with detected fields
  const enrichment: ProfileEnrichment = {};
  let hasData = false;

  if (industry) {
    enrichment.industry = industry;
    hasData = true;
  }
  if (revenueHint) {
    enrichment.revenueHint = revenueHint;
    hasData = true;
  }
  if (teamSizeHint !== undefined) {
    enrichment.teamSizeHint = teamSizeHint;
    hasData = true;
  }
  if (fundingHint) {
    enrichment.fundingHint = fundingHint;
    hasData = true;
  }
  if (challenges.length > 0) {
    enrichment.challenges = challenges;
    hasData = true;
  }
  if (competitorsMentioned.length > 0) {
    enrichment.competitorsMentioned = competitorsMentioned;
    hasData = true;
  }
  if (Object.keys(metricsShared).length > 0) {
    enrichment.metricsShared = metricsShared;
    hasData = true;
  }

  return hasData ? enrichment : null;
}
