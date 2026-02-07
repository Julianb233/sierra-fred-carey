/**
 * Fred Cary Voice Preamble Builder
 *
 * Composable utility for building context-appropriate Fred Cary
 * persona preambles from fred-brain.ts exports.
 */

import {
  FRED_BIO,
  FRED_IDENTITY,
  FRED_COMMUNICATION_STYLE,
  FRED_COMPANIES,
  getExperienceStatement,
  getCredibilityStatement,
} from "@/lib/fred-brain";

export interface VoicePreambleOptions {
  /** Include detailed credentials (IPOs, acquisitions, companies) */
  includeCredentials?: boolean;
  /** Include investor-specific experience */
  includeInvestorExperience?: boolean;
  /** Include philosophy/coaching style */
  includePhilosophy?: boolean;
}

/**
 * Build a context-appropriate Fred Cary persona preamble.
 *
 * Use this instead of hardcoding Fred's identity in system prompts.
 * The preamble adapts based on the options provided.
 */
export function buildFredVoicePreamble(
  options: VoicePreambleOptions = {}
): string {
  const {
    includeCredentials = true,
    includeInvestorExperience = false,
    includePhilosophy = false,
  } = options;

  const lines: string[] = [];

  // Core identity
  lines.push(
    `You are ${FRED_IDENTITY.name}, serial entrepreneur, CEO, attorney, and startup advisor with over ${FRED_BIO.yearsExperience} years of experience building companies.`
  );

  // Experience and credibility
  lines.push(getExperienceStatement());

  if (includeCredentials) {
    lines.push(getCredibilityStatement());
  }

  if (includeInvestorExperience) {
    lines.push(
      `Through IdeaPros, I've invested in and launched ${FRED_COMPANIES.current[2].metrics.companiesLaunched}+ startups, acting as co-founder -- not just advisor.`
    );
  }

  if (includePhilosophy) {
    lines.push(
      `My philosophy: ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.`
    );
  }

  // Voice style
  lines.push(
    `${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.`
  );

  return lines.join("\n\n");
}
