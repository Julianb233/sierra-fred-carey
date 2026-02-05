/**
 * Mental Models Actor
 *
 * Applies relevant mental models to analyze the user's situation.
 * Each mental model provides a different lens for understanding the problem.
 */

import type {
  ValidatedInput,
  MemoryContext,
  MentalModelResult,
  MentalModel,
} from "../types";

/**
 * Apply mental models to analyze the validated input
 */
export async function applyMentalModelsActor(
  validatedInput: ValidatedInput,
  memoryContext: MemoryContext | null
): Promise<MentalModelResult[]> {
  console.log("[FRED] Applying mental models to:", validatedInput.intent);

  // Select relevant models based on input
  const relevantModels = selectRelevantModels(validatedInput);

  // Apply each model in parallel
  const results = await Promise.all(
    relevantModels.map((model) =>
      applyModel(model, validatedInput, memoryContext)
    )
  );

  // Sort by relevance
  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Select which mental models are most relevant for this input
 */
function selectRelevantModels(input: ValidatedInput): MentalModel[] {
  const models: MentalModel[] = [];

  // Always apply first principles for decision requests
  if (input.intent === "decision_request") {
    models.push("first_principles");
    models.push("second_order_effects");
    models.push("opportunity_cost");
    models.push("pre_mortem");
  }

  // For questions, apply different models
  if (input.intent === "question") {
    models.push("first_principles");
    models.push("five_whys");
  }

  // High urgency? Add time horizon analysis
  if (input.urgency === "high" || input.urgency === "critical") {
    if (!models.includes("time_horizon")) {
      models.push("time_horizon");
    }
  }

  // Risk keywords? Add inversion
  const riskKeywords = ["risk", "danger", "fail", "problem", "concern"];
  if (input.keywords.some((k) => riskKeywords.includes(k))) {
    if (!models.includes("inversion")) {
      models.push("inversion");
    }
  }

  // Growth/product keywords? Add JTBD
  const productKeywords = ["product", "customer", "user", "feature", "market"];
  if (input.keywords.some((k) => productKeywords.includes(k))) {
    if (!models.includes("jobs_to_be_done")) {
      models.push("jobs_to_be_done");
    }
  }

  // Limit to top 4 most relevant models
  return models.slice(0, 4);
}

/**
 * Apply a single mental model
 */
async function applyModel(
  model: MentalModel,
  input: ValidatedInput,
  memoryContext: MemoryContext | null
): Promise<MentalModelResult> {
  // Get the model implementation
  const modelImpl = MENTAL_MODEL_IMPLEMENTATIONS[model];

  if (!modelImpl) {
    return {
      model,
      analysis: {},
      relevance: 0,
      insights: ["Model not implemented"],
      confidence: 0,
    };
  }

  try {
    const result = await modelImpl(input, memoryContext);
    return {
      model,
      ...result,
    };
  } catch (error) {
    console.error(`[FRED] Error applying ${model}:`, error);
    return {
      model,
      analysis: { error: error instanceof Error ? error.message : "Unknown error" },
      relevance: 0,
      insights: [],
      confidence: 0,
    };
  }
}

// ============================================================================
// Mental Model Implementations
// ============================================================================

type ModelImplementation = (
  input: ValidatedInput,
  memory: MemoryContext | null
) => Promise<Omit<MentalModelResult, "model">>;

const MENTAL_MODEL_IMPLEMENTATIONS: Record<MentalModel, ModelImplementation> = {
  /**
   * First Principles: Break down to fundamental truths
   */
  first_principles: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Identify assumptions in the input
    const assumptions = identifyAssumptions(input.originalMessage);
    analysis.assumptions = assumptions;

    if (assumptions.length > 0) {
      insights.push(
        `Consider questioning these assumptions: ${assumptions.slice(0, 3).join(", ")}`
      );
    }

    // Identify core components
    const coreComponents = identifyCoreComponents(input);
    analysis.coreComponents = coreComponents;

    if (coreComponents.length > 0) {
      insights.push(
        `The fundamental elements are: ${coreComponents.join(", ")}`
      );
    }

    return {
      analysis,
      relevance: input.intent === "decision_request" ? 0.9 : 0.7,
      insights,
      confidence: 0.8,
    };
  },

  /**
   * Second Order Effects: Consider downstream impacts
   */
  second_order_effects: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Analyze potential ripple effects
    const effects = analyzeSecondOrderEffects(input);
    analysis.effects = effects;

    if (effects.immediate.length > 0) {
      insights.push(`Immediate impact: ${effects.immediate[0]}`);
    }
    if (effects.downstream.length > 0) {
      insights.push(`Downstream effect to consider: ${effects.downstream[0]}`);
    }

    return {
      analysis,
      relevance: input.intent === "decision_request" ? 0.85 : 0.5,
      insights,
      confidence: 0.75,
    };
  },

  /**
   * Opportunity Cost: What are we giving up?
   */
  opportunity_cost: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Identify resources involved
    const resources = identifyResources(input);
    analysis.resources = resources;

    if (resources.time) {
      insights.push("Consider what else could be done with this time");
    }
    if (resources.money) {
      insights.push("Evaluate alternative uses for this capital");
    }
    if (resources.attention) {
      insights.push("Factor in the focus cost - what won't get attention?");
    }

    return {
      analysis,
      relevance: input.intent === "decision_request" ? 0.8 : 0.4,
      insights,
      confidence: 0.7,
    };
  },

  /**
   * Pre-mortem: Imagine failure, work backward
   */
  pre_mortem: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Identify potential failure modes
    const failureModes = identifyFailureModes(input);
    analysis.failureModes = failureModes;

    failureModes.slice(0, 2).forEach((mode) => {
      insights.push(`Potential pitfall: ${mode}`);
    });

    if (failureModes.length > 0) {
      insights.push(
        "Mitigation: Address highest-risk failure modes before proceeding"
      );
    }

    return {
      analysis,
      relevance: input.intent === "decision_request" ? 0.85 : 0.6,
      insights,
      confidence: 0.75,
    };
  },

  /**
   * Inversion: What could go wrong?
   */
  inversion: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Think about the opposite
    const inversions = thinkInversely(input);
    analysis.inversions = inversions;

    inversions.slice(0, 2).forEach((inv) => {
      insights.push(`Avoid: ${inv}`);
    });

    return {
      analysis,
      relevance: input.sentiment === "negative" ? 0.9 : 0.7,
      insights,
      confidence: 0.7,
    };
  },

  /**
   * Five Whys: Root cause analysis
   */
  five_whys: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Ask why iteratively
    const whyChain = buildWhyChain(input);
    analysis.whyChain = whyChain;

    if (whyChain.length > 0) {
      insights.push(`Root question to explore: ${whyChain[whyChain.length - 1]}`);
    }

    return {
      analysis,
      relevance: input.intent === "question" ? 0.85 : 0.6,
      insights,
      confidence: 0.7,
    };
  },

  /**
   * Jobs to be Done: What job is the user hiring this for?
   */
  jobs_to_be_done: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Identify the job
    const job = identifyJob(input);
    analysis.job = job;

    if (job) {
      insights.push(`Core job: ${job.functional}`);
      if (job.emotional) {
        insights.push(`Emotional job: ${job.emotional}`);
      }
    }

    return {
      analysis,
      relevance: 0.7,
      insights,
      confidence: 0.65,
    };
  },

  /**
   * Time Horizon: Short vs long term trade-offs
   */
  time_horizon: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Analyze time perspectives
    const timeAnalysis = analyzeTimeHorizons(input);
    analysis.horizons = timeAnalysis;

    if (timeAnalysis.shortTerm) {
      insights.push(`Short-term: ${timeAnalysis.shortTerm}`);
    }
    if (timeAnalysis.longTerm) {
      insights.push(`Long-term: ${timeAnalysis.longTerm}`);
    }
    if (timeAnalysis.conflict) {
      insights.push(`Trade-off alert: ${timeAnalysis.conflict}`);
    }

    return {
      analysis,
      relevance: input.urgency !== "low" ? 0.85 : 0.6,
      insights,
      confidence: 0.7,
    };
  },

  /**
   * SWOT: Strengths, Weaknesses, Opportunities, Threats
   */
  swot: async (input, memory) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    // Build SWOT from input and memory
    const swot = buildSWOT(input, memory);
    analysis.swot = swot;

    if (swot.strengths.length > 0) {
      insights.push(`Leverage strength: ${swot.strengths[0]}`);
    }
    if (swot.threats.length > 0) {
      insights.push(`Watch out for: ${swot.threats[0]}`);
    }

    return {
      analysis,
      relevance: 0.7,
      insights,
      confidence: 0.65,
    };
  },

  /**
   * Regret Minimization: What decision minimizes future regret?
   */
  regret_minimization: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    insights.push(
      "Ask: In 10 years, which choice would you regret not making?"
    );
    insights.push(
      "Consider: Regret of inaction often exceeds regret of action"
    );

    return {
      analysis,
      relevance: input.intent === "decision_request" ? 0.75 : 0.4,
      insights,
      confidence: 0.6,
    };
  },

  /**
   * Contrarian: What if the opposite is true?
   */
  contrarian: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    insights.push("Challenge: What would a contrarian perspective reveal?");
    insights.push(
      "Consider: What if the conventional wisdom is wrong here?"
    );

    return {
      analysis,
      relevance: 0.6,
      insights,
      confidence: 0.5,
    };
  },

  /**
   * Probabilistic: Expected value calculation
   */
  probabilistic: async (input) => {
    const insights: string[] = [];
    const analysis: Record<string, unknown> = {};

    insights.push(
      "Consider: What's the expected value given probability of outcomes?"
    );
    insights.push(
      "Avoid: Overweighting low-probability extreme scenarios"
    );

    return {
      analysis,
      relevance: input.intent === "decision_request" ? 0.7 : 0.4,
      insights,
      confidence: 0.6,
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function identifyAssumptions(message: string): string[] {
  const assumptions: string[] = [];
  const assumptionIndicators = [
    /i('m|\s+am)\s+assuming/gi,
    /probably/gi,
    /likely/gi,
    /should\s+be/gi,
    /will\s+definitely/gi,
    /always/gi,
    /never/gi,
  ];

  assumptionIndicators.forEach((pattern) => {
    const match = message.match(pattern);
    if (match) {
      // Extract surrounding context
      const index = message.toLowerCase().indexOf(match[0].toLowerCase());
      const context = message.substring(
        Math.max(0, index - 20),
        Math.min(message.length, index + match[0].length + 30)
      );
      assumptions.push(context.trim());
    }
  });

  return assumptions;
}

function identifyCoreComponents(input: ValidatedInput): string[] {
  // Extract core components from entities and keywords
  const components: string[] = [];

  input.entities.forEach((entity) => {
    if (entity.confidence > 0.7) {
      components.push(`${entity.type}: ${entity.value}`);
    }
  });

  // Add high-relevance keywords
  input.keywords.slice(0, 3).forEach((kw) => {
    components.push(kw);
  });

  return components;
}

function analyzeSecondOrderEffects(input: ValidatedInput): {
  immediate: string[];
  downstream: string[];
} {
  const immediate: string[] = [];
  const downstream: string[] = [];

  if (input.intent === "decision_request") {
    immediate.push("Direct impact on current priorities");
    downstream.push("May shift team focus and resource allocation");
    downstream.push("Could affect stakeholder expectations");
  }

  return { immediate, downstream };
}

function identifyResources(input: ValidatedInput): {
  time?: boolean;
  money?: boolean;
  attention?: boolean;
} {
  const resources: { time?: boolean; money?: boolean; attention?: boolean } = {};

  const hasMoneyEntity = input.entities.some((e) => e.type === "money");
  const hasTimeKeywords = input.keywords.some((k) =>
    ["time", "hours", "days", "weeks", "months"].includes(k)
  );

  if (hasMoneyEntity) resources.money = true;
  if (hasTimeKeywords) resources.time = true;
  if (input.intent === "decision_request") resources.attention = true;

  return resources;
}

function identifyFailureModes(input: ValidatedInput): string[] {
  const modes: string[] = [];

  if (input.urgency === "high" || input.urgency === "critical") {
    modes.push("Time pressure leading to incomplete analysis");
  }

  if (input.confidence < 0.7) {
    modes.push("Misunderstanding the actual problem");
  }

  modes.push("Unforeseen stakeholder resistance");
  modes.push("Resource constraints not fully accounted for");

  return modes;
}

function thinkInversely(input: ValidatedInput): string[] {
  const inversions: string[] = [];

  inversions.push("Making this decision hastily without sufficient data");
  inversions.push("Ignoring dissenting opinions or red flags");
  inversions.push("Overcommitting resources early");

  return inversions;
}

function buildWhyChain(input: ValidatedInput): string[] {
  const chain: string[] = [];

  chain.push("Why is this important right now?");
  chain.push("Why hasn't this been addressed before?");
  chain.push("Why is this the right approach?");

  return chain;
}

function identifyJob(input: ValidatedInput): {
  functional: string;
  emotional?: string;
} | null {
  if (input.intent === "decision_request") {
    return {
      functional: "Make a well-informed decision",
      emotional: "Feel confident about the path forward",
    };
  }

  if (input.intent === "question") {
    return {
      functional: "Understand the situation better",
      emotional: "Reduce uncertainty",
    };
  }

  return null;
}

function analyzeTimeHorizons(input: ValidatedInput): {
  shortTerm?: string;
  longTerm?: string;
  conflict?: string;
} {
  const result: { shortTerm?: string; longTerm?: string; conflict?: string } = {};

  if (input.urgency === "critical" || input.urgency === "high") {
    result.shortTerm = "Immediate action may be required";
    result.longTerm = "Consider if short-term gains sacrifice long-term potential";
    result.conflict =
      "Urgency may conflict with thorough long-term thinking";
  }

  return result;
}

function buildSWOT(
  input: ValidatedInput,
  memory: MemoryContext | null
): {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
} {
  return {
    strengths: memory?.relevantFacts.length ? ["Existing context available"] : [],
    weaknesses: input.clarificationNeeded.length > 0 ? ["Missing information"] : [],
    opportunities: ["Potential for strategic advantage"],
    threats: input.urgency !== "low" ? ["Time pressure"] : [],
  };
}
