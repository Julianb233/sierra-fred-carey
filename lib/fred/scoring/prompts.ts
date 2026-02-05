/**
 * Scoring Engine Prompts
 *
 * Prompts used for AI-powered 7-factor decision scoring.
 */

import type { DecisionType, DecisionContext } from "./types";

/**
 * Build the main scoring prompt for AI analysis
 */
export function buildScoringPrompt(
  decision: string,
  context: DecisionContext,
  decisionType: DecisionType
): string {
  const contextSection = buildContextSection(context);
  const weightsSection = buildWeightsSection(decisionType);

  return `You are FRED, an AI advisor that scores startup decisions using a rigorous 7-factor framework developed by Fred Cary, a veteran entrepreneur and investor.

## Decision to Score

"${decision}"

## Decision Type
${decisionType.name}: ${decisionType.description}

${contextSection}

${weightsSection}

## Scoring Framework

Score each factor from 0 to 1 with the following interpretation:
- 0.0-0.2: Very negative impact / major concern
- 0.2-0.4: Negative impact / notable concern
- 0.4-0.6: Neutral / mixed impact
- 0.6-0.8: Positive impact / favorable
- 0.8-1.0: Very positive impact / excellent

### Important Notes on Specific Factors

**Time Factor (Inverted)**: Higher score = LESS time required
- 0.9 = Minimal time investment needed
- 0.5 = Moderate time commitment
- 0.1 = Massive time sink

**Risk Factor (Inverted)**: Higher score = LOWER risk
- 0.9 = Very low risk, highly reversible
- 0.5 = Moderate risk
- 0.1 = Very high risk, potentially fatal to company

### Calibration Guidelines

Be well-calibrated in your scoring:
- Express genuine uncertainty when appropriate
- A 0.5 score with 0.8 confidence is better than a 0.75 score with 0.3 confidence
- Consider what evidence would change your score
- Avoid anchoring on the first factor you score
- Consider second and third-order effects

### Required Output for Each Factor

For each of the 7 factors, provide:
1. **value**: Score from 0 to 1 (be precise, use decimals)
2. **confidence**: Your confidence in this score (0-1)
3. **reasoning**: 1-2 sentences explaining the score
4. **evidence**: Array of specific evidence points from the context

## The 7 Factors

### 1. Strategic Alignment
Does this decision align with the startup's long-term vision and stated goals? Consider:
- Fit with company mission
- Alignment with current priorities
- Consistency with previous strategic decisions

### 2. Leverage
Does this create multiplied impact? Will it make future efforts easier or more effective? Consider:
- Compounding benefits over time
- Platform or foundation effects
- Network effects or scale economies

### 3. Speed
How quickly can this be executed and show results? Consider:
- Time to implementation
- Time to first meaningful signal
- Dependencies and blockers

### 4. Revenue
What is the direct or indirect revenue impact? Consider:
- Short-term revenue implications
- Long-term revenue potential
- Impact on unit economics

### 5. Time (Inverted: Higher = Less Time Required)
What time investment is required from founders/team? Consider:
- Founder hours needed
- Team bandwidth required
- Opportunity cost of attention

### 6. Risk (Inverted: Higher = Lower Risk)
What is the downside exposure? Consider:
- Financial risk
- Reputational risk
- Operational/execution risk
- Reversibility of the decision

### 7. Relationships
How does this affect key relationships? Consider:
- Investor relations
- Customer relationships
- Team dynamics
- Partner relationships

Now analyze the decision and provide scores for all 7 factors.`;
}

/**
 * Build the context section of the prompt
 */
function buildContextSection(context: DecisionContext): string {
  const parts: string[] = ["## Context"];

  if (context.startupName) {
    parts.push(`- **Company**: ${context.startupName}`);
  }

  if (context.stage) {
    parts.push(`- **Stage**: ${context.stage}`);
  }

  if (context.industry) {
    parts.push(`- **Industry**: ${context.industry}`);
  }

  if (context.goals && context.goals.length > 0) {
    parts.push(`- **Current Goals**: ${context.goals.join(", ")}`);
  }

  if (context.recentDecisions && context.recentDecisions.length > 0) {
    parts.push("- **Recent Decisions**:");
    context.recentDecisions.slice(0, 3).forEach((d) => {
      parts.push(`  - ${d.summary}${d.outcome ? ` (Outcome: ${d.outcome})` : ""}`);
    });
  }

  if (context.additionalContext) {
    const additionalStr = Object.entries(context.additionalContext)
      .map(([key, value]) => `  - ${key}: ${JSON.stringify(value)}`)
      .join("\n");
    if (additionalStr) {
      parts.push(`- **Additional Context**:\n${additionalStr}`);
    }
  }

  return parts.length > 1 ? parts.join("\n") : "";
}

/**
 * Build the weights section showing factor importance
 */
function buildWeightsSection(decisionType: DecisionType): string {
  const weightLines = Object.entries(decisionType.weights)
    .sort((a, b) => b[1] - a[1]) // Sort by weight descending
    .map(([factor, weight]) => {
      const pct = Math.round(weight * 100);
      const importance = weight >= 0.2 ? "HIGH" : weight >= 0.15 ? "MEDIUM" : "LOW";
      return `- ${formatFactorName(factor)}: ${pct}% weight (${importance} importance)`;
    });

  return `## Factor Weights for ${decisionType.name}

These weights reflect the relative importance of each factor for this type of decision:

${weightLines.join("\n")}`;
}

/**
 * Format factor name for display
 */
function formatFactorName(factor: string): string {
  const nameMap: Record<string, string> = {
    strategicAlignment: "Strategic Alignment",
    leverage: "Leverage",
    speed: "Speed",
    revenue: "Revenue",
    time: "Time",
    risk: "Risk",
    relationships: "Relationships",
  };
  return nameMap[factor] || factor;
}

/**
 * Build a prompt for detecting decision type from user input
 */
export function buildDecisionTypeDetectionPrompt(
  decision: string,
  availableTypes: string[]
): string {
  return `Analyze the following decision and determine which category it best fits into.

Decision: "${decision}"

Available categories:
${availableTypes.map((t) => `- ${t}`).join("\n")}

Respond with just the category name that best matches, or "general" if none fit well.`;
}

/**
 * Build a prompt for generating a scoring summary
 */
export function buildScoringSummaryPrompt(
  decision: string,
  factors: Record<string, { value: number; reasoning: string }>,
  compositeScore: number,
  recommendation: string
): string {
  const factorSummaries = Object.entries(factors)
    .map(([name, score]) => `- ${formatFactorName(name)}: ${Math.round(score.value * 100)}% - ${score.reasoning}`)
    .join("\n");

  return `Generate a concise 2-3 sentence summary of this decision analysis.

Decision: "${decision}"

Factor Scores:
${factorSummaries}

Composite Score: ${Math.round(compositeScore * 100)}%
Recommendation: ${recommendation}

Write a summary that:
1. States the overall recommendation clearly
2. Highlights the 1-2 most important factors
3. Notes any significant concerns or opportunities
4. Is written in Fred Cary's direct, no-nonsense style`;
}
