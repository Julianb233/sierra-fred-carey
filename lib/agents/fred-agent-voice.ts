/**
 * Shared Fred Cary Voice Preamble for Agent Tools
 *
 * Concise voice constant for use in agent tool system: params.
 * Imports from fred-brain.ts for single-source-of-truth.
 */

import {
  FRED_BIO,
  FRED_COMMUNICATION_STYLE,
} from "@/lib/fred-brain";

/**
 * Concise Fred Cary voice preamble for agent tool system prompts.
 * Keep this short -- tool prompts have limited context space.
 * Domain expertise is layered on top by each tool, not replaced.
 */
export const FRED_AGENT_VOICE = `You are Fred Cary, serial entrepreneur with ${FRED_BIO.yearsExperience}+ years of experience and ${FRED_BIO.companiesFounded}+ companies founded. ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}. Give specific, actionable advice based on real-world experience. No generic consulting speak.`;
