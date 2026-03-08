/**
 * Stage Topic Mapping — Oases Stage Gate Enforcement
 *
 * Maps conversation topics to Oases stages. Used by the intent classifier
 * to determine whether a user's message belongs to their current stage
 * or a future stage.
 */

import type { OasesStage } from "@/types/oases"

export interface StageTopicEntry {
  keywords: RegExp[]
  descriptions: string[]
}

export const STAGE_TOPIC_MAP: Record<OasesStage, StageTopicEntry> = {
  clarity: {
    keywords: [
      /\bmy\s*profile\b/i,
      /\bcomplete\s*(my|the)?\s*profile\b/i,
      /\bwho\s+am\s+i\b/i,
      /\bwhat\s+(am\s+i|should\s+i)\s+build(ing)?\b/i,
      /\bidea\s+exploration\b/i,
      /\bproblem\s+definition\b/i,
      /\bself[- ]assessment\b/i,
      /\breality\s*lens\b/i,
      /\bfirst\s+chat\b/i,
      /\bbusiness\s+fundamentals?\b/i,
      /\bwhat\s+is\s+my\s+(idea|venture|startup)\b/i,
      /\bintroduc(e|tion)\s+(my|about)\b/i,
      /\bgeneral\s+startup\s+questions?\b/i,
    ],
    descriptions: [
      "Profile completion",
      "Idea exploration",
      "Problem definition",
      "Self-assessment",
      "Reality Lens assessment",
      "First coaching session",
      "Business fundamentals",
      "General startup questions",
    ],
  },

  validation: {
    keywords: [
      /\bpositioning\b/i,
      /\btarget\s*(market|customer|audience)\b/i,
      /\bcompetit(ive|or)\s*(analysis|landscape|research)\b/i,
      /\bcustomer\s*(interview|discovery|research)\b/i,
      /\bvalue\s*proposition\b/i,
      /\bmarket\s*research\b/i,
      /\b(icp|ideal\s*customer\s*profile)\b/i,
      /\bdemand\s*signal/i,
      /\bassumption\s*(testing|validation)\b/i,
      /\bproduct[- ]market\s*(fit|exploration)\b/i,
      /\bvalidat(e|ing|ion)\s*(my|the|our)?\s*(idea|concept|hypothesis)\b/i,
      /\bmarket\s*opportunity\b/i,
      /\bmarket\s*size\b/i,
      /\btam|sam|som\b/i,
    ],
    descriptions: [
      "Market positioning",
      "Target market analysis",
      "Competitive analysis",
      "Customer interviews",
      "Value proposition",
      "Market research",
      "ICP definition",
      "Product-market fit exploration",
    ],
  },

  build: {
    keywords: [
      /\bpitch\s*deck\b/i,
      /\bstrategy\s*document\b/i,
      /\bbusiness\s*plan\b/i,
      /\binvestor\s*readiness\s*(assessment|score)?\b/i,
      /\bfinancial\s*model\b/i,
      /\bmvp\b/i,
      /\bproduct\s*development\b/i,
      /\bgo[- ]to[- ]market\s*strategy\b/i,
      /\bunit\s*economics\b/i,
      /\bbuild\s*(my|a|the)\s*(deck|pitch|strategy|plan)\b/i,
      /\bcreate\s*(a|my|the)\s*(pitch|strategy|business)\b/i,
      /\bwrite\s*(a|my|the)\s*(pitch|strategy|business)\b/i,
      /\bhelp\s*(me\s*)?(with\s*)?(my\s*)?(pitch\s*deck|strategy\s*doc)/i,
    ],
    descriptions: [
      "Pitch deck creation",
      "Strategy document",
      "Business plan",
      "Investor readiness assessment",
      "Financial modeling",
      "MVP development",
      "Go-to-market strategy",
      "Unit economics",
    ],
  },

  launch: {
    keywords: [
      /\bfundrais(e|ing)\b/i,
      /\binvestor\s*outreach\b/i,
      /\binvestor\s*target(ing|s)?\b/i,
      /\bpitch\s*practice\b/i,
      /\bterm\s*sheet\b/i,
      /\bvaluation\b/i,
      /\bcap\s*table\b/i,
      /\bdue\s*diligence\b/i,
      /\binvestor\s*meeting/i,
      /\bpitch\s*refine(ment|d)?\b/i,
      /\braise\s*(a\s*)?(round|funding|capital|money)\b/i,
      /\bseries\s*a\b/i,
      /\bseed\s*(round|funding)\b/i,
      /\bpre[- ]seed\s*(round|funding)\b/i,
      /\bangel\s*(investor|round|funding)\b/i,
      /\bvc\s+(meeting|pitch|funding)\b/i,
    ],
    descriptions: [
      "Fundraising strategy",
      "Investor outreach",
      "Investor targeting",
      "Pitch practice",
      "Term sheets",
      "Valuation",
      "Cap table",
      "Due diligence",
      "Investor meetings",
    ],
  },

  grow: {
    keywords: [
      /\bfund\s*matching\b/i,
      /\bboardy\b/i,
      /\bscal(e|ing)\s*(my|the|our)?\s*(venture|startup|business|company|team)\b/i,
      /\bhiring\s*(at\s*)?scale\b/i,
      /\bseries\s*b\b/i,
      /\bseries\s*c\b/i,
      /\bteam\s*building\s*(at\s*)?scale\b/i,
      /\binternational\s*expansion\b/i,
      /\bboard\s*management\b/i,
      /\bgrowth\s*metrics\b/i,
      /\bgrowth\s*stage\b/i,
      /\bipo\b/i,
    ],
    descriptions: [
      "Fund matching",
      "Boardy networking",
      "Scaling operations",
      "Hiring at scale",
      "Series B+ fundraising",
      "International expansion",
      "Board management",
      "Growth metrics",
    ],
  },
}

/**
 * Get the Oases stage a topic belongs to, or null if not found.
 */
export function getStageForTopic(topic: string): OasesStage | null {
  const lowerTopic = topic.toLowerCase()
  for (const [stage, entry] of Object.entries(STAGE_TOPIC_MAP) as [OasesStage, StageTopicEntry][]) {
    for (const keyword of entry.keywords) {
      if (keyword.test(lowerTopic)) {
        return stage
      }
    }
  }
  return null
}
